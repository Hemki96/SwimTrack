const { getDb, createTransaction } = require('./utils');

function fetchTeams() {
  const db = getDb();
  return db
    .prepare(`
      SELECT t.*, COUNT(a.id) AS athlete_count,
             (
               SELECT session_date || ' • ' || title
               FROM sessions s
               WHERE s.team_id = t.id AND s.session_date >= date('now')
               ORDER BY s.session_date ASC
               LIMIT 1
             ) AS upcoming_session
      FROM teams t
      LEFT JOIN athletes a ON a.team_id = t.id
      GROUP BY t.id
      ORDER BY t.name
    `)
    .all();
}

function fetchTeam(teamId) {
  const db = getDb();
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  if (!team) {
    return null;
  }

  const sessions = db
    .prepare(`
      SELECT id, title, session_date, start_time, status, focus_area
      FROM sessions
      WHERE team_id = ?
      ORDER BY session_date DESC
      LIMIT 5
    `)
    .all(teamId);

  const statusRows = db
    .prepare(`
      SELECT status, COUNT(*) AS count
      FROM sessions
      WHERE team_id = ?
      GROUP BY status
    `)
    .all(teamId);
  const statusBreakdown = {};
  statusRows.forEach((row) => {
    statusBreakdown[row.status] = row.count;
  });

  return {
    team,
    recent_sessions: sessions,
    status_breakdown: statusBreakdown,
  };
}

function createTeam(payload) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO teams (name, short_name, level, coach, training_days, focus_theme)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    payload.name,
    payload.short_name,
    payload.level,
    payload.coach,
    payload.training_days,
    payload.focus_theme
  );
  return fetchTeam(result.lastInsertRowid);
}

function updateTeam(teamId, payload) {
  const db = getDb();
  const allowed = new Set(['name', 'short_name', 'level', 'coach', 'training_days', 'focus_theme']);
  const assignments = [];
  const params = [];

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (allowed.has(key)) {
      assignments.push(`${key} = ?`);
      params.push(value);
    }
  });

  if (!assignments.length) {
    return fetchTeam(teamId);
  }

  params.push(teamId);
  const sql = `UPDATE teams SET ${assignments.join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...params);
  return fetchTeam(teamId);
}

function countTeamDependencies(teamId) {
  const db = getDb();
  return db
    .prepare(`
      SELECT
        (SELECT COUNT(*) FROM athletes WHERE team_id = ?) AS athlete_count,
        (SELECT COUNT(*) FROM sessions WHERE team_id = ?) AS session_count,
        (SELECT COUNT(*) FROM reports WHERE team_id = ?) AS report_count
    `)
    .get(teamId, teamId, teamId);
}

function deleteTeamCascade(teamId) {
  const db = getDb();
  const run = createTransaction(() => {
    db.prepare('DELETE FROM metrics WHERE athlete_id IN (SELECT id FROM athletes WHERE team_id = ?)').run(teamId);
    db.prepare('DELETE FROM attendance WHERE session_id IN (SELECT id FROM sessions WHERE team_id = ?)').run(teamId);
    db.prepare('DELETE FROM sessions WHERE team_id = ?').run(teamId);
    db.prepare('DELETE FROM athletes WHERE team_id = ?').run(teamId);
    db.prepare('DELETE FROM reports WHERE team_id = ?').run(teamId);
    db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);
  });

  run();
}

module.exports = {
  fetchTeams,
  fetchTeam,
  createTeam,
  updateTeam,
  countTeamDependencies,
  deleteTeamCascade,
};
