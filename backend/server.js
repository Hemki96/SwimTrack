#!/usr/bin/env node
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const { getDatabase, closeDatabase } = require('./db');
const repositories = require('./repositories');
const { seedDatabase } = require('./seed');

try {
  getDatabase();
} catch (error) {
  console.error('Database konnte nicht initialisiert werden.', error);
  process.exit(1);
}

if (config.seed.onStart) {
  try {
    const result = seedDatabase({ onlyIfEmpty: config.seed.onlyIfEmpty });
    if (!result.skipped) {
      console.log(result.message);
    }
  } catch (error) {
    console.error('Seed-Datenbankinitialisierung fehlgeschlagen.', error);
    process.exit(1);
  }
}

const app = express();
if (config.trustProxy !== false) {
  app.set('trust proxy', config.trustProxy);
}
app.disable('x-powered-by');

const corsMiddleware =
  config.cors.allowedOrigins && config.cors.allowedOrigins.length
    ? cors({ origin: config.cors.allowedOrigins })
    : cors();
app.use(corsMiddleware);
app.use(express.json({ limit: config.jsonBodyLimit }));

const BASE_DIR = path.join(__dirname, '..');
const STATIC_DIR = path.join(BASE_DIR, 'src');
const SCREENS_DIR = path.join(BASE_DIR, 'screens');
const DOCS_DIR = path.join(BASE_DIR, 'docs');
const INDEX_FILE = path.join(BASE_DIR, 'index.html');

if (fs.existsSync(STATIC_DIR)) {
  app.use('/src', express.static(STATIC_DIR));
}
if (fs.existsSync(SCREENS_DIR)) {
  app.use('/screens', express.static(SCREENS_DIR));
}
if (fs.existsSync(DOCS_DIR)) {
  app.use('/docs', express.static(DOCS_DIR));
}

app.get('/', (req, res) => {
  if (!fs.existsSync(INDEX_FILE)) {
    res.status(404).json({ detail: 'Index-Datei nicht gefunden' });
    return;
  }
  res.sendFile(INDEX_FILE);
});

app.get('/dashboard', (req, res) => {
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
});

app.get('/teams', (req, res) => {
  try {
    res.json(repositories.fetchTeams());
  } catch (error) {
    res.status(500).json({ detail: 'Teams konnten nicht geladen werden', error: error.message });
  }
});

app.get('/teams/:teamId', (req, res) => {
  try {
    const team = repositories.fetchTeam(Number(req.params.teamId));
    if (!team) {
      res.status(404).json({ detail: 'Team nicht gefunden' });
      return;
    }
    res.json(team);
  } catch (error) {
    res.status(500).json({ detail: 'Team konnte nicht geladen werden', error: error.message });
  }
});

app.get('/athletes', (req, res) => {
  try {
    res.json(repositories.fetchAthletes());
  } catch (error) {
    res.status(500).json({ detail: 'Athleten konnten nicht geladen werden', error: error.message });
  }
});

app.get('/athletes/:athleteId', (req, res) => {
  try {
    const athlete = repositories.fetchAthlete(Number(req.params.athleteId));
    if (!athlete) {
      res.status(404).json({ detail: 'Athlet:in nicht gefunden' });
      return;
    }
    res.json(athlete);
  } catch (error) {
    res.status(500).json({ detail: 'Athlet:in konnte nicht geladen werden', error: error.message });
  }
});

