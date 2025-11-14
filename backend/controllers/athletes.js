const repositories = require('../repositories');

function listAthletes(req, res) {
  try {
    res.json(repositories.fetchAthletes());
  } catch (error) {
    res.status(500).json({ detail: 'Athleten konnten nicht geladen werden', error: error.message });
  }
}

function getAthlete(req, res) {
  try {
    const athlete = repositories.fetchAthlete(Number(req.params.athleteId));
    if (!athlete) {
      res.status(404).json({ detail: 'Athlet:in nicht gefunden' });
      return;
    }
    res.json(athlete);
  } catch (error) {
    res.status(500).json({ detail: 'Athlet:in konnte nicht geladen werden', error: error.message });
  }
}

function createAthlete(req, res) {
  try {
    const {
      first_name,
      last_name,
      birth_year,
      primary_stroke,
      best_event,
      personal_best,
      personal_best_unit,
      focus_note,
      team_id,
    } = req.body || {};

    const required = [first_name, last_name, birth_year, primary_stroke, best_event, team_id];
    if (required.some((value) => value === undefined || value === null || value === '')) {
      res.status(400).json({ detail: 'Pflichtfelder fehlen für die Erstellung der Athlet:in' });
      return;
    }

    const birthYearNumber = Number(birth_year);
    if (!Number.isInteger(birthYearNumber)) {
      res.status(400).json({ detail: 'Geburtsjahr muss eine Ganzzahl sein' });
      return;
    }

    let personalBestNumber = null;
    if (personal_best !== undefined && personal_best !== null && personal_best !== '') {
      personalBestNumber = Number(personal_best);
      if (!Number.isFinite(personalBestNumber)) {
        res.status(400).json({ detail: 'Bestzeit muss eine Zahl sein' });
        return;
      }
    }

    const payload = {
      first_name: String(first_name).trim(),
      last_name: String(last_name).trim(),
      birth_year: birthYearNumber,
      primary_stroke: String(primary_stroke).trim(),
      best_event: String(best_event).trim(),
      personal_best: personalBestNumber,
      personal_best_unit:
        personal_best_unit === undefined || personal_best_unit === null || personal_best_unit === ''
          ? null
          : String(personal_best_unit).trim(),
      focus_note:
        focus_note === undefined || focus_note === null || focus_note === ''
          ? null
          : String(focus_note).trim(),
      team_id: Number(team_id),
    };

    if (Number.isNaN(payload.team_id)) {
      res.status(400).json({ detail: 'team_id muss eine Zahl sein' });
      return;
    }

    const created = repositories.createAthlete(payload);
    res.status(201).json(created);
  } catch (error) {
    if (error.code === 'TEAM_NOT_FOUND') {
      res.status(400).json({ detail: 'Team nicht gefunden' });
      return;
    }
    res.status(500).json({ detail: 'Athlet:in konnte nicht erstellt werden', error: error.message });
  }
}

function updateAthlete(req, res) {
  try {
    const athleteId = Number(req.params.athleteId);
    if (Number.isNaN(athleteId)) {
      res.status(400).json({ detail: 'Ungültige Athlet:innen-ID' });
      return;
    }

    const updates = {};
    const {
      first_name,
      last_name,
      birth_year,
      primary_stroke,
      best_event,
      personal_best,
      personal_best_unit,
      focus_note,
      team_id,
    } = req.body || {};

    if (first_name !== undefined) {
      updates.first_name = String(first_name).trim();
    }
    if (last_name !== undefined) {
      updates.last_name = String(last_name).trim();
    }
    if (birth_year !== undefined) {
      const birthYearNumber = Number(birth_year);
      if (!Number.isInteger(birthYearNumber)) {
        res.status(400).json({ detail: 'Geburtsjahr muss eine Ganzzahl sein' });
        return;
      }
      updates.birth_year = birthYearNumber;
    }
    if (primary_stroke !== undefined) {
      updates.primary_stroke = String(primary_stroke).trim();
    }
    if (best_event !== undefined) {
      updates.best_event = String(best_event).trim();
    }
    if (personal_best !== undefined) {
      if (personal_best === null || personal_best === '') {
        updates.personal_best = null;
      } else {
        const personalBestNumber = Number(personal_best);
        if (!Number.isFinite(personalBestNumber)) {
          res.status(400).json({ detail: 'Bestzeit muss eine Zahl sein' });
          return;
        }
        updates.personal_best = personalBestNumber;
      }
    }
    if (personal_best_unit !== undefined) {
      updates.personal_best_unit =
        personal_best_unit === null || personal_best_unit === ''
          ? null
          : String(personal_best_unit).trim();
    }
    if (focus_note !== undefined) {
      updates.focus_note = focus_note === null || focus_note === '' ? null : String(focus_note).trim();
    }
    if (team_id !== undefined) {
      const teamIdNumber = Number(team_id);
      if (Number.isNaN(teamIdNumber)) {
        res.status(400).json({ detail: 'team_id muss eine Zahl sein' });
        return;
      }
      updates.team_id = teamIdNumber;
    }

    const updated = repositories.updateAthlete(athleteId, updates);
    if (!updated) {
      res.status(404).json({ detail: 'Athlet:in nicht gefunden' });
      return;
    }
    res.json(updated);
  } catch (error) {
    if (error.code === 'TEAM_NOT_FOUND') {
      res.status(400).json({ detail: 'Team nicht gefunden' });
      return;
    }
    res.status(500).json({ detail: 'Athlet:in konnte nicht aktualisiert werden', error: error.message });
  }
}

function deleteAthlete(req, res) {
  try {
    const athleteId = Number(req.params.athleteId);
    if (Number.isNaN(athleteId)) {
      res.status(400).json({ detail: 'Ungültige Athlet:innen-ID' });
      return;
    }

    const deleted = repositories.deleteAthlete(athleteId);
    if (!deleted) {
      res.status(404).json({ detail: 'Athlet:in nicht gefunden' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ detail: 'Athlet:in konnte nicht gelöscht werden', error: error.message });
  }
}

module.exports = {
  listAthletes,
  getAthlete,
  createAthlete,
  updateAthlete,
  deleteAthlete,
};
