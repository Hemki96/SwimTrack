#!/usr/bin/env node
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const { getDatabase, closeDatabase } = require('./db');
const { seedDatabase } = require('./seed');
const athletesRouter = require('./routes/athletes');
const sessionsRouter = require('./routes/sessions');
const teamsRouter = require('./routes/teams');
const metricsRouter = require('./routes/metrics');
const reportsRouter = require('./routes/reports');
const notesRouter = require('./routes/notes');
const dashboardRouter = require('./routes/dashboard');
const errorHandler = require('./middleware/errorHandler');
const { createHttpError } = require('./utils/httpError');

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

app.use('/dashboard', dashboardRouter);
app.use('/teams', teamsRouter);
app.use('/athletes', athletesRouter);
app.use('/sessions', sessionsRouter);
app.use('/reports', reportsRouter);
app.use('/notes', notesRouter);
app.use('/metrics', metricsRouter);

app.use((req, res, next) => {
  next(createHttpError(404, 'Endpunkt nicht gefunden'));
});

app.use(errorHandler);

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
