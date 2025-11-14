const repositories = require('../repositories');
const { createHttpError } = require('../utils/httpError');

function listSessions(req, res, next) {
  try {
    const filters = {};
    if (req.query.team_id !== undefined) {
      filters.teamId = req.query.team_id;
    }
    if (req.query.status !== undefined) {
      filters.status = req.query.status;
    }
    if (req.query.with_attendance !== undefined) {
      filters.includeAttendance = req.query.with_attendance;
    }
    res.json(repositories.fetchSessions(filters));
  } catch (error) {
    next(error);
  }
}

function getSession(req, res, next) {
  try {
    const session = repositories.fetchSession(req.params.sessionId);
    if (!session) {
      next(createHttpError(404, 'Trainingseinheit nicht gefunden'));
      return;
    }
    res.json(session);
  } catch (error) {
    next(error);
  }
}

function deleteSession(req, res, next) {
  try {
    const deleted = repositories.deleteSession(req.params.sessionId);
    if (!deleted) {
      next(createHttpError(404, 'Trainingseinheit nicht gefunden'));
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

function updateSession(req, res, next) {
  try {
    const updated = repositories.updateSession(req.params.sessionId, req.body || {});
    if (!updated) {
      next(createHttpError(404, 'Trainingseinheit nicht gefunden'));
      return;
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

function createSession(req, res, next) {
  try {
    const created = repositories.createSession(req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

function duplicateSession(req, res, next) {
  try {
    const duplicated = repositories.duplicateSession(req.params.sessionId, req.body || {});
    if (!duplicated) {
      next(createHttpError(404, 'Ausgangseinheit nicht gefunden'));
      return;
    }
    res.status(201).json(duplicated);
  } catch (error) {
    next(error);
  }
}

function upsertAttendance(req, res, next) {
  try {
    repositories.upsertAttendance(req.params.sessionId, req.body);
    const session = repositories.fetchSession(req.params.sessionId);
    if (!session) {
      next(createHttpError(404, 'Trainingseinheit nicht gefunden'));
      return;
    }
    res.json(session);
  } catch (error) {
    next(error);
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
