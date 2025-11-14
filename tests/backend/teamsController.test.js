const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { setupInMemoryDatabase } = require('./helpers/testDb');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const controllerPath = path.join(ROOT_DIR, 'backend/controllers/teams.js');

function loadController() {
  delete require.cache[require.resolve(controllerPath)];
  return require(controllerPath);
}

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('listTeams returns all seeded teams', () => {
  const ctx = setupInMemoryDatabase();
  try {
    const controller = loadController();
    const res = createResponse();
    controller.listTeams({}, res, (error) => {
      throw error;
    });

    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 2);
    assert.ok(res.body.every((team) => team.id && team.name));
  } finally {
    ctx.cleanup();
  }
});

test('getTeam returns team details including sessions', () => {
  const ctx = setupInMemoryDatabase();
  try {
    const controller = loadController();
    const db = ctx.db.getDatabase();
    const sampleTeam = db.prepare('SELECT id FROM teams ORDER BY id LIMIT 1').get();

    const res = createResponse();
    controller.getTeam({ params: { teamId: String(sampleTeam.id) } }, res, (error) => {
      throw error;
    });

    assert.ok(res.body.team);
    assert.equal(res.body.team.id, sampleTeam.id);
    assert.ok(Array.isArray(res.body.recent_sessions));
    assert.ok(res.body.status_breakdown);
  } finally {
    ctx.cleanup();
  }
});

test('getTeam forwards 404 errors for unknown teams', () => {
  const ctx = setupInMemoryDatabase();
  try {
    const controller = loadController();
    const errors = [];
    controller.getTeam({ params: { teamId: '99999' } }, createResponse(), (error) => {
      errors.push(error);
    });

    assert.equal(errors.length, 1);
    assert.equal(errors[0].status, 404);
    assert.equal(errors[0].detail, 'Team nicht gefunden');
  } finally {
    ctx.cleanup();
  }
});

test('deleteTeam blocks removal with dependencies and responds with conflict', () => {
  const ctx = setupInMemoryDatabase();
  try {
    const controller = loadController();
    const db = ctx.db.getDatabase();
    const team = db.prepare('SELECT id FROM teams ORDER BY id LIMIT 1').get();

    const res = createResponse();
    controller.deleteTeam({ params: { teamId: String(team.id) }, query: {} }, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 409);
    assert.ok(res.body);
    assert.ok(res.body.dependencies);
    assert.ok((res.body.dependencies.athlete_count || 0) > 0);
  } finally {
    ctx.cleanup();
  }
});

test('deleteTeam supports forced deletion of a team with dependencies', () => {
  const ctx = setupInMemoryDatabase();
  try {
    const controller = loadController();
    const db = ctx.db.getDatabase();
    const team = db.prepare('SELECT id FROM teams ORDER BY id LIMIT 1').get();

    const res = createResponse();
    controller.deleteTeam(
      { params: { teamId: String(team.id) }, query: { force: '1' } },
      res,
      (error) => {
        throw error;
      }
    );

    assert.equal(res.statusCode, 204);
    const exists = db.prepare('SELECT COUNT(*) AS count FROM teams WHERE id = ?').get(team.id);
    assert.equal(exists.count, 0);
  } finally {
    ctx.cleanup();
  }
});

test('createTeam stores and returns the persisted team', () => {
  const ctx = setupInMemoryDatabase();
  try {
    const controller = loadController();
    const res = createResponse();

    controller.createTeam(
      {
        body: {
          name: 'Sprintkader',
          short_name: 'SPR',
          level: 'Leistung',
          coach: 'Lena Vogt',
          training_days: 'Mo, Do',
          focus_theme: 'Starts & explosiver Antritt',
        },
      },
      res,
      (error) => {
        throw error;
      }
    );

    assert.equal(res.statusCode, 201);
    assert.ok(res.body.team);
    assert.equal(res.body.team.name, 'Sprintkader');

    const db = ctx.db.getDatabase();
    const stored = db.prepare('SELECT COUNT(*) AS count FROM teams WHERE name = ?').get('Sprintkader');
    assert.equal(stored.count, 1);
  } finally {
    ctx.cleanup();
  }
});
