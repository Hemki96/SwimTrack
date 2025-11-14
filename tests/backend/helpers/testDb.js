const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '../../..');

function clearModule(modulePath) {
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      throw error;
    }
  }
}

function setupInMemoryDatabase() {
  process.env.SWIMTRACK_DB_PATH = ':memory:';

  clearModule(path.join(ROOT_DIR, 'backend/config.js'));
  clearModule(path.join(ROOT_DIR, 'backend/db.js'));
  clearModule(path.join(ROOT_DIR, 'backend/repositories.js'));
  clearModule(path.join(ROOT_DIR, 'backend/seed.js'));

  const dbModule = require(path.join(ROOT_DIR, 'backend/db.js'));
  const { seedDatabase } = require(path.join(ROOT_DIR, 'backend/seed.js'));
  seedDatabase({ reset: true });
  const repositories = require(path.join(ROOT_DIR, 'backend/repositories.js'));

  return {
    repositories,
    db: dbModule,
    cleanup() {
      dbModule.closeDatabase();
      clearModule(path.join(ROOT_DIR, 'backend/repositories.js'));
      clearModule(path.join(ROOT_DIR, 'backend/db.js'));
      clearModule(path.join(ROOT_DIR, 'backend/config.js'));
      clearModule(path.join(ROOT_DIR, 'backend/seed.js'));
    },
  };
}

module.exports = {
  setupInMemoryDatabase,
};
