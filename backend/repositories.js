const { getDatabase } = require('./db');

function fetchDashboardKpis() {
  const db = getDatabase();
  const sessions = db
    .prepare(`
      SELECT
        COUNT(*) AS total_sessions,
        SUM(CASE WHEN status = 'abgeschlossen' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'gestartet' THEN 1 ELSE 0 END) AS in_progress,
        SUM(load_actual) AS total_load_actual,
        SUM(load_target) AS total_load_target
      FROM sessions
    `)
    .get();

  const attendedRow = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM attendance a
      JOIN sessions s ON s.id = a.session_id
      WHERE s.session_date >= date('now', '-30 day') AND a.status = 'anwesend'
    `)
    .get();
  const attended = attendedRow ? attendedRow.count : 0;

  const totalAttendanceRow = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM attendance a
      JOIN sessions s ON s.id = a.session_id
      WHERE s.session_date >= date('now', '-30 day')
    `)
    .get();
  const totalAttendance = totalAttendanceRow && totalAttendanceRow.count ? totalAttendanceRow.count : 1;

  const upcomingSessions = db
    .prepare(`
      SELECT session_date, title, focus_area
      FROM sessions
      WHERE session_date >= date('now')
      ORDER BY session_date ASC
      LIMIT 5
    `)
    .all();

  const focusTopics = db
    .prepare(`
      SELECT focus_area, COUNT(*) AS count
      FROM sessions
      WHERE session_date >= date('now', '-45 day')
      GROUP BY focus_area
      ORDER BY count DESC
      LIMIT 6
    `)
    .all();

  const sessionEvents = db
    .prepare(`
      SELECT title, session_date, status
      FROM sessions
      ORDER BY session_date DESC, id DESC
      LIMIT 6
    `)
    .all();

  const metricEvents = db
    .prepare(`
      SELECT a.first_name || ' ' || a.last_name AS athlete,
             m.metric_type,
             m.metric_date,
             m.value,
             m.unit
      FROM metrics m
      JOIN athletes a ON a.id = m.athlete_id
      ORDER BY m.metric_date DESC, m.id DESC
      LIMIT 4
    `)
    .all();

  const activities = [];
  sessionEvents.forEach((event) => {
    activities.push({
      type: 'training',
      title: event.title,
      status: event.status,
      date: event.session_date,
    });
  });
  metricEvents.forEach((metric) => {
    activities.push({
      type: 'metric',
      title: metric.metric_type,
      status: `${metric.athlete} ${metric.value} ${metric.unit}`.trim(),
      date: metric.metric_date,
    });
  });
  activities.sort((a, b) => (a.date < b.date ? 1 : -1));

  const completedSessions = sessions.completed || 0;
  const totalSessions = sessions.total_sessions || 0;
  const plannedSessions = totalSessions - completedSessions;
  const attendanceRate = attended / (totalAttendance || 1);

  return {
    attendance_rate: Number.isFinite(attendanceRate) ? Number(attendanceRate.toFixed(2)) : 0,
    completed_sessions: completedSessions,
    in_progress_sessions: sessions.in_progress || 0,
    planned_sessions: plannedSessions < 0 ? 0 : plannedSessions,
    total_load_actual: sessions.total_load_actual || 0,
    total_load_target: sessions.total_load_target || 0,
    upcoming_sessions: upcomingSessions,
    focus_topics: focusTopics,
    activities: activities.slice(0, 6),
  };
}

