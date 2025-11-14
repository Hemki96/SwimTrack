const express = require('express');
const {
  listMetrics,
  getMetric,
  createMetric,
  updateMetric,
  deleteMetric,
} = require('../controllers/metrics');
const validate = require('../middleware/validate');
const {
  validateListMetricsQuery,
  validateCreateMetric,
  validateUpdateMetric,
  validateMetricIdParams,
} = require('../validation/metrics');

const router = express.Router();

router.get('/', validate({ query: validateListMetricsQuery }), listMetrics);
router.get('/:metricId', validate({ params: validateMetricIdParams }), getMetric);
router.post('/', validate({ body: validateCreateMetric }), createMetric);
router.patch(
  '/:metricId',
  validate({ params: validateMetricIdParams, body: validateUpdateMetric }),
  updateMetric
);
router.delete('/:metricId', validate({ params: validateMetricIdParams }), deleteMetric);

module.exports = router;
