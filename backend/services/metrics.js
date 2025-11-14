const metricsRepository = require('../repositories/metrics');

function listMetrics(filters = {}) {
  return metricsRepository.fetchMetrics(filters);
}

function getMetric(metricId) {
  return metricsRepository.fetchMetric(metricId);
}

function createMetric(payload) {
  return metricsRepository.createMetric(payload);
}

function updateMetric(metricId, payload) {
  return metricsRepository.updateMetric(metricId, payload);
}

function deleteMetric(metricId) {
  return metricsRepository.deleteMetric(metricId);
}

module.exports = {
  listMetrics,
  getMetric,
  createMetric,
  updateMetric,
  deleteMetric,
};
