const {
  ensureRequiredString,
  ensureOptionalString,
  ensureRequiredInt,
  parseBooleanFlag,
  finalizeValidation,
} = require('./helpers');

function validateTeamIdParams(params = {}) {
  const issues = [];
  const teamId = ensureRequiredInt(params, 'teamId', issues, 'teamId muss eine positive Zahl sein', {
    positive: true,
  });
  return finalizeValidation(issues, { teamId });
}

function validateCreateTeam(body = {}) {
  const issues = [];
  const result = {
    name: ensureRequiredString(body, 'name', issues, 'Name ist erforderlich'),
    short_name: ensureRequiredString(body, 'short_name', issues, 'Kurzname ist erforderlich'),
    level: ensureRequiredString(body, 'level', issues, 'Level ist erforderlich'),
    coach: ensureRequiredString(body, 'coach', issues, 'Trainer:in ist erforderlich'),
    training_days: ensureRequiredString(
      body,
      'training_days',
      issues,
      'Trainingstage sind erforderlich'
    ),
    focus_theme: ensureRequiredString(body, 'focus_theme', issues, 'Fokusthema ist erforderlich'),
  };

  return finalizeValidation(issues, result);
}

function validateUpdateTeam(body = {}) {
  const issues = [];
  const result = {};

  const name = ensureOptionalString(body, 'name', issues, 'Name darf nicht leer sein');
  if (name !== undefined) {
    result.name = name;
  }
  const shortName = ensureOptionalString(body, 'short_name', issues, 'Kurzname darf nicht leer sein');
  if (shortName !== undefined) {
    result.short_name = shortName;
  }
  const level = ensureOptionalString(body, 'level', issues, 'Level darf nicht leer sein');
  if (level !== undefined) {
    result.level = level;
  }
  const coach = ensureOptionalString(body, 'coach', issues, 'Trainer:in darf nicht leer sein');
  if (coach !== undefined) {
    result.coach = coach;
  }
  const trainingDays = ensureOptionalString(
    body,
    'training_days',
    issues,
    'Trainingstage dürfen nicht leer sein'
  );
  if (trainingDays !== undefined) {
    result.training_days = trainingDays;
  }
  const focusTheme = ensureOptionalString(
    body,
    'focus_theme',
    issues,
    'Fokusthema darf nicht leer sein'
  );
  if (focusTheme !== undefined) {
    result.focus_theme = focusTheme;
  }

  return finalizeValidation(issues, result);
}

function validateDeleteTeamQuery(query = {}) {
  const force = parseBooleanFlag(query.force, false) === true;
  return { force };
}

module.exports = {
  validateCreateTeam,
  validateUpdateTeam,
  validateTeamIdParams,
  validateDeleteTeamQuery,
};
