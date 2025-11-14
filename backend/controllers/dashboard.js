const repositories = require('../repositories');

function getDashboard(req, res) {
  try {
    const rangeParam = req.query.range;
    const rangeDays = rangeParam !== undefined ? Number(rangeParam) : undefined;
    if (rangeParam !== undefined && (Number.isNaN(rangeDays) || rangeDays <= 0)) {
      res.status(400).json({ detail: 'range muss eine positive Zahl sein' });
      return;
    }

    const payload = repositories.fetchDashboardKpis({ rangeDays });
    const note = repositories.fetchLatestNote();
    if (note) {
      payload.coach_note = note;
    }

    res.json(payload);
  } catch (error) {
    res.status(500).json({ detail: 'Dashboard konnte nicht geladen werden', error: error.message });
  }
}

module.exports = {
  getDashboard,
};
