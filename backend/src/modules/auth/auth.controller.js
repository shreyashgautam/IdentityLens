import * as authService from './auth.service.js';
import { successResponse } from '../../helpers/response.helper.js';
import { env } from '../../config/env.js';

/**
 * Authentication Controller
 * Handles HTTP requests, sets secure HttpOnly cookies, and returns API responses.
 * Conforms to Milestone 6 Phase 1 Specification.
 */

/**
 * POST /api/v1/auth/firebase/exchange
 * Exchanges a Firebase ID token for an IdentityLens access JWT and HttpOnly refresh cookie.
 */
export const exchange = async (req, res, next) => {
  try {
    const { idToken } = req.validatedBody || req.body;
    const userAgent = req.headers['user-agent'] || null;
    const ipAddress = req.ip || req.socket?.remoteAddress || null;

    const {
      accessToken,
      expiresIn,
      user,
      rawRefreshToken,
      expiresAt
    } = await authService.exchangeFirebaseToken({
      idToken,
      userAgent,
      ipAddress
    });

    // Set refresh token strictly as an HttpOnly; Secure; SameSite=Lax cookie
    res.cookie('refresh_token', rawRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
      expires: expiresAt
    });

    // Never return the refresh token in the JSON response body
    return successResponse(res, {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user
    }, { status: 200 });
  } catch (error) {
    next(error);
  }
};
