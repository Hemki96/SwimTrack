const express = require('express');
const {
  listAthletes,
  getAthlete,
  createAthlete,
  updateAthlete,
  deleteAthlete,
} = require('../controllers/athletes');
const validate = require('../middleware/validate');
const {
  validateCreateAthlete,
  validateUpdateAthlete,
  validateAthleteIdParams,
} = require('../validation/athletes');

const router = express.Router();

router.get('/', listAthletes);
router.get('/:athleteId', validate({ params: validateAthleteIdParams }), getAthlete);
router.post('/', validate({ body: validateCreateAthlete }), createAthlete);
router.patch(
  '/:athleteId',
  validate({ params: validateAthleteIdParams, body: validateUpdateAthlete }),
  updateAthlete
);
router.delete('/:athleteId', validate({ params: validateAthleteIdParams }), deleteAthlete);

module.exports = router;
