const repositories = require('../repositories');

function listMetrics(req, res) {
  try {
    const filters = {};
    if (req.query.team_id !== undefined) {
      const teamId = Number(req.query.team_id);
      if (Number.isNaN(teamId)) {
        res.status(400).json({ detail: 'team_id muss eine Zahl sein' });
        return;
      }
      filters.teamId = teamId;
    }
    if (req.query.metric_type !== undefined) {
      filters.metricType = req.query.metric_type;
    }
    res.json(repositories.fetchMetrics(filters));
  } catch (error) {
    res.status(500).json({ detail: 'Metriken konnten nicht geladen werden', error: error.message });
  }
}

function getMetric(req, res) {
  try {
    const metricId = Number(req.params.metricId);
    if (Number.isNaN(metricId)) {
      res.status(400).json({ detail: 'Ungültige Metrik-ID' });
      return;
    }

    const metric = repositories.fetchMetric(metricId);
    if (!metric) {
      res.status(404).json({ detail: 'Metrik nicht gefunden' });
      return;
    }
    res.json(metric);
  } catch (error) {
    res.status(500).json({ detail: 'Metrik konnte nicht geladen werden', error: error.message });
  }
}

function createMetric(req, res) {
  try {
    const { athlete_id, metric_date, metric_type, value, unit } = req.body || {};
    const required = [athlete_id, metric_date, metric_type, value, unit];
    if (required.some((item) => item === undefined || item === null || item === '')) {
      res.status(400).json({ detail: 'Pflichtfelder fehlen für die Erstellung der Metrik' });
      return;
    }

    const athleteIdNumber = Number(athlete_id);
    if (Number.isNaN(athleteIdNumber)) {
      res.status(400).json({ detail: 'athlete_id muss eine Zahl sein' });
      return;
    }

    const valueNumber = Number(value);
    if (!Number.isFinite(valueNumber)) {
      res.status(400).json({ detail: 'Wert muss eine Zahl sein' });
      return;
    }

    const payload = {
      athlete_id: athleteIdNumber,
      metric_date: String(metric_date).trim(),
      metric_type: String(metric_type).trim(),
      value: valueNumber,
      unit: String(unit).trim(),
    };

    const created = repositories.createMetric(payload);
    res.status(201).json(created);
  } catch (error) {
    if (error.code === 'ATHLETE_NOT_FOUND') {
      res.status(400).json({ detail: 'Athlet:in nicht gefunden' });
      return;
    }
    res.status(500).json({ detail: 'Metrik konnte nicht erstellt werden', error: error.message });
  }
}

function updateMetric(req, res) {
  try {
    const metricId = Number(req.params.metricId);
    if (Number.isNaN(metricId)) {
      res.status(400).json({ detail: 'Ungültige Metrik-ID' });
      return;
    }

    const updates = {};
    const { athlete_id, metric_date, metric_type, value, unit } = req.body || {};

    if (athlete_id !== undefined) {
      const athleteIdNumber = Number(athlete_id);
      if (Number.isNaN(athleteIdNumber)) {
        res.status(400).json({ detail: 'athlete_id muss eine Zahl sein' });
        return;
      }
      updates.athlete_id = athleteIdNumber;
    }
    if (metric_date !== undefined) {
      updates.metric_date = String(metric_date).trim();
    }
    if (metric_type !== undefined) {
      updates.metric_type = String(metric_type).trim();
    }
    if (value !== undefined) {
      if (value === null || value === '') {
        res.status(400).json({ detail: 'Wert muss eine Zahl sein' });
        return;
      }
      const valueNumber = Number(value);
      if (!Number.isFinite(valueNumber)) {
        res.status(400).json({ detail: 'Wert muss eine Zahl sein' });
        return;
      }
      updates.value = valueNumber;
    }
    if (unit !== undefined) {
      updates.unit = String(unit).trim();
    }

    const updated = repositories.updateMetric(metricId, updates);
    if (!updated) {
      res.status(404).json({ detail: 'Metrik nicht gefunden' });
      return;
    }
    res.json(updated);
  } catch (error) {
    if (error.code === 'ATHLETE_NOT_FOUND') {
      res.status(400).json({ detail: 'Athlet:in nicht gefunden' });
      return;
    }
    res.status(500).json({ detail: 'Metrik konnte nicht aktualisiert werden', error: error.message });
  }
}

function deleteMetric(req, res) {
  try {
    const metricId = Number(req.params.metricId);
    if (Number.isNaN(metricId)) {
      res.status(400).json({ detail: 'Ungültige Metrik-ID' });
      return;
    }

    const deleted = repositories.deleteMetric(metricId);
    if (!deleted) {
      res.status(404).json({ detail: 'Metrik nicht gefunden' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ detail: 'Metrik konnte nicht gelöscht werden', error: error.message });
  }
}

module.exports = {
  listMetrics,
  getMetric,
  createMetric,
  updateMetric,
  deleteMetric,
};
