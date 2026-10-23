import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validate } from '../../middlewares/validate.js';
import { verifyCsrfOrigin } from '../../middlewares/csrf.js';
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

export default router;
