const { getDatabase } = require('./db');

function fetchDashboardKpis({ rangeDays = 30 } = {}) {
  const db = getDatabase();
  const sanitizedRange = Number.isFinite(Number(rangeDays)) && Number(rangeDays) > 0 ? Math.min(Number(rangeDays), 365) : 30;
  const rangeModifier = `-${sanitizedRange} day`;
  const attendanceModifier = rangeModifier;
  const focusModifier = `-${Math.min(sanitizedRange * 2, 365)} day`;

  const sessions = db
    .prepare(`
      SELECT
        COUNT(*) AS total_sessions,
        SUM(CASE WHEN status = 'abgeschlossen' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'gestartet' THEN 1 ELSE 0 END) AS in_progress,
        SUM(load_actual) AS total_load_actual,
        SUM(load_target) AS total_load_target
      FROM sessions
      WHERE session_date >= date('now', ?)
    `)
    .get(rangeModifier);

  const missingDocsRow = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM sessions
      WHERE session_date >= date('now', ?)
        AND status = 'abgeschlossen'
        AND (notes IS NULL OR TRIM(notes) = '')
    `)
    .get(rangeModifier);

  const attendedRow = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM attendance a
      JOIN sessions s ON s.id = a.session_id
      WHERE s.session_date >= date('now', ?) AND a.status = 'anwesend'
    `)
    .get(attendanceModifier);
  const attended = attendedRow ? attendedRow.count : 0;

  const totalAttendanceRow = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM attendance a
      JOIN sessions s ON s.id = a.session_id
      WHERE s.session_date >= date('now', ?)
    `)
    .get(attendanceModifier);
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
      WHERE session_date >= date('now', ?)
      GROUP BY focus_area
      ORDER BY count DESC
      LIMIT 6
    `)
    .all(focusModifier);

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
  const missingDocumentations = missingDocsRow ? missingDocsRow.count : 0;

  return {
    range_days: sanitizedRange,
    attendance_rate: Number.isFinite(attendanceRate) ? Number(attendanceRate.toFixed(2)) : 0,
    completed_sessions: completedSessions,
    in_progress_sessions: sessions.in_progress || 0,
    planned_sessions: plannedSessions < 0 ? 0 : plannedSessions,
    total_load_actual: sessions.total_load_actual || 0,
    total_load_target: sessions.total_load_target || 0,
    upcoming_sessions: upcomingSessions,
    focus_topics: focusTopics,
    activities: activities.slice(0, 6),
    missing_documentations: missingDocumentations,
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

function createAthlete(payload) {
  const db = getDatabase();
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
  const db = getDatabase();
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
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM athletes WHERE id = ?').get(athleteId);
  if (!existing) {
    return false;
  }

  const run = db.transaction(() => {
    db.prepare('DELETE FROM metrics WHERE athlete_id = ?').run(athleteId);
    db.prepare('DELETE FROM athletes WHERE id = ?').run(athleteId);
  });

  run();
  return true;
}

function fetchSessions({ teamId, status, includeAttendance } = {}) {
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

  const sessions = db.prepare(sql).all(...params);

  if (!includeAttendance || !sessions.length) {
    return sessions;
  }

  const sessionIds = sessions.map((session) => session.id);
  const teamIds = Array.from(new Set(sessions.map((session) => session.team_id)));

  const attendanceBySession = new Map();
  if (sessionIds.length) {
    const placeholders = sessionIds.map(() => '?').join(', ');
    const attendanceRows = db
      .prepare(
        `
        SELECT session_id, athlete_id, status, note
        FROM attendance
        WHERE session_id IN (${placeholders})
      `,
      )
      .all(...sessionIds);

    attendanceRows.forEach((row) => {
      if (!attendanceBySession.has(row.session_id)) {
        attendanceBySession.set(row.session_id, new Map());
      }
      attendanceBySession.get(row.session_id).set(row.athlete_id, {
        status: row.status ?? null,
        note: row.note ?? null,
      });
    });
  }

  const athletesByTeam = new Map();
  if (teamIds.length) {
    const placeholders = teamIds.map(() => '?').join(', ');
    const athleteRows = db
      .prepare(
        `
        SELECT id, first_name, last_name, team_id
        FROM athletes
        WHERE team_id IN (${placeholders})
        ORDER BY last_name, first_name
      `,
      )
      .all(...teamIds);

    athleteRows.forEach((row) => {
      if (!athletesByTeam.has(row.team_id)) {
        athletesByTeam.set(row.team_id, []);
      }
      athletesByTeam.get(row.team_id).push(row);
    });
  }

  return sessions.map((session) => {
    const teamAthletes = athletesByTeam.get(session.team_id) || [];
    const sessionAttendance = attendanceBySession.get(session.id) || new Map();

    return {
      ...session,
      attendance: teamAthletes.map((athlete) => {
        const record = sessionAttendance.get(athlete.id) || {};
        return {
          id: athlete.id,
          first_name: athlete.first_name,
          last_name: athlete.last_name,
          status: record.status ?? null,
          note: record.note ?? null,
        };
      }),
    };
  });
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
  const allowed = new Set([
    'status',
    'focus_area',
    'notes',
    'load_actual',
    'title',
    'session_date',
    'start_time',
    'duration_minutes',
    'load_target',
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
    return fetchSession(sessionId);
  }

  params.push(sessionId);
  const sql = `UPDATE sessions SET ${assignments.join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...params);

  return fetchSession(sessionId);
}

function createSession(payload) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO sessions (
      team_id,
      title,
      session_date,
      start_time,
      duration_minutes,
      status,
      focus_area,
      load_target,
      load_actual,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    payload.team_id,
    payload.title,
    payload.session_date,
    payload.start_time,
    payload.duration_minutes,
    payload.status,
    payload.focus_area,
    payload.load_target,
    payload.load_actual ?? null,
    payload.notes ?? null
  );
  return fetchSession(result.lastInsertRowid);
}

function duplicateSession(sessionId, overrides = {}) {
  const base = fetchSession(sessionId);
  if (!base) {
    return null;
  }
  const session = base.session;
  const payload = {
    team_id: overrides.team_id ?? session.team_id,
    title: overrides.title ?? `${session.title} (Kopie)`,
    session_date: overrides.session_date ?? session.session_date,
    start_time: overrides.start_time ?? session.start_time,
    duration_minutes: overrides.duration_minutes ?? session.duration_minutes,
    status: overrides.status ?? session.status,
    focus_area: overrides.focus_area ?? session.focus_area,
    load_target: overrides.load_target ?? session.load_target,
    load_actual: overrides.load_actual ?? session.load_actual,
    notes: overrides.notes ?? session.notes,
  };
  return createSession(payload);
}

function deleteSession(sessionId) {
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId);
  if (!existing) {
    return false;
  }

  const result = db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  return result.changes > 0;
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

function fetchMetric(metricId) {
  const db = getDatabase();
  return (
    db
      .prepare(`
        SELECT m.*, a.first_name, a.last_name, t.name AS team_name
        FROM metrics m
        JOIN athletes a ON a.id = m.athlete_id
        JOIN teams t ON t.id = a.team_id
        WHERE m.id = ?
      `)
      .get(metricId) || null
  );
}

function createMetric(payload) {
  const db = getDatabase();
  const athlete = db.prepare('SELECT id FROM athletes WHERE id = ?').get(payload.athlete_id);
  if (!athlete) {
    const error = new Error('ATHLETE_NOT_FOUND');
    error.code = 'ATHLETE_NOT_FOUND';
    throw error;
  }

  const stmt = db.prepare(`
    INSERT INTO metrics (athlete_id, metric_date, metric_type, value, unit)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    payload.athlete_id,
    payload.metric_date,
    payload.metric_type,
    payload.value,
    payload.unit
  );

  return fetchMetric(result.lastInsertRowid);
}

function updateMetric(metricId, payload) {
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM metrics WHERE id = ?').get(metricId);
  if (!existing) {
    return null;
  }

  if (payload.athlete_id !== undefined) {
    const athlete = db.prepare('SELECT id FROM athletes WHERE id = ?').get(payload.athlete_id);
    if (!athlete) {
      const error = new Error('ATHLETE_NOT_FOUND');
      error.code = 'ATHLETE_NOT_FOUND';
      throw error;
    }
  }

  const allowed = new Set(['athlete_id', 'metric_date', 'metric_type', 'value', 'unit']);
  const assignments = [];
  const params = [];

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (allowed.has(key)) {
      assignments.push(`${key} = ?`);
      params.push(value);
    }
  });

  if (!assignments.length) {
    return fetchMetric(metricId);
  }

  params.push(metricId);
  const sql = `UPDATE metrics SET ${assignments.join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...params);

  return fetchMetric(metricId);
}

function deleteMetric(metricId) {
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM metrics WHERE id = ?').get(metricId);
  if (!existing) {
    return false;
  }

  const result = db.prepare('DELETE FROM metrics WHERE id = ?').run(metricId);
  return result.changes > 0;
}

function createTeam(payload) {
  const db = getDatabase();
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
  const db = getDatabase();
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
  const db = getDatabase();
  return db
    .prepare(`
      SELECT
        (SELECT COUNT(*) FROM athletes WHERE team_id = ?) AS athlete_count,
        (SELECT COUNT(*) FROM sessions WHERE team_id = ?) AS session_count,
        (SELECT COUNT(*) FROM reports WHERE team_id = ?) AS report_count
    `)
    .get(teamId, teamId, teamId);
}

function deleteTeam(teamId, { force = false } = {}) {
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM teams WHERE id = ?').get(teamId);
  if (!existing) {
    return { found: false, deleted: false };
  }

  const dependencies = countTeamDependencies(teamId);
  const hasDependencies =
    (dependencies?.athlete_count || 0) > 0 ||
    (dependencies?.session_count || 0) > 0 ||
    (dependencies?.report_count || 0) > 0;

  if (hasDependencies && !force) {
    return { found: true, deleted: false, dependencies };
  }

  const run = db.transaction(() => {
    db.prepare('DELETE FROM metrics WHERE athlete_id IN (SELECT id FROM athletes WHERE team_id = ?)').run(teamId);
    db.prepare('DELETE FROM attendance WHERE session_id IN (SELECT id FROM sessions WHERE team_id = ?)').run(teamId);
    db.prepare('DELETE FROM sessions WHERE team_id = ?').run(teamId);
    db.prepare('DELETE FROM athletes WHERE team_id = ?').run(teamId);
    db.prepare('DELETE FROM reports WHERE team_id = ?').run(teamId);
    db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);
  });

  run();

  return { found: true, deleted: true, dependencies };
}

module.exports = {
  fetchDashboardKpis,
  fetchTeams,
  fetchTeam,
  fetchAthletes,
  fetchAthlete,
  createAthlete,
  updateAthlete,
  deleteAthlete,
  fetchSessions,
  fetchSession,
  updateSession,
  createSession,
  deleteSession,
  duplicateSession,
  upsertAttendance,
  fetchReports,
  fetchLatestNote,
  saveNote,
  fetchMetrics,
  fetchMetric,
  createMetric,
  updateMetric,
  deleteMetric,
  createTeam,
  updateTeam,
  deleteTeam,
};
