import cors from 'cors';
import { env } from '../config/env.js';

/**
 * CORS Middleware
 * Conforms to docs/api-contract.md Section 10.1 & security/threat-model.md T-06
 */
export const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const normalize = (url) => url.replace(/\/$/, '');
  if (normalize(origin) === normalize(env.CORS_ORIGIN)) return true;
  if (env.NODE_ENV === 'development' && /^http:\/\/localhost:\d+$/.test(origin)) {
    return true;
  }
  return false;
};

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
});
