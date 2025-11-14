const { ValidationError } = require('../middleware/validate');

function addIssue(issues, path, message) {
  issues.push({ path, message });
}

function ensureRequiredString(source, field, issues, message) {
  const raw = source?.[field];
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    addIssue(issues, field, message);
    return undefined;
  }
  return String(raw).trim();
}

function ensureOptionalString(source, field, issues, message) {
  if (!(field in (source || {})) || source[field] === undefined) {
    return undefined;
  }
  const raw = source[field];
  if (raw === null || String(raw).trim() === '') {
    addIssue(issues, field, message);
    return undefined;
  }
  return String(raw).trim();
}

function ensureNullableString(source, field, issues, message) {
  if (!(field in (source || {})) || source[field] === undefined) {
    return undefined;
  }
  const raw = source[field];
  if (raw === null || raw === '') {
    return null;
  }
  if (String(raw).trim() === '') {
    addIssue(issues, field, message);
    return undefined;
  }
  return String(raw).trim();
}

function ensureRequiredInt(source, field, issues, message, { positive = false } = {}) {
  const raw = source?.[field];
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || (positive && parsed <= 0)) {
    addIssue(issues, field, message);
    return undefined;
  }
  return parsed;
}

function ensureOptionalInt(source, field, issues, message, { positive = false } = {}) {
  if (!(field in (source || {})) || source[field] === undefined) {
    return undefined;
  }
  const raw = source[field];
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || (positive && parsed <= 0)) {
    addIssue(issues, field, message);
    return undefined;
  }
  return parsed;
}

function ensureRequiredNumber(source, field, issues, message) {
  const raw = source?.[field];
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    addIssue(issues, field, message);
    return undefined;
  }
  return parsed;
}

function ensureOptionalNumber(source, field, issues, message) {
  if (!(field in (source || {})) || source[field] === undefined) {
    return undefined;
  }
  const raw = source[field];
  if (raw === null || raw === '') {
    addIssue(issues, field, message);
    return undefined;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    addIssue(issues, field, message);
    return undefined;
  }
  return parsed;
}

function ensureOptionalNumberOrNull(source, field, issues, message) {
  if (!(field in (source || {})) || source[field] === undefined) {
    return undefined;
  }
  const raw = source[field];
  if (raw === null || raw === '') {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    addIssue(issues, field, message);
    return undefined;
  }
  return parsed;
}

function ensureArray(value, path, issues, { min = 0 } = {}) {
  if (!Array.isArray(value)) {
    addIssue(issues, path, 'Muss ein Array sein');
    return [];
  }
  if (value.length < min) {
    addIssue(issues, path, `Mindestens ${min} Eintrag erforderlich`);
  }
  return value;
}

function parseBooleanFlag(value, defaultValue = undefined) {
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off', ''].includes(normalized)) {
      return false;
    }
  }
  return defaultValue;
}

function finalizeValidation(issues, result) {
  if (issues.length) {
    throw new ValidationError(issues);
  }
  return result;
}

module.exports = {
  addIssue,
  ensureRequiredString,
  ensureOptionalString,
  ensureNullableString,
  ensureRequiredInt,
  ensureOptionalInt,
  ensureRequiredNumber,
  ensureOptionalNumber,
  ensureOptionalNumberOrNull,
  ensureArray,
  parseBooleanFlag,
  finalizeValidation,
};
