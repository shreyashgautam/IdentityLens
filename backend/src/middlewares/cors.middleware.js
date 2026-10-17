import cors from 'cors';
import { env } from '../config/env.js';

/**
 * CORS Middleware
 * Conforms to docs/api-contract.md Section 10.1 & security/threat-model.md T-06
 */
export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
});
