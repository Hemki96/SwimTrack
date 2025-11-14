const repositories = require('../repositories');

function createNote(req, res) {
  try {
    const body = req.body && req.body.body;
    if (!body || !body.trim()) {
      res.status(400).json({ detail: 'Notiz darf nicht leer sein' });
      return;
    }
    const note = repositories.saveNote(body.trim());
    res.json(note);
  } catch (error) {
    res.status(500).json({ detail: 'Notiz konnte nicht gespeichert werden', error: error.message });
  }
}

module.exports = {
  createNote,
};
