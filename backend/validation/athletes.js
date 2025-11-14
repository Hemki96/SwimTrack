const {
  ensureRequiredString,
  ensureOptionalString,
  ensureNullableString,
  ensureRequiredInt,
  ensureOptionalInt,
  ensureOptionalNumberOrNull,
  finalizeValidation,
} = require('./helpers');

function validateAthleteIdParams(params = {}) {
  const issues = [];
  const athleteId = ensureRequiredInt(
    params,
    'athleteId',
    issues,
    'athleteId muss eine positive Zahl sein',
    { positive: true }
  );
  return finalizeValidation(issues, { athleteId });
}

function validateCreateAthlete(body = {}) {
  const issues = [];
  const result = {
    first_name: ensureRequiredString(body, 'first_name', issues, 'Vorname ist erforderlich'),
    last_name: ensureRequiredString(body, 'last_name', issues, 'Nachname ist erforderlich'),
    birth_year: ensureRequiredInt(body, 'birth_year', issues, 'Geburtsjahr muss eine Ganzzahl sein'),
    primary_stroke: ensureRequiredString(body, 'primary_stroke', issues, 'Schwimmlage ist erforderlich'),
    best_event: ensureRequiredString(body, 'best_event', issues, 'Lieblingsdisziplin ist erforderlich'),
    team_id: ensureRequiredInt(body, 'team_id', issues, 'team_id muss eine Zahl sein'),
  };

  const personalBest = ensureOptionalNumberOrNull(body, 'personal_best', issues, 'Bestzeit muss eine Zahl sein');
  result.personal_best = personalBest ?? null;

  const personalBestUnit = ensureNullableString(
    body,
    'personal_best_unit',
    issues,
    'Einheit darf nicht leer sein'
  );
  result.personal_best_unit = personalBestUnit ?? null;

  const focusNote = ensureNullableString(body, 'focus_note', issues, 'Notiz darf nicht leer sein');
  result.focus_note = focusNote ?? null;

  return finalizeValidation(issues, result);
}

function validateUpdateAthlete(body = {}) {
  const issues = [];
  const result = {};

  const firstName = ensureOptionalString(body, 'first_name', issues, 'Vorname darf nicht leer sein');
  if (firstName !== undefined) {
    result.first_name = firstName;
  }
  const lastName = ensureOptionalString(body, 'last_name', issues, 'Nachname darf nicht leer sein');
  if (lastName !== undefined) {
    result.last_name = lastName;
  }
  const birthYear = ensureOptionalInt(body, 'birth_year', issues, 'Geburtsjahr muss eine Ganzzahl sein');
  if (birthYear !== undefined) {
    result.birth_year = birthYear;
  }
  const primaryStroke = ensureOptionalString(
    body,
    'primary_stroke',
    issues,
    'Schwimmlage darf nicht leer sein'
  );
  if (primaryStroke !== undefined) {
    result.primary_stroke = primaryStroke;
  }
  const bestEvent = ensureOptionalString(body, 'best_event', issues, 'Disziplin darf nicht leer sein');
  if (bestEvent !== undefined) {
    result.best_event = bestEvent;
  }
  const personalBest = ensureOptionalNumberOrNull(body, 'personal_best', issues, 'Bestzeit muss eine Zahl sein');
  if (personalBest !== undefined) {
    result.personal_best = personalBest;
  }
  const personalBestUnit = ensureNullableString(
    body,
    'personal_best_unit',
    issues,
    'Einheit darf nicht leer sein'
  );
  if (personalBestUnit !== undefined) {
    result.personal_best_unit = personalBestUnit;
  }
  const focusNote = ensureNullableString(body, 'focus_note', issues, 'Notiz darf nicht leer sein');
  if (focusNote !== undefined) {
    result.focus_note = focusNote;
  }
  const teamId = ensureOptionalInt(body, 'team_id', issues, 'team_id muss eine Zahl sein');
  if (teamId !== undefined) {
    result.team_id = teamId;
  }

  return finalizeValidation(issues, result);
}

module.exports = {
  validateAthleteIdParams,
  validateCreateAthlete,
  validateUpdateAthlete,
};
