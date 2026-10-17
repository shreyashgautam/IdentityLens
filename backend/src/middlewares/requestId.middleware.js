import crypto from 'crypto';

/**
 * Request Correlation ID Middleware
 * Conforms to docs/api-contract.md Section 17 & docs/architecture.md Section 6.2
 */
export const requestIdMiddleware = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};
