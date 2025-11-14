const express = require('express');
const { listTeams, getTeam, createTeam, updateTeam, deleteTeam } = require('../controllers/teams');

const router = express.Router();

router.get('/', listTeams);
router.get('/:teamId', getTeam);
router.post('/', createTeam);
router.patch('/:teamId', updateTeam);
router.delete('/:teamId', deleteTeam);

module.exports = router;
