const express = require('express');
const {
  listMetrics,
  getMetric,
  createMetric,
  updateMetric,
  deleteMetric,
} = require('../controllers/metrics');

const router = express.Router();

router.get('/', listMetrics);
router.get('/:metricId', getMetric);
router.post('/', createMetric);
router.patch('/:metricId', updateMetric);
router.delete('/:metricId', deleteMetric);

module.exports = router;
