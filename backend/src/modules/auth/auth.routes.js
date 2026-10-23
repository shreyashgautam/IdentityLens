import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validate } from '../../middlewares/validate.js';
import { verifyCsrfOrigin } from '../../middlewares/csrf.js';
import { authenticate } from '../../middlewares/auth.js';
import { exchangeBodySchema } from './auth.validation.js';

const router = Router();

/**
 * POST /api/v1/auth/firebase/exchange
 * Exchanges a validated Firebase ID token for IdentityLens access JWT and HttpOnly refresh cookie.
 * Protected by Origin/CSRF verification and strict Zod payload validation.
 */
router.post(
  '/firebase/exchange',
  verifyCsrfOrigin,
  validate({ body: exchangeBodySchema }),
  authController.exchange
);

/**
 * POST /api/v1/auth/refresh
 * Rotates the refresh token and issues a new access JWT.
 * Protected by Origin/CSRF verification and strict single-use replay defense.
 */
router.post(
  '/refresh',
  verifyCsrfOrigin,
  authController.refresh
);

/**
 * POST /api/v1/auth/logout
 * Revokes the active session and clears the refresh cookie.
 */
router.post(
  '/logout',
  verifyCsrfOrigin,
  authController.logout
);

/**
 * POST /api/v1/auth/revoke-all
 * Revokes all sessions belonging to the authenticated user and increments token_version.
 * Requires authenticated access JWT.
 */
router.post(
  '/revoke-all',
  verifyCsrfOrigin,
  authenticate,
  authController.revokeAll
);

export default router;
