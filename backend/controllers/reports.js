const reportsService = require('../services/reports');

function listReports(req, res) {
  try {
    res.json(reportsService.listReports());
  } catch (error) {
    res.status(500).json({ detail: 'Reports konnten nicht geladen werden', error: error.message });
  }
}

module.exports = {
  listReports,
};
