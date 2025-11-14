const express = require('express');
const { listTeams, getTeam, createTeam, updateTeam, deleteTeam } = require('../controllers/teams');
const validate = require('../middleware/validate');
const {
  validateCreateTeam,
  validateUpdateTeam,
  validateTeamIdParams,
  validateDeleteTeamQuery,
} = require('../validation/teams');

const router = express.Router();

router.get('/', listTeams);
router.get('/:teamId', validate({ params: validateTeamIdParams }), getTeam);
router.post('/', validate({ body: validateCreateTeam }), createTeam);
router.patch(
  '/:teamId',
  validate({ params: validateTeamIdParams, body: validateUpdateTeam }),
  updateTeam
);
router.delete(
  '/:teamId',
  validate({ params: validateTeamIdParams, query: validateDeleteTeamQuery }),
  deleteTeam
);

module.exports = router;
