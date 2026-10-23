import { env } from '../config/env.js';

/**
 * CSRF / Origin Validation Middleware
 * Protects cookie-authenticated or sensitive state-changing endpoints against cross-site request forgery.
 * Conforms to docs/api-contract.md & security/threat-model.md
 */
export const verifyCsrfOrigin = (req, res, next) => {
  // Safe HTTP methods don't mutate state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.headers['origin'];
  const fetchSite = req.headers['sec-fetch-site'];

  // Defense-in-depth: Sec-Fetch-Site check
  if (fetchSite && fetchSite === 'cross-site') {
    const error = new Error('Cross-site requests are strictly prohibited.');
    error.status = 403;
    error.code = 'FORBIDDEN_ORIGIN';
    return next(error);
  }

  // If origin is present, it must match configured CORS_ORIGIN
  if (origin) {
    const normalize = (url) => url.replace(/\/$/, '');
    if (normalize(origin) !== normalize(env.CORS_ORIGIN)) {
      const error = new Error('Request origin is not allowed.');
      error.status = 403;
      error.code = 'FORBIDDEN_ORIGIN';
      return next(error);
    }
  }

  next();
};
