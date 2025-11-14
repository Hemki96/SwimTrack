const sessionsRepository = require('../repositories/sessions');

function listSessions(filters = {}) {
  return sessionsRepository.fetchSessions(filters);
}

function getSession(sessionId) {
  return sessionsRepository.fetchSession(sessionId);
}

function createSession(payload) {
  return sessionsRepository.createSession(payload);
}

function updateSession(sessionId, payload) {
  return sessionsRepository.updateSession(sessionId, payload);
}

function deleteSession(sessionId) {
  return sessionsRepository.deleteSession(sessionId);
}

function duplicateSession(sessionId, overrides = {}) {
  return sessionsRepository.duplicateSession(sessionId, overrides);
}

function updateAttendance(sessionId, rows) {
  sessionsRepository.upsertAttendance(sessionId, rows);
  return sessionsRepository.fetchSession(sessionId);
}

module.exports = {
  listSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  duplicateSession,
  updateAttendance,
};
