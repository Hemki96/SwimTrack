const repositories = require('../repositories');

function listReports(req, res) {
  try {
    res.json(repositories.fetchReports());
  } catch (error) {
    res.status(500).json({ detail: 'Reports konnten nicht geladen werden', error: error.message });
  }
}

module.exports = {
  listReports,
};
