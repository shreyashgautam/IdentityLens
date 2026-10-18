import { errorResponse } from '../helpers/response.helper.js';

/**
 * 404 Not Found Middleware
 * Conforms to docs/api-contract.md Section 13.2
 */
export const notFoundMiddleware = (req, res) => {
  return errorResponse(res, {
    status: 404,
    code: 'NOT_FOUND',
    message: `Resource not found: Cannot ${req.method} ${req.originalUrl}`,
    req
  });
};
