const { getDb } = require('./utils');

function fetchReports() {
  const db = getDb();
  return db
    .prepare(`
      SELECT r.*, t.name AS team_name
      FROM reports r
      JOIN teams t ON t.id = r.team_id
      ORDER BY r.period_end DESC
    `)
    .all();
}

module.exports = {
  fetchReports,
};
