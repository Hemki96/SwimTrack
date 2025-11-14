const {
  ensureRequiredInt,
  ensureOptionalInt,
  ensureRequiredString,
  ensureOptionalString,
  ensureNullableString,
  ensureRequiredNumber,
  ensureOptionalNumber,
  ensureOptionalNumberOrNull,
  ensureArray,
  parseBooleanFlag,
  finalizeValidation,
} = require('./helpers');

function validateSessionIdParams(params = {}) {
  const issues = [];
  const sessionId = ensureRequiredInt(
    params,
    'sessionId',
    issues,
    'sessionId muss eine positive Zahl sein',
    { positive: true }
  );
  return finalizeValidation(issues, { sessionId });
}

function validateListSessionsQuery(query = {}) {
  const issues = [];
  const result = {};

  const teamId = ensureOptionalInt(query, 'team_id', issues, 'team_id muss eine Zahl sein', {
    positive: true,
  });
  if (teamId !== undefined) {
    result.team_id = teamId;
  }
  const status = ensureOptionalString(query, 'status', issues, 'status darf nicht leer sein');
  if (status !== undefined) {
    result.status = status;
  }
  const withAttendance = parseBooleanFlag(query.with_attendance, undefined);
  if (withAttendance !== undefined) {
    result.with_attendance = withAttendance;
  }

  return finalizeValidation(issues, result);
}

function mapSessionPayload(body = {}, issues, { allowMissing = false } = {}) {
  const result = {};

  const teamId = allowMissing
    ? ensureOptionalInt(body, 'team_id', issues, 'team_id muss eine Zahl sein')
    : ensureRequiredInt(body, 'team_id', issues, 'team_id muss eine Zahl sein');
  if (teamId !== undefined) {
    result.team_id = teamId;
  }

  const title = allowMissing
    ? ensureOptionalString(body, 'title', issues, 'title darf nicht leer sein')
    : ensureRequiredString(body, 'title', issues, 'title ist erforderlich');
  if (title !== undefined) {
    result.title = title;
  }

  const sessionDate = allowMissing
    ? ensureOptionalString(body, 'session_date', issues, 'session_date darf nicht leer sein')
    : ensureRequiredString(body, 'session_date', issues, 'session_date ist erforderlich');
  if (sessionDate !== undefined) {
    result.session_date = sessionDate;
  }

  const startTime = allowMissing
    ? ensureOptionalString(body, 'start_time', issues, 'start_time darf nicht leer sein')
    : ensureRequiredString(body, 'start_time', issues, 'start_time ist erforderlich');
  if (startTime !== undefined) {
    result.start_time = startTime;
  }

  const duration = allowMissing
    ? ensureOptionalNumber(body, 'duration_minutes', issues, 'duration_minutes muss eine Zahl sein')
    : ensureRequiredNumber(body, 'duration_minutes', issues, 'duration_minutes muss eine Zahl sein');
  if (duration !== undefined) {
    result.duration_minutes = duration;
  }

  const status = allowMissing
    ? ensureOptionalString(body, 'status', issues, 'status darf nicht leer sein')
    : ensureRequiredString(body, 'status', issues, 'status ist erforderlich');
  if (status !== undefined) {
    result.status = status;
  }

  const focusArea = allowMissing
    ? ensureOptionalString(body, 'focus_area', issues, 'focus_area darf nicht leer sein')
    : ensureRequiredString(body, 'focus_area', issues, 'focus_area ist erforderlich');
  if (focusArea !== undefined) {
    result.focus_area = focusArea;
  }

  const loadTarget = allowMissing
    ? ensureOptionalNumber(body, 'load_target', issues, 'load_target muss eine Zahl sein')
    : ensureRequiredNumber(body, 'load_target', issues, 'load_target muss eine Zahl sein');
  if (loadTarget !== undefined) {
    result.load_target = loadTarget;
  }

  const loadActual = ensureOptionalNumberOrNull(body, 'load_actual', issues, 'load_actual muss eine Zahl sein');
  if (loadActual !== undefined) {
    result.load_actual = loadActual;
  } else if (!allowMissing) {
    result.load_actual = null;
  }

  const notes = ensureNullableString(body, 'notes', issues, 'notes darf nicht leer sein');
  if (notes !== undefined) {
    result.notes = notes;
  } else if (!allowMissing) {
    result.notes = null;
  }

  return result;
}

function validateCreateSession(body = {}) {
  const issues = [];
  const result = mapSessionPayload(body, issues, { allowMissing: false });
  return finalizeValidation(issues, result);
}

function validateUpdateSession(body = {}) {
  const issues = [];
  const result = mapSessionPayload(body, issues, { allowMissing: true });
  return finalizeValidation(issues, result);
}

function validateDuplicateSession(body = {}) {
  const issues = [];
  const result = mapSessionPayload(body, issues, { allowMissing: true });
  return finalizeValidation(issues, result);
}

function validateAttendanceBody(body = []) {
  const issues = [];
  const entries = ensureArray(body, 'body', issues, { min: 1 });
  const sanitized = entries.map((entry, index) => {
    const entryIssues = [];
    const athleteId = ensureRequiredInt(
      entry,
      'athlete_id',
      entryIssues,
      'athlete_id muss eine Zahl sein',
      { positive: true }
    );
    const status = ensureOptionalString(entry, 'status', entryIssues, 'status darf nicht leer sein');
    const note = ensureNullableString(entry, 'note', entryIssues, 'note darf nicht leer sein');

    if (entryIssues.length) {
      entryIssues.forEach((issue) => {
        issues.push({ path: `body[${index}].${issue.path}`, message: issue.message });
      });
    }

    return {
      athlete_id: athleteId,
      ...(status !== undefined ? { status } : {}),
      ...(note !== undefined ? { note } : {}),
    };
  });

  return finalizeValidation(issues, sanitized);
}

module.exports = {
  validateSessionIdParams,
  validateListSessionsQuery,
  validateCreateSession,
  validateUpdateSession,
  validateDuplicateSession,
  validateAttendanceBody,
};
