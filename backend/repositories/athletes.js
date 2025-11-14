const { getDb, createTransaction } = require('./utils');

function fetchAthletes() {
  const db = getDb();
  return db
    .prepare(`
      SELECT a.*, t.name AS team_name,
             (
               SELECT metric_date
               FROM metrics m
               WHERE m.athlete_id = a.id
               ORDER BY metric_date DESC, id DESC
               LIMIT 1
             ) AS last_metric,
             (
               SELECT value
               FROM metrics m
               WHERE m.athlete_id = a.id
               ORDER BY metric_date DESC, id DESC
               LIMIT 1
             ) AS last_metric_value,
             (
               SELECT unit
               FROM metrics m
               WHERE m.athlete_id = a.id
               ORDER BY metric_date DESC, id DESC
               LIMIT 1
             ) AS last_metric_unit
      FROM athletes a
      JOIN teams t ON t.id = a.team_id
      ORDER BY a.last_name
    `)
    .all();
}

function fetchAthlete(athleteId) {
  const db = getDb();
  const athlete = db
    .prepare(`
      SELECT a.*, t.name AS team_name
      FROM athletes a
      JOIN teams t ON t.id = a.team_id
      WHERE a.id = ?
    `)
    .get(athleteId);

  if (!athlete) {
    return null;
  }

  const metrics = db
    .prepare(`
      SELECT metric_date, metric_type, value, unit
      FROM metrics
      WHERE athlete_id = ?
      ORDER BY metric_date DESC
      LIMIT 8
    `)
    .all(athleteId);

  const attendanceHistory = db
    .prepare(`
      SELECT s.title, s.session_date, a.status
      FROM attendance a
      JOIN sessions s ON s.id = a.session_id
      WHERE a.athlete_id = ?
      ORDER BY s.session_date DESC
      LIMIT 5
    `)
    .all(athleteId);

  return {
    athlete,
    metrics,
    attendance_history: attendanceHistory,
  };
}

function createAthlete(payload) {
  const db = getDb();
  const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(payload.team_id);
  if (!team) {
    const error = new Error('TEAM_NOT_FOUND');
    error.code = 'TEAM_NOT_FOUND';
    throw error;
  }

  const stmt = db.prepare(`
    INSERT INTO athletes (
      first_name,
      last_name,
      birth_year,
      primary_stroke,
      best_event,
      personal_best,
      personal_best_unit,
      focus_note,
      team_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    payload.first_name,
    payload.last_name,
    payload.birth_year,
    payload.primary_stroke,
    payload.best_event,
    payload.personal_best ?? null,
    payload.personal_best_unit ?? null,
    payload.focus_note ?? null,
    payload.team_id
  );

  return fetchAthlete(result.lastInsertRowid);
}

function updateAthlete(athleteId, payload) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM athletes WHERE id = ?').get(athleteId);
  if (!existing) {
    return null;
  }

  if (payload.team_id !== undefined) {
    const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(payload.team_id);
    if (!team) {
      const error = new Error('TEAM_NOT_FOUND');
      error.code = 'TEAM_NOT_FOUND';
      throw error;
    }
  }

  const allowed = new Set([
    'first_name',
    'last_name',
    'birth_year',
    'primary_stroke',
    'best_event',
    'personal_best',
    'personal_best_unit',
    'focus_note',
    'team_id',
  ]);

  const assignments = [];
  const params = [];

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (allowed.has(key)) {
      assignments.push(`${key} = ?`);
      params.push(value);
    }
  });

  if (!assignments.length) {
    return fetchAthlete(athleteId);
  }

  params.push(athleteId);
  const sql = `UPDATE athletes SET ${assignments.join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...params);

  return fetchAthlete(athleteId);
}

function deleteAthlete(athleteId) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM athletes WHERE id = ?').get(athleteId);
  if (!existing) {
    return false;
  }

  const run = createTransaction(() => {
    db.prepare('DELETE FROM metrics WHERE athlete_id = ?').run(athleteId);
    db.prepare('DELETE FROM athletes WHERE id = ?').run(athleteId);
  });

  run();
  return true;
}

module.exports = {
  fetchAthletes,
  fetchAthlete,
  createAthlete,
  updateAthlete,
  deleteAthlete,
};
