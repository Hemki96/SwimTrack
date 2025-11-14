const athletesRepository = require('../repositories/athletes');

function listAthletes() {
  return athletesRepository.fetchAthletes();
}

function getAthlete(athleteId) {
  return athletesRepository.fetchAthlete(athleteId);
}

function createAthlete(payload) {
  return athletesRepository.createAthlete(payload);
}

function updateAthlete(athleteId, payload) {
  return athletesRepository.updateAthlete(athleteId, payload);
}

function deleteAthlete(athleteId) {
  return athletesRepository.deleteAthlete(athleteId);
}

module.exports = {
  listAthletes,
  getAthlete,
  createAthlete,
  updateAthlete,
  deleteAthlete,
};
