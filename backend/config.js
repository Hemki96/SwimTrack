const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.join(__dirname, '..');
const DEFAULT_ENV_PATH = path.join(ROOT_DIR, '.env');
const envFile = process.env.SWIMTRACK_ENV_FILE || DEFAULT_ENV_PATH;

function loadEnvFile(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) {
    return;
  }
  const content = fs.readFileSync(targetPath, 'utf8');
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .forEach((line) => {
      if (!line || line.startsWith('#')) {
        return;
      }
      const exportPrefix = 'export ';
      const normalizedLine = line.startsWith(exportPrefix) ? line.slice(exportPrefix.length) : line;
      const separatorIndex = normalizedLine.indexOf('=');
      if (separatorIndex === -1) {
        return;
      }
      const key = normalizedLine.slice(0, separatorIndex).trim();
      if (!key) {
        return;
      }
      const rawValue = normalizedLine.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, '');
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    });
}

loadEnvFile(envFile);

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function parseNumber(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
}

function parseList(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

const DEFAULT_DB_PATH = path.join(ROOT_DIR, 'swimtrack.db');

function parseTrustProxy(value) {
  if (value === undefined || value === null) {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized.length === 0 || ['false', '0', 'off', 'no'].includes(normalized)) {
    return false;
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }
  if (['true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  return value;
}

const config = {
  rootDir: ROOT_DIR,
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '0.0.0.0',
  port: parseNumber(process.env.PORT, 8000),
  trustProxy: parseTrustProxy(process.env.SWIMTRACK_TRUST_PROXY),
  jsonBodyLimit: process.env.SWIMTRACK_JSON_LIMIT || '1mb',
  cors: {
    allowedOrigins: parseList(process.env.SWIMTRACK_ALLOWED_ORIGINS),
  },
  seed: {
    onStart: parseBoolean(process.env.SWIMTRACK_SEED_ON_START, false),
    onlyIfEmpty: parseBoolean(process.env.SWIMTRACK_SEED_ONLY_IF_EMPTY, true),
  },
  shutdown: {
    timeoutMs: parseNumber(process.env.SWIMTRACK_SHUTDOWN_TIMEOUT_MS, 10000),
  },
  databasePath: process.env.SWIMTRACK_DB_PATH || DEFAULT_DB_PATH,
};

if (!process.env.SWIMTRACK_DB_PATH) {
  process.env.SWIMTRACK_DB_PATH = config.databasePath;
}

module.exports = config;
