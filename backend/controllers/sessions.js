const repositories = require('../repositories');

function listSessions(req, res) {
  try {
    const filters = {};
    if (req.query.team_id !== undefined) {
      const teamId = Number(req.query.team_id);
      if (Number.isNaN(teamId)) {
        res.status(400).json({ detail: 'team_id muss eine Zahl sein' });
        return;
      }
      filters.teamId = teamId;
    }
    if (req.query.status !== undefined) {
      filters.status = req.query.status;
    }
    if (req.query.with_attendance !== undefined) {
      const flag = String(req.query.with_attendance).toLowerCase();
      filters.includeAttendance = flag !== '0' && flag !== 'false' && flag !== 'no';
    }
    res.json(repositories.fetchSessions(filters));
  } catch (error) {
    res.status(500).json({ detail: 'Sessions konnten nicht geladen werden', error: error.message });
  }
}

function getSession(req, res) {
  try {
    const session = repositories.fetchSession(Number(req.params.sessionId));
    if (!session) {
      res.status(404).json({ detail: 'Trainingseinheit nicht gefunden' });
      return;
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ detail: 'Trainingseinheit konnte nicht geladen werden', error: error.message });
  }
}

function deleteSession(req, res) {
  try {
    const sessionId = Number(req.params.sessionId);
    if (Number.isNaN(sessionId)) {
      res.status(400).json({ detail: 'Ungültige Session-ID' });
      return;
    }

    const deleted = repositories.deleteSession(sessionId);
    if (!deleted) {
      res.status(404).json({ detail: 'Trainingseinheit nicht gefunden' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ detail: 'Trainingseinheit konnte nicht gelöscht werden', error: error.message });
  }
}

function updateSession(req, res) {
  try {
    const updated = repositories.updateSession(Number(req.params.sessionId), req.body || {});
    if (!updated) {
      res.status(404).json({ detail: 'Trainingseinheit nicht gefunden' });
      return;
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ detail: 'Trainingseinheit konnte nicht aktualisiert werden', error: error.message });
  }
}

function createSession(req, res) {
  try {
    const {
      team_id,
      title,
      session_date,
      start_time,
      duration_minutes,
      status,
      focus_area,
      load_target,
      load_actual,
      notes,
    } = req.body || {};

    const required = [team_id, title, session_date, start_time, duration_minutes, status, focus_area, load_target];
    if (required.some((value) => value === undefined || value === null || value === '')) {
      res.status(400).json({ detail: 'Pflichtfelder fehlen für die Erstellung der Einheit' });
      return;
    }

    const created = repositories.createSession({
      team_id,
      title,
      session_date,
      start_time,
      duration_minutes,
      status,
      focus_area,
      load_target,
      load_actual,
      notes,
    });
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ detail: 'Trainingseinheit konnte nicht angelegt werden', error: error.message });
  }
}

function duplicateSession(req, res) {
  try {
    const duplicated = repositories.duplicateSession(Number(req.params.sessionId), req.body || {});
    if (!duplicated) {
      res.status(404).json({ detail: 'Ausgangseinheit nicht gefunden' });
      return;
    }
    res.status(201).json(duplicated);
  } catch (error) {
    res.status(500).json({ detail: 'Trainingseinheit konnte nicht dupliziert werden', error: error.message });
  }
}

function upsertAttendance(req, res) {
  try {
    const entries = Array.isArray(req.body) ? req.body : [];
    if (!entries.length) {
      res.status(400).json({ detail: 'Keine Einträge übermittelt' });
      return;
    }
    repositories.upsertAttendance(Number(req.params.sessionId), entries);
    const session = repositories.fetchSession(Number(req.params.sessionId));
    if (!session) {
      res.status(404).json({ detail: 'Trainingseinheit nicht gefunden' });
      return;
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ detail: 'Anwesenheit konnte nicht gespeichert werden', error: error.message });
  }
}

module.exports = {
  listSessions,
  getSession,
  deleteSession,
  updateSession,
  createSession,
  duplicateSession,
  upsertAttendance,
};
