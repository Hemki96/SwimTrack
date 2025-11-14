const notesRepository = require('../repositories/notes');

function createNote(body) {
  return notesRepository.saveNote(body);
}

module.exports = {
  createNote,
};
