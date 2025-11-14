const express = require('express');
const { listReports } = require('../controllers/reports');

const router = express.Router();

router.get('/', listReports);

module.exports = router;
