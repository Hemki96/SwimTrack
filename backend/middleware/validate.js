class ValidationError extends Error {
  constructor(issues) {
    super('Validation error');
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

function runValidator(validator, value, target) {
  if (typeof validator !== 'function') {
    throw new TypeError(`Validator for ${target} muss eine Funktion sein`);
  }
  return validator(value);
}

function validate({ body, params, query } = {}) {
  return (req, res, next) => {
    try {
      if (body) {
        req.body = runValidator(body, req.body, 'body');
      }
      if (params) {
        req.params = runValidator(params, req.params, 'params');
      }
      if (query) {
        req.query = runValidator(query, req.query, 'query');
      }
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          detail: 'Ungültige Anfrageparameter',
          errors: error.issues,
        });
        return;
      }
      next(error);
    }
  };
}

module.exports = validate;
module.exports.ValidationError = ValidationError;
