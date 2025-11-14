const SERVICE_ERROR_RESPONSES = {
  TEAM_NOT_FOUND: {
    status: 400,
    detail: 'Team nicht gefunden',
  },
  ATHLETE_NOT_FOUND: {
    status: 400,
    detail: 'Athlet:in nicht gefunden',
  },
};

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error && error.code && SERVICE_ERROR_RESPONSES[error.code]) {
    const { status, detail } = SERVICE_ERROR_RESPONSES[error.code];
    res.status(status).json({ detail });
    return;
  }

  if (error && error.status) {
    const payload = {
      detail: error.detail || error.message || 'Unbekannter Fehler',
    };
    if (error.meta) {
      payload.meta = error.meta;
    }
    res.status(error.status).json(payload);
    return;
  }

  console.error('Unerwarteter Fehler:', error);
  res.status(500).json({ detail: 'Interner Serverfehler' });
}

module.exports = errorHandler;
