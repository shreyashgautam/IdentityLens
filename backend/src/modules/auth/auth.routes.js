import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validate } from '../../middlewares/validate.js';
import { verifyCsrfOrigin } from '../../middlewares/csrf.js';
import { authenticate } from '../../middlewares/auth.js';
import { exchangeBodySchema, loginBodySchema, registerBodySchema, resendOtpBodySchema, verifyOtpBodySchema } from './auth.validation.js';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Registers a new organization and admin user, issuing access JWT and HttpOnly refresh cookie.
 */
router.post(
  '/register',
  verifyCsrfOrigin,
  validate({ body: registerBodySchema }),
  authController.register
);

/**
 * POST /api/v1/auth/login
 * Authenticates user with corporate email and password, issuing a 2FA MFA challenge.
 */
router.post(
  '/login',
  verifyCsrfOrigin,
  validate({ body: loginBodySchema }),
  authController.login
);

/**
 * POST /api/v1/auth/verify-otp
 * Validates 2FA OTP code and completes authentication session.
 */
router.post(
  '/verify-otp',
  verifyCsrfOrigin,
  validate({ body: verifyOtpBodySchema }),
  authController.verifyOtp
);

/**
 * POST /api/v1/auth/resend-otp
 * Resends a fresh 2FA OTP code to registered email address.
 */
router.post(
  '/resend-otp',
  verifyCsrfOrigin,
  validate({ body: resendOtpBodySchema }),
  authController.resendOtp
);

/**
 * GET /api/v1/auth/me
 * Retrieves current authenticated user context and active session details.
 */
router.get(
  '/me',
  authenticate,
  authController.me
);

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