app.post('/athletes', (req, res) => {
  try {
    const {
      first_name,
      last_name,
      birth_year,
      primary_stroke,
      best_event,
      personal_best,
      personal_best_unit,
      focus_note,
      team_id,
    } = req.body || {};

    const required = [first_name, last_name, birth_year, primary_stroke, best_event, team_id];
    if (required.some((value) => value === undefined || value === null || value === '')) {
      res.status(400).json({ detail: 'Pflichtfelder fehlen für die Erstellung der Athlet:in' });
      return;
    }

    const birthYearNumber = Number(birth_year);
    if (!Number.isInteger(birthYearNumber)) {
      res.status(400).json({ detail: 'Geburtsjahr muss eine Ganzzahl sein' });
      return;
    }

    let personalBestNumber = null;
    if (personal_best !== undefined && personal_best !== null && personal_best !== '') {
      personalBestNumber = Number(personal_best);
      if (!Number.isFinite(personalBestNumber)) {
        res.status(400).json({ detail: 'Bestzeit muss eine Zahl sein' });
        return;
      }
    }

    const payload = {
      first_name: String(first_name).trim(),
      last_name: String(last_name).trim(),
      birth_year: birthYearNumber,
      primary_stroke: String(primary_stroke).trim(),
      best_event: String(best_event).trim(),
      personal_best: personalBestNumber,
      personal_best_unit:
        personal_best_unit === undefined || personal_best_unit === null || personal_best_unit === ''
          ? null
          : String(personal_best_unit).trim(),
      focus_note:
        focus_note === undefined || focus_note === null || focus_note === ''
          ? null
          : String(focus_note).trim(),
      team_id: Number(team_id),
    };

    if (Number.isNaN(payload.team_id)) {
      res.status(400).json({ detail: 'team_id muss eine Zahl sein' });
      return;
    }

    const created = repositories.createAthlete(payload);
    res.status(201).json(created);
  } catch (error) {
    if (error.code === 'TEAM_NOT_FOUND') {
      res.status(400).json({ detail: 'Team nicht gefunden' });
      return;
    }
    res.status(500).json({ detail: 'Athlet:in konnte nicht erstellt werden', error: error.message });
  }
});

app.patch('/athletes/:athleteId', (req, res) => {
  try {
    const athleteId = Number(req.params.athleteId);
    if (Number.isNaN(athleteId)) {
      res.status(400).json({ detail: 'Ungültige Athlet:innen-ID' });
      return;
    }

    const updates = {};
    const {
      first_name,
      last_name,
      birth_year,
      primary_stroke,
      best_event,
      personal_best,
      personal_best_unit,
      focus_note,
      team_id,
    } = req.body || {};

    if (first_name !== undefined) {
      updates.first_name = String(first_name).trim();
    }
    if (last_name !== undefined) {
      updates.last_name = String(last_name).trim();
    }
    if (birth_year !== undefined) {
      const birthYearNumber = Number(birth_year);
      if (!Number.isInteger(birthYearNumber)) {
        res.status(400).json({ detail: 'Geburtsjahr muss eine Ganzzahl sein' });
        return;
      }
      updates.birth_year = birthYearNumber;
    }
    if (primary_stroke !== undefined) {
      updates.primary_stroke = String(primary_stroke).trim();
    }
    if (best_event !== undefined) {
      updates.best_event = String(best_event).trim();
    }
    if (personal_best !== undefined) {
      if (personal_best === null || personal_best === '') {
        updates.personal_best = null;
      } else {
        const personalBestNumber = Number(personal_best);
        if (!Number.isFinite(personalBestNumber)) {
          res.status(400).json({ detail: 'Bestzeit muss eine Zahl sein' });
          return;
        }
        updates.personal_best = personalBestNumber;
      }
    }
    if (personal_best_unit !== undefined) {
      updates.personal_best_unit =
        personal_best_unit === null || personal_best_unit === ''
          ? null
          : String(personal_best_unit).trim();
    }
    if (focus_note !== undefined) {
      updates.focus_note = focus_note === null || focus_note === '' ? null : String(focus_note).trim();
    }
    if (team_id !== undefined) {
      const teamIdNumber = Number(team_id);
      if (Number.isNaN(teamIdNumber)) {
        res.status(400).json({ detail: 'team_id muss eine Zahl sein' });
        return;
      }
      updates.team_id = teamIdNumber;
    }

    const updated = repositories.updateAthlete(athleteId, updates);
    if (!updated) {
      res.status(404).json({ detail: 'Athlet:in nicht gefunden' });
      return;
    }
    res.json(updated);
  } catch (error) {
    if (error.code === 'TEAM_NOT_FOUND') {
      res.status(400).json({ detail: 'Team nicht gefunden' });
      return;
    }
    res.status(500).json({ detail: 'Athlet:in konnte nicht aktualisiert werden', error: error.message });
  }
});

