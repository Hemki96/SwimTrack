const {
  ensureRequiredInt,
  ensureOptionalInt,
  ensureRequiredString,
  ensureOptionalString,
  ensureRequiredNumber,
  ensureOptionalNumber,
  finalizeValidation,
} = require('./helpers');

function validateMetricIdParams(params = {}) {
  const issues = [];
  const metricId = ensureRequiredInt(
    params,
    'metricId',
    issues,
    'metricId muss eine positive Zahl sein',
    { positive: true }
  );
  return finalizeValidation(issues, { metricId });
}

function validateListMetricsQuery(query = {}) {
  const issues = [];
  const result = {};

  const teamId = ensureOptionalInt(query, 'team_id', issues, 'team_id muss eine Zahl sein', {
    positive: true,
  });
  if (teamId !== undefined) {
    result.team_id = teamId;
  }
  const metricType = ensureOptionalString(query, 'metric_type', issues, 'metric_type darf nicht leer sein');
  if (metricType !== undefined) {
    result.metric_type = metricType;
  }

  return finalizeValidation(issues, result);
}

function validateCreateMetric(body = {}) {
  const issues = [];
  const result = {
    athlete_id: ensureRequiredInt(body, 'athlete_id', issues, 'athlete_id muss eine Zahl sein'),
    metric_date: ensureRequiredString(body, 'metric_date', issues, 'metric_date ist erforderlich'),
    metric_type: ensureRequiredString(body, 'metric_type', issues, 'metric_type ist erforderlich'),
    value: ensureRequiredNumber(body, 'value', issues, 'value muss eine Zahl sein'),
    unit: ensureRequiredString(body, 'unit', issues, 'unit ist erforderlich'),
  };

  return finalizeValidation(issues, result);
}

function validateUpdateMetric(body = {}) {
  const issues = [];
  const result = {};

  const athleteId = ensureOptionalInt(body, 'athlete_id', issues, 'athlete_id muss eine Zahl sein');
  if (athleteId !== undefined) {
    result.athlete_id = athleteId;
  }
  const metricDate = ensureOptionalString(body, 'metric_date', issues, 'metric_date darf nicht leer sein');
  if (metricDate !== undefined) {
    result.metric_date = metricDate;
  }
  const metricType = ensureOptionalString(body, 'metric_type', issues, 'metric_type darf nicht leer sein');
  if (metricType !== undefined) {
    result.metric_type = metricType;
  }
  const value = ensureOptionalNumber(body, 'value', issues, 'value muss eine Zahl sein');
  if (value !== undefined) {
    result.value = value;
  }
  const unit = ensureOptionalString(body, 'unit', issues, 'unit darf nicht leer sein');
  if (unit !== undefined) {
    result.unit = unit;
  }

  return finalizeValidation(issues, result);
}

module.exports = {
  validateMetricIdParams,
  validateListMetricsQuery,
  validateCreateMetric,
  validateUpdateMetric,
};
