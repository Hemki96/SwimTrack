const express = require('express');
const {
  listSessions,
  getSession,
  deleteSession,
  updateSession,
  createSession,
  duplicateSession,
  upsertAttendance,
} = require('../controllers/sessions');

const router = express.Router();

router.get('/', listSessions);
router.get('/:sessionId', getSession);
router.post('/', createSession);
router.patch('/:sessionId', updateSession);
router.delete('/:sessionId', deleteSession);
router.post('/:sessionId/duplicate', duplicateSession);
router.post('/:sessionId/attendance', upsertAttendance);

module.exports = router;
