/**
 * Zod Validation Middleware
 * Conforms to docs/api-contract.md Section 5.4 & docs/architecture.md Section 7.9
 *
 * @param {Object} schemas - Optional Zod schemas for { body, query, params }
 */
export const validate = (schemas = {}) => {
  return (req, res, next) => {
    const errors = [];

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        result.error.errors.forEach((err) => {
          errors.push({
            field: err.path.join('.'),
            message: err.message
          });
        });
      } else {
        req.validatedParams = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        result.error.errors.forEach((err) => {
          errors.push({
            field: err.path.join('.'),
            message: err.message
          });
        });
      } else {
        req.validatedQuery = result.data;
      }
    }

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        result.error.errors.forEach((err) => {
          errors.push({
            field: err.path.join('.'),
            message: err.message
          });
        });
      } else {
        req.validatedBody = result.data;
      }
    }

    if (errors.length > 0) {
      const validationError = new Error('The request contains invalid fields.');
      validationError.status = 422;
      validationError.code = 'VALIDATION_ERROR';
      validationError.details = errors;
      return next(validationError);
    }

    next();
  };
};
