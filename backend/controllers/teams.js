const repositories = require('../repositories');

function listTeams(req, res) {
  try {
    res.json(repositories.fetchTeams());
  } catch (error) {
    res.status(500).json({ detail: 'Teams konnten nicht geladen werden', error: error.message });
  }
}

function getTeam(req, res) {
  try {
    const team = repositories.fetchTeam(Number(req.params.teamId));
    if (!team) {
      res.status(404).json({ detail: 'Team nicht gefunden' });
      return;
    }
    res.json(team);
  } catch (error) {
    res.status(500).json({ detail: 'Team konnte nicht geladen werden', error: error.message });
  }
}

function createTeam(req, res) {
  try {
    const { name, short_name, level, coach, training_days, focus_theme } = req.body || {};
    const required = [name, short_name, level, coach, training_days, focus_theme];
    if (required.some((value) => value === undefined || value === null || value === '')) {
      res.status(400).json({ detail: 'Pflichtfelder fehlen für die Erstellung des Teams' });
      return;
    }
    const team = repositories.createTeam({
      name,
      short_name,
      level,
      coach,
      training_days,
      focus_theme,
    });
    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ detail: 'Team konnte nicht erstellt werden', error: error.message });
  }
}

function updateTeam(req, res) {
  try {
    const updated = repositories.updateTeam(Number(req.params.teamId), req.body || {});
    if (!updated) {
      res.status(404).json({ detail: 'Team nicht gefunden' });
      return;
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ detail: 'Team konnte nicht aktualisiert werden', error: error.message });
  }
}

function deleteTeam(req, res) {
  try {
    const teamId = Number(req.params.teamId);
    if (Number.isNaN(teamId)) {
      res.status(400).json({ detail: 'Ungültige Team-ID' });
      return;
    }

    const forceParam = req.query.force;
    const force =
      typeof forceParam === 'string'
        ? ['1', 'true', 'yes', 'on'].includes(forceParam.toLowerCase())
        : forceParam === true;

    const result = repositories.deleteTeam(teamId, { force });
    if (!result.found) {
      res.status(404).json({ detail: 'Team nicht gefunden' });
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
    res.status(500).json({ detail: 'Team konnte nicht gelöscht werden', error: error.message });
  }
}

module.exports = {
  listTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
};