function fetchTeams() {
  const db = getDatabase();
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
  const db = getDatabase();
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

function fetchAthletes() {
  const db = getDatabase();
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
  const db = getDatabase();
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

function fetchSessions({ teamId, status } = {}) {
  const db = getDatabase();
  const filters = [];
  const params = [];

  if (teamId !== undefined) {
    filters.push('t.id = ?');
    params.push(teamId);
  }
  if (status !== undefined) {
    filters.push('s.status = ?');
    params.push(status);
  }

  const whereClause = filters.length ? `AND ${filters.join(' AND ')}` : '';
  const sql = `
    SELECT s.*, t.name AS team_name, t.short_name AS team_short_name
    FROM sessions s
    JOIN teams t ON t.id = s.team_id
    WHERE 1 = 1
    ${whereClause}
    ORDER BY s.session_date DESC, s.start_time DESC
  `;

  return db.prepare(sql).all(...params);
}

function fetchSession(sessionId) {
  const db = getDatabase();
  const session = db
    .prepare(`
      SELECT s.*, t.name AS team_name
      FROM sessions s
      JOIN teams t ON t.id = s.team_id
      WHERE s.id = ?
    `)
    .get(sessionId);

  if (!session) {
    return null;
  }

  const attendance = db
    .prepare(`
      SELECT a.id, a.first_name, a.last_name, att.status, att.note
      FROM athletes a
      LEFT JOIN attendance att ON att.athlete_id = a.id AND att.session_id = ?
      WHERE a.team_id = ?
      ORDER BY a.last_name
    `)
    .all(sessionId, session.team_id);

  return { session, attendance };
}

function updateSession(sessionId, payload) {
  const db = getDatabase();
  const allowed = new Set(['status', 'focus_area', 'notes', 'load_actual']);
  const assignments = [];
  const params = [];

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (allowed.has(key)) {
      assignments.push(`${key} = ?`);
      params.push(value);
    }
  });

  if (!assignments.length) {
    return fetchSession(sessionId);
  }

  params.push(sessionId);
  const sql = `UPDATE sessions SET ${assignments.join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...params);

  return fetchSession(sessionId);
}

function upsertAttendance(sessionId, rows) {
  const db = getDatabase();
  const insert = db.prepare(`
    INSERT INTO attendance (session_id, athlete_id, status, note)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(session_id, athlete_id) DO UPDATE SET
      status = excluded.status,
      note = excluded.note
  `);
  const run = db.transaction((entries) => {
    entries.forEach((row) => {
      insert.run(
        sessionId,
        row.athlete_id,
        row.status || 'anwesend',
        row.note || null,
      );
    });
  });
  run(rows || []);
}

function fetchReports() {
  const db = getDatabase();
  return db
    .prepare(`
      SELECT r.*, t.name AS team_name
      FROM reports r
      JOIN teams t ON t.id = r.team_id
      ORDER BY r.period_end DESC
    `)
    .all();
}

function fetchLatestNote() {
  const db = getDatabase();
  const note = db
    .prepare(`
      SELECT * FROM coach_notes ORDER BY updated_at DESC, id DESC LIMIT 1
    `)
    .get();
  return note || null;
}

function saveNote(body) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO coach_notes (body, updated_at)
    VALUES (?, datetime('now'))
  `);
  const result = stmt.run(body);
  return db.prepare('SELECT * FROM coach_notes WHERE id = ?').get(result.lastInsertRowid);
}

function fetchMetrics({ teamId, metricType } = {}) {
  const db = getDatabase();
  const filters = [];
  const params = [];
  if (teamId !== undefined) {
    filters.push('t.id = ?');
    params.push(teamId);
  }
  if (metricType !== undefined) {
    filters.push('m.metric_type = ?');
    params.push(metricType);
  }
  const whereClause = filters.length ? `AND ${filters.join(' AND ')}` : '';
  const sql = `
    SELECT m.*, a.first_name, a.last_name, t.name AS team_name
    FROM metrics m
    JOIN athletes a ON a.id = m.athlete_id
    JOIN teams t ON t.id = a.team_id
    WHERE 1 = 1
    ${whereClause}
    ORDER BY m.metric_date DESC, m.id DESC
  `;
  return db.prepare(sql).all(...params);
}

module.exports = {
  fetchDashboardKpis,
  fetchTeams,
  fetchTeam,
  fetchAthletes,
  fetchAthlete,
  fetchSessions,
  fetchSession,
  updateSession,
  upsertAttendance,
  fetchReports,
  fetchLatestNote,
  saveNote,
  fetchMetrics,
};
