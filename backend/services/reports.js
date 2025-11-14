const reportsRepository = require('../repositories/reports');

function listReports() {
  return reportsRepository.fetchReports();
}

module.exports = {
  listReports,
};
