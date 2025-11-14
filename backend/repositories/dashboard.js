const { getDb } = require('./utils');

function fetchDashboardKpis({ rangeDays = 30 } = {}) {
  const db = getDb();
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

module.exports = {
  fetchDashboardKpis,
};
