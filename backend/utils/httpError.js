function createHttpError(status, detail, meta) {
  const error = new Error(detail);
  error.status = status;
  error.detail = detail;
  if (meta !== undefined) {
    error.meta = meta;
  }
  return error;
}

module.exports = { createHttpError };