app.delete('/athletes/:athleteId', (req, res) => {
  try {
    const athleteId = Number(req.params.athleteId);
    if (Number.isNaN(athleteId)) {
      res.status(400).json({ detail: 'Ungültige Athlet:innen-ID' });
      return;
    }

    const deleted = repositories.deleteAthlete(athleteId);
    if (!deleted) {
      res.status(404).json({ detail: 'Athlet:in nicht gefunden' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ detail: 'Athlet:in konnte nicht gelöscht werden', error: error.message });
  }
});

app.get('/sessions', (req, res) => {
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
    if (req.query.status !== undefined) {
      filters.status = req.query.status;
    }
    if (req.query.with_attendance !== undefined) {
      const flag = String(req.query.with_attendance).toLowerCase();
      filters.includeAttendance = flag !== '0' && flag !== 'false' && flag !== 'no';
    }
    res.json(repositories.fetchSessions(filters));
  } catch (error) {
    res.status(500).json({ detail: 'Sessions konnten nicht geladen werden', error: error.message });
  }
});

app.get('/sessions/:sessionId', (req, res) => {
  try {
    const session = repositories.fetchSession(Number(req.params.sessionId));
    if (!session) {
      res.status(404).json({ detail: 'Trainingseinheit nicht gefunden' });
      return;
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ detail: 'Trainingseinheit konnte nicht geladen werden', error: error.message });
  }
});

app.delete('/sessions/:sessionId', (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);
    if (Number.isNaN(sessionId)) {
      res.status(400).json({ detail: 'Ungültige Session-ID' });
      return;
    }

    const deleted = repositories.deleteSession(sessionId);
    if (!deleted) {
      res.status(404).json({ detail: 'Trainingseinheit nicht gefunden' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ detail: 'Trainingseinheit konnte nicht gelöscht werden', error: error.message });
  }
});

app.patch('/sessions/:sessionId', (req, res) => {
  try {
    const updated = repositories.updateSession(Number(req.params.sessionId), req.body || {});
    if (!updated) {
      res.status(404).json({ detail: 'Trainingseinheit nicht gefunden' });
      return;
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ detail: 'Trainingseinheit konnte nicht aktualisiert werden', error: error.message });
  }
});

app.post('/sessions', (req, res) => {
  try {
    const {
      team_id,
      title,
      session_date,
      start_time,
      duration_minutes,
      status,
      focus_area,
      load_target,
      load_actual,
      notes,
    } = req.body || {};
    const required = [team_id, title, session_date, start_time, duration_minutes, status, focus_area, load_target];
    if (required.some((value) => value === undefined || value === null || value === '')) {
      res.status(400).json({ detail: 'Pflichtfelder fehlen für die Erstellung der Einheit' });
      return;
    }
    const created = repositories.createSession({
      team_id,
      title,
      session_date,
      start_time,
      duration_minutes,
      status,
      focus_area,
      load_target,
      load_actual,
      notes,
    });
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ detail: 'Trainingseinheit konnte nicht angelegt werden', error: error.message });
  }
});

app.post('/sessions/:sessionId/duplicate', (req, res) => {
  try {
    const duplicated = repositories.duplicateSession(Number(req.params.sessionId), req.body || {});
    if (!duplicated) {
      res.status(404).json({ detail: 'Ausgangseinheit nicht gefunden' });
      return;
    }
    res.status(201).json(duplicated);
  } catch (error) {
    res.status(500).json({ detail: 'Trainingseinheit konnte nicht dupliziert werden', error: error.message });
  }
});

