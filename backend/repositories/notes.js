const { getDb } = require('./utils');

function fetchLatestNote() {
  const db = getDb();
  const note = db
    .prepare(`
      SELECT * FROM coach_notes ORDER BY updated_at DESC, id DESC LIMIT 1
    `)
    .get();
  return note || null;
}

function saveNote(body) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO coach_notes (body, updated_at)
    VALUES (?, datetime('now'))
  `);
  const result = stmt.run(body);
  return db.prepare('SELECT * FROM coach_notes WHERE id = ?').get(result.lastInsertRowid);
}

module.exports = {
  fetchLatestNote,
  saveNote,
};
