const metricsService = require('../services/metrics');
const { createHttpError } = require('../utils/httpError');

function listMetrics(req, res, next) {
  try {
    const filters = {};
    if (req.query.team_id !== undefined) {
      filters.teamId = req.query.team_id;
    }
    if (req.query.metric_type !== undefined) {
      filters.metricType = req.query.metric_type;
    }
    res.json(metricsService.listMetrics(filters));
  } catch (error) {
    next(error);
  }
}

function getMetric(req, res, next) {
  try {
    const metric = metricsService.getMetric(req.params.metricId);
    if (!metric) {
      next(createHttpError(404, 'Metrik nicht gefunden'));
      return;
    }
    res.json(metric);
  } catch (error) {
    next(error);
  }
}

function createMetric(req, res, next) {
  try {
    const created = metricsService.createMetric(req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

function updateMetric(req, res, next) {
  try {
    const updated = metricsService.updateMetric(req.params.metricId, req.body || {});
    if (!updated) {
      next(createHttpError(404, 'Metrik nicht gefunden'));
      return;
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

function deleteMetric(req, res, next) {
  try {
    const deleted = metricsService.deleteMetric(req.params.metricId);
    if (!deleted) {
      next(createHttpError(404, 'Metrik nicht gefunden'));
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listMetrics,
  getMetric,
  createMetric,
  updateMetric,
  deleteMetric,
};
