#!/usr/bin/env node
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const repositories = require('./repositories');
const { seedDatabase } = require('./seed');

seedDatabase({ onlyIfEmpty: true });

const app = express();
app.use(cors());
app.use(express.json());

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

app.use((req, res) => {
  res.status(404).json({ detail: 'Endpunkt nicht gefunden' });
});

const PORT = Number(process.env.PORT) || 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`SwimTrack API läuft auf Port ${PORT}`);
});
