const dashboardRepository = require('../repositories/dashboard');
const notesRepository = require('../repositories/notes');

function getDashboardOverview({ rangeDays } = {}) {
  const payload = dashboardRepository.fetchDashboardKpis({ rangeDays });
  const note = notesRepository.fetchLatestNote();
  if (note) {
    payload.coach_note = note;
  }
  return payload;
}

module.exports = {
  getDashboardOverview,
};
