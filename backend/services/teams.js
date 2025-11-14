const teamsRepository = require('../repositories/teams');

function listTeams() {
  return teamsRepository.fetchTeams();
}

function getTeam(teamId) {
  return teamsRepository.fetchTeam(teamId);
}

function createTeam(payload) {
  return teamsRepository.createTeam(payload);
}

function updateTeam(teamId, payload) {
  return teamsRepository.updateTeam(teamId, payload);
}

function deleteTeam(teamId, { force = false } = {}) {
  const existing = teamsRepository.fetchTeam(teamId);
  if (!existing) {
    return { found: false, deleted: false };
  }

  const dependencies = teamsRepository.countTeamDependencies(teamId);
  const hasDependencies =
    (dependencies?.athlete_count || 0) > 0 ||
    (dependencies?.session_count || 0) > 0 ||
    (dependencies?.report_count || 0) > 0;

  if (hasDependencies && !force) {
    return { found: true, deleted: false, dependencies };
  }

  teamsRepository.deleteTeamCascade(teamId);
  return { found: true, deleted: true, dependencies };
}

module.exports = {
  listTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
};