app.post('/sessions/:sessionId/attendance', (req, res) => {
  try {
    const entries = Array.isArray(req.body) ? req.body : [];
    if (!entries.length) {
      res.status(400).json({ detail: 'Keine Einträge übermittelt' });
      return;
    }
    repositories.upsertAttendance(Number(req.params.sessionId), entries);
    const session = repositories.fetchSession(Number(req.params.sessionId));
    if (!session) {
      res.status(404).json({ detail: 'Trainingseinheit nicht gefunden' });
      return;
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ detail: 'Anwesenheit konnte nicht gespeichert werden', error: error.message });
  }
});

app.get('/reports', (req, res) => {
  try {
    res.json(repositories.fetchReports());
  } catch (error) {
    res.status(500).json({ detail: 'Reports konnten nicht geladen werden', error: error.message });
  }
});

app.post('/notes', (req, res) => {
  try {
    const body = req.body && req.body.body;
    if (!body || !body.trim()) {
      res.status(400).json({ detail: 'Notiz darf nicht leer sein' });
      return;
    }
    const note = repositories.saveNote(body.trim());
    res.json(note);
  } catch (error) {
    res.status(500).json({ detail: 'Notiz konnte nicht gespeichert werden', error: error.message });
  }
});

app.get('/metrics', (req, res) => {
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
});

app.get('/metrics/:metricId', (req, res) => {
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
});

app.post('/metrics', (req, res) => {
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
});

app.patch('/metrics/:metricId', (req, res) => {
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
});

app.delete('/metrics/:metricId', (req, res) => {
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
});

app.post('/teams', (req, res) => {
  try {
    const { name, short_name, level, coach, training_days, focus_theme } = req.body || {};
    const required = [name, short_name, level, coach, training_days, focus_theme];
    if (required.some((value) => value === undefined || value === null || value === '')) {
      res.status(400).json({ detail: 'Pflichtfelder fehlen für die Erstellung des Teams' });
      return;
    }
    const team = repositories.createTeam({
      name,
      short_name,
      level,
      coach,
      training_days,
      focus_theme,
    });
    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ detail: 'Team konnte nicht erstellt werden', error: error.message });
  }
});

app.patch('/teams/:teamId', (req, res) => {
  try {
    const updated = repositories.updateTeam(Number(req.params.teamId), req.body || {});
    if (!updated) {
      res.status(404).json({ detail: 'Team nicht gefunden' });
      return;
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ detail: 'Team konnte nicht aktualisiert werden', error: error.message });
  }
});

app.delete('/teams/:teamId', (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    if (Number.isNaN(teamId)) {
      res.status(400).json({ detail: 'Ungültige Team-ID' });
      return;
    }

    const forceParam = req.query.force;
    const force =
      typeof forceParam === 'string'
        ? ['1', 'true', 'yes', 'on'].includes(forceParam.toLowerCase())
        : forceParam === true;

    const result = repositories.deleteTeam(teamId, { force });
    if (!result.found) {
      res.status(404).json({ detail: 'Team nicht gefunden' });
      return;
    }
    if (!result.deleted) {
      res
        .status(409)
        .json({
          detail: 'Team kann nicht gelöscht werden, es existieren noch Zuordnungen',
          dependencies: result.dependencies,
        });
      return;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ detail: 'Team konnte nicht gelöscht werden', error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ detail: 'Endpunkt nicht gefunden' });
});

const server = app.listen(config.port, config.host, () => {
  console.log(`SwimTrack API läuft auf ${config.host}:${config.port}`);
});

function shutdown(signal) {
  console.log(`Signal ${signal} empfangen – server fährt herunter.`);
  server.close(() => {
    closeDatabase();
    console.log('HTTP-Server gestoppt. Beende Prozess.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Erzwungener Shutdown nach Timeout.');
    process.exit(1);
  }, config.shutdown.timeoutMs).unref();
}

['SIGTERM', 'SIGINT'].forEach((signal) => {
  process.on(signal, () => shutdown(signal));
});
