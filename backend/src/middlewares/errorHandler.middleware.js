import { errorResponse } from '../helpers/response.helper.js';

/**
 * Centralized HTTP Error Handling Middleware
 * Conforms to docs/api-contract.md Section 13 & docs/architecture.md Section 7.14
 */
export const errorHandlerMiddleware = (err, req, res, next) => {
  const status = err.status || 500;
  const code = err.code || (status === 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
  const message = err.message || 'An unexpected server failure occurred';

  // Log error on server without leaking internal stack to client
  console.error(`[${req.id || 'NO_REQ_ID'}] ${err.name || 'Error'}: ${err.message}`);
  if (status === 500 && err.stack) {
    console.error(err.stack);
  }

  return errorResponse(res, {
    status,
    code,
    message,
    details: err.details || null,
    req
  });
};
