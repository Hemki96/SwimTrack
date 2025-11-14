const teamsService = require('../services/teams');
const { createHttpError } = require('../utils/httpError');

function listTeams(req, res, next) {
  try {
    res.json(teamsService.listTeams());
  } catch (error) {
    next(error);
  }
}

function getTeam(req, res, next) {
  try {
    const team = teamsService.getTeam(req.params.teamId);
    if (!team) {
      next(createHttpError(404, 'Team nicht gefunden'));
      return;
    }
    res.json(team);
  } catch (error) {
    next(error);
  }
}

function createTeam(req, res, next) {
  try {
    const team = teamsService.createTeam(req.body);
    res.status(201).json(team);
  } catch (error) {
    next(error);
  }
}

function updateTeam(req, res, next) {
  try {
    const updated = teamsService.updateTeam(req.params.teamId, req.body || {});
    if (!updated) {
      next(createHttpError(404, 'Team nicht gefunden'));
      return;
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

function deleteTeam(req, res, next) {
  try {
    const { teamId } = req.params;
    const { force } = req.query;

    const result = teamsService.deleteTeam(teamId, { force });
    if (!result.found) {
      next(createHttpError(404, 'Team nicht gefunden'));
      return;
    }
    if (!result.deleted) {
      res
        .status(409)
        .json({
          detail: 'Team kann nicht gelöscht werden, es existieren noch Zuordnungen',
          dependencies: result.dependencies,
        });
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
};
