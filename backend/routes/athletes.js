const express = require('express');
const {
  listAthletes,
  getAthlete,
  createAthlete,
  updateAthlete,
  deleteAthlete,
} = require('../controllers/athletes');

const router = express.Router();

router.get('/', listAthletes);
router.get('/:athleteId', getAthlete);
router.post('/', createAthlete);
router.patch('/:athleteId', updateAthlete);
router.delete('/:athleteId', deleteAthlete);

module.exports = router;
