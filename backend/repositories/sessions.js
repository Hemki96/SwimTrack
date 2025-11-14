const { getDb, createFilter, buildWhereClause, createTransaction } = require('./utils');

function fetchSessions({ teamId, status, includeAttendance } = {}) {
  const db = getDb();
  const filters = [];

  if (teamId !== undefined) {
    filters.push(createFilter('t.id = ?', teamId));
  }
  if (status !== undefined) {
    filters.push(createFilter('s.status = ?', status));
  }

  const { clause, params } = buildWhereClause(filters);
  const sql = `
    SELECT s.*, t.name AS team_name, t.short_name AS team_short_name
    FROM sessions s
    JOIN teams t ON t.id = s.team_id
    WHERE 1 = 1
    ${clause}
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
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
  const existing = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId);
  if (!existing) {
    return false;
  }

  const result = db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  return result.changes > 0;
}

function upsertAttendance(sessionId, rows) {
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO attendance (session_id, athlete_id, status, note)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(session_id, athlete_id) DO UPDATE SET
      status = excluded.status,
      note = excluded.note
  `);
  const run = createTransaction((entries) => {
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

module.exports = {
  fetchSessions,
  fetchSession,
  updateSession,
  createSession,
  duplicateSession,
  deleteSession,
  upsertAttendance,
};
