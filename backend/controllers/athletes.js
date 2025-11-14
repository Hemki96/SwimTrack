const repositories = require('../repositories');
const { createHttpError } = require('../utils/httpError');

function listAthletes(req, res, next) {
  try {
    res.json(repositories.fetchAthletes());
  } catch (error) {
    next(error);
  }
}

function getAthlete(req, res, next) {
  try {
    const athlete = repositories.fetchAthlete(req.params.athleteId);
    if (!athlete) {
      next(createHttpError(404, 'Athlet:in nicht gefunden'));
      return;
    }
    res.json(athlete);
  } catch (error) {
    next(error);
  }
}

function createAthlete(req, res, next) {
  try {
    const created = repositories.createAthlete(req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

function updateAthlete(req, res, next) {
  try {
    const updated = repositories.updateAthlete(req.params.athleteId, req.body || {});
    if (!updated) {
      next(createHttpError(404, 'Athlet:in nicht gefunden'));
      return;
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

function deleteAthlete(req, res, next) {
  try {
    const deleted = repositories.deleteAthlete(req.params.athleteId);
    if (!deleted) {
      next(createHttpError(404, 'Athlet:in nicht gefunden'));
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listAthletes,
  getAthlete,
  createAthlete,
  updateAthlete,
  deleteAthlete,
};
