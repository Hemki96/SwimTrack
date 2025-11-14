const { getDb, createFilter, buildWhereClause } = require('./utils');

function fetchMetrics({ teamId, metricType } = {}) {
  const db = getDb();
  const filters = [];
  if (teamId !== undefined) {
    filters.push(createFilter('t.id = ?', teamId));
  }
  if (metricType !== undefined) {
    filters.push(createFilter('m.metric_type = ?', metricType));
  }
  const { clause, params } = buildWhereClause(filters);
  const sql = `
    SELECT m.*, a.first_name, a.last_name, t.name AS team_name
    FROM metrics m
    JOIN athletes a ON a.id = m.athlete_id
    JOIN teams t ON t.id = a.team_id
    WHERE 1 = 1
    ${clause}
    ORDER BY m.metric_date DESC, m.id DESC
  `;
  return db.prepare(sql).all(...params);
}

function fetchMetric(metricId) {
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
  const existing = db.prepare('SELECT id FROM metrics WHERE id = ?').get(metricId);
  if (!existing) {
    return false;
  }

  const result = db.prepare('DELETE FROM metrics WHERE id = ?').run(metricId);
  return result.changes > 0;
}

module.exports = {
  fetchMetrics,
  fetchMetric,
  createMetric,
  updateMetric,
  deleteMetric,
};
