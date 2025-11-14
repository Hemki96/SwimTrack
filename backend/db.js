const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const config = require('./config');

const BASE_DIR = __dirname;
const DB_PATH = config.databasePath;

let instance;

function readSchema() {
  const schemaPath = path.join(BASE_DIR, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error('schema.sql nicht gefunden – Datenbank kann nicht initialisiert werden.');
  }
  return fs.readFileSync(schemaPath, 'utf8');
}

function initialiseSchema(db) {
  const schema = readSchema();
  db.exec(schema);
}

function getDatabase() {
  if (!instance) {
    const needsSetup = !fs.existsSync(DB_PATH);
    instance = new Database(DB_PATH);
    instance.pragma('foreign_keys = ON');
    instance.pragma('journal_mode = WAL');
    if (needsSetup) {
      initialiseSchema(instance);
    }
  }
  return instance;
}

function closeDatabase() {
  if (instance) {
    instance.close();
    instance = null;
  }
}

function resetDatabase() {
  closeDatabase();
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
  return getDatabase();
}

module.exports = {
  BASE_DIR,
  DB_PATH,
  getDatabase,
  initialiseSchema,
  closeDatabase,
  resetDatabase,
};
