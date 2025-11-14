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
const validate = require('../middleware/validate');
const {
  validateSessionIdParams,
  validateListSessionsQuery,
  validateCreateSession,
  validateUpdateSession,
  validateDuplicateSession,
  validateAttendanceBody,
} = require('../validation/sessions');

const router = express.Router();

router.get('/', validate({ query: validateListSessionsQuery }), listSessions);
router.get('/:sessionId', validate({ params: validateSessionIdParams }), getSession);
router.post('/', validate({ body: validateCreateSession }), createSession);
router.patch(
  '/:sessionId',
  validate({ params: validateSessionIdParams, body: validateUpdateSession }),
  updateSession
);
router.delete('/:sessionId', validate({ params: validateSessionIdParams }), deleteSession);
router.post(
  '/:sessionId/duplicate',
  validate({ params: validateSessionIdParams, body: validateDuplicateSession }),
  duplicateSession
);
router.post(
  '/:sessionId/attendance',
  validate({ params: validateSessionIdParams, body: validateAttendanceBody }),
  upsertAttendance
);

module.exports = router;
