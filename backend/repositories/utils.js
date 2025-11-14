const { getDatabase } = require('../db');

function getDb() {
  return getDatabase();
}

function createFilter(condition, ...params) {
  return { condition, params };
}

function buildWhereClause(filters = []) {
  if (!Array.isArray(filters) || filters.length === 0) {
    return { clause: '', params: [] };
  }

  const normalized = filters.filter((filter) => filter && filter.condition);
  if (!normalized.length) {
    return { clause: '', params: [] };
  }

  const clause = `AND ${normalized.map((filter) => filter.condition).join(' AND ')}`;
  const params = normalized.flatMap((filter) => filter.params || []);
  return { clause, params };
}

function createTransaction(handler) {
  const db = getDb();
  return db.transaction(handler);
}

module.exports = {
  getDb,
  createFilter,
  buildWhereClause,
  createTransaction,
};
