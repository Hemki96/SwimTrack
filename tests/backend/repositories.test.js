const test = require('node:test');
const assert = require('node:assert/strict');
const { setupInMemoryDatabase } = require('./helpers/testDb');

function getFirstTeamId(dbModule) {
  const db = dbModule.getDatabase();
  const row = db.prepare('SELECT id FROM teams ORDER BY id LIMIT 1').get();
  return row.id;
}

function getNonExistingAthleteId(dbModule) {
  const db = dbModule.getDatabase();
  const row = db.prepare('SELECT MAX(id) AS max_id FROM athletes').get();
  return (row?.max_id || 0) + 999;
}

function getUnknownTeamId(dbModule) {
  const db = dbModule.getDatabase();
  const row = db.prepare('SELECT MAX(id) AS max_id FROM teams').get();
  return (row.max_id || 0) + 999;
}

test('fetchDashboardKpis aggregates current data for the requested range', () => {
  const ctx = setupInMemoryDatabase();
  try {
    const rangeDays = 60;
    const result = ctx.repositories.fetchDashboardKpis({ rangeDays });

    assert.equal(result.range_days, rangeDays);
    assert.ok(Array.isArray(result.upcoming_sessions));
    assert.ok(Array.isArray(result.focus_topics));
    assert.ok(Array.isArray(result.activities));

    const db = ctx.db.getDatabase();
    const rangeModifier = `-${Math.min(rangeDays, 365)} day`;
    const focusModifier = `-${Math.min(rangeDays * 2, 365)} day`;

    const sessionRow = db
      .prepare(
        `SELECT COUNT(*) AS total_sessions,
                SUM(CASE WHEN status = 'abgeschlossen' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN status = 'gestartet' THEN 1 ELSE 0 END) AS in_progress,
                SUM(load_actual) AS total_load_actual,
                SUM(load_target) AS total_load_target
           FROM sessions
          WHERE session_date >= date('now', ?)`
      )
      .get(rangeModifier);

    assert.equal(result.completed_sessions, sessionRow.completed || 0);
    assert.equal(result.in_progress_sessions, sessionRow.in_progress || 0);
    assert.equal(result.total_load_actual, sessionRow.total_load_actual || 0);
    assert.equal(result.total_load_target, sessionRow.total_load_target || 0);

    const plannedSessions = (sessionRow.total_sessions || 0) - (sessionRow.completed || 0);
    assert.equal(result.planned_sessions, plannedSessions < 0 ? 0 : plannedSessions);

    const missingDocs = db
      .prepare(
        `SELECT COUNT(*) AS count
           FROM sessions
          WHERE session_date >= date('now', ?)
            AND status = 'abgeschlossen'
            AND (notes IS NULL OR TRIM(notes) = '')`
      )
      .get(rangeModifier);
    assert.equal(result.missing_documentations, missingDocs.count || 0);

    const attendedRow = db
      .prepare(
        `SELECT COUNT(*) AS count
           FROM attendance a
           JOIN sessions s ON s.id = a.session_id
          WHERE s.session_date >= date('now', ?) AND a.status = 'anwesend'`
      )
      .get(rangeModifier);
    const totalAttendanceRow = db
      .prepare(
        `SELECT COUNT(*) AS count
           FROM attendance a
           JOIN sessions s ON s.id = a.session_id
          WHERE s.session_date >= date('now', ?)`
      )
      .get(rangeModifier);
    const expectedRate = (attendedRow?.count || 0) / (totalAttendanceRow?.count || 1);
    const normalizedRate = Number.isFinite(expectedRate) ? Number(expectedRate.toFixed(2)) : 0;
    assert.equal(result.attendance_rate, normalizedRate);

    const upcomingCount = db
      .prepare(`SELECT COUNT(*) AS count FROM sessions WHERE session_date >= date('now')`)
      .get().count;
    assert.equal(result.upcoming_sessions.length, Math.min(5, upcomingCount));

    const focusTopics = db
      .prepare(
        `SELECT focus_area, COUNT(*) AS count
           FROM sessions
          WHERE session_date >= date('now', ?)
       GROUP BY focus_area
       ORDER BY count DESC
          LIMIT 6`
      )
      .all(focusModifier);
    assert.equal(result.focus_topics.length, focusTopics.length);
  } finally {
    ctx.cleanup();
  }
});

test('fetchDashboardKpis clamps invalid ranges to defaults', () => {
  const ctx = setupInMemoryDatabase();
  try {
    const defaultRange = ctx.repositories.fetchDashboardKpis({ rangeDays: -5 }).range_days;
    assert.equal(defaultRange, 30);

    const capped = ctx.repositories.fetchDashboardKpis({ rangeDays: 9999 }).range_days;
    assert.equal(capped, 365);
  } finally {
    ctx.cleanup();
  }
});

test('createAthlete persists athletes tied to an existing team', () => {
  const ctx = setupInMemoryDatabase();
  try {
    const teamId = getFirstTeamId(ctx.db);

    const created = ctx.repositories.createAthlete({
      first_name: 'Lea',
      last_name: 'Schneider',
      birth_year: 2008,
      primary_stroke: 'Freistil',
      best_event: '200m Freistil',
      personal_best: '02:08.34',
      personal_best_unit: 'min',
      focus_note: 'Langdistanz',
      team_id: teamId,
    });

    assert.equal(created.athlete.first_name, 'Lea');
    assert.equal(created.athlete.team_name.length > 0, true);

    const fetched = ctx.repositories.fetchAthlete(created.athlete.id);
    assert.equal(fetched.athlete.last_name, 'Schneider');
  } finally {
    ctx.cleanup();
  }
});

test('createAthlete throws when team is missing', () => {
  const ctx = setupInMemoryDatabase();
  try {
    const invalidTeamId = getUnknownTeamId(ctx.db);

    assert.throws(
      () =>
        ctx.repositories.createAthlete({
          first_name: 'Test',
          last_name: 'Athlete',
          birth_year: 2009,
          primary_stroke: 'Rücken',
          best_event: '200m Rücken',
          team_id: invalidTeamId,
        }),
      (error) => error && error.code === 'TEAM_NOT_FOUND'
    );
  } finally {
    ctx.cleanup();
  }
});

test('deleteTeam respects dependencies and allows forced deletion', () => {
  const ctx = setupInMemoryDatabase();
  try {
    const teamId = getFirstTeamId(ctx.db);

    const blocked = ctx.repositories.deleteTeam(teamId);
    assert.equal(blocked.found, true);
    assert.equal(blocked.deleted, false);
    assert.ok(blocked.dependencies);
    assert.ok((blocked.dependencies.athlete_count || 0) > 0);

    const forced = ctx.repositories.deleteTeam(teamId, { force: true });
    assert.equal(forced.deleted, true);
    const db = ctx.db.getDatabase();
    const remaining = db.prepare('SELECT COUNT(*) AS count FROM teams WHERE id = ?').get(teamId);
    assert.equal(remaining.count, 0);
  } finally {
    ctx.cleanup();
  }
});

test('updateAthlete returns null for missing athletes', () => {
  const ctx = setupInMemoryDatabase();
  try {
    const missingId = getNonExistingAthleteId(ctx.db);

    const result = ctx.repositories.updateAthlete(missingId, { first_name: 'Updated' });
    assert.equal(result, null);
  } finally {
    ctx.cleanup();
  }
});
