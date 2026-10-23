import jwt from 'jsonwebtoken';
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

/**
 * POST /api/v1/auth/refresh
 * Rotates the refresh token and returns a new short-lived access JWT.
 */
export const refresh = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.refresh_token;
    const ipAddress = req.ip || req.socket?.remoteAddress || null;

    try {
      const {
        accessToken,
        expiresIn,
        rawRefreshToken: newRawRefreshToken,
        expiresAt
      } = await authService.rotateRefreshToken({
        rawRefreshToken,
        ipAddress
      });

      // Set new rotated HttpOnly refresh cookie
      res.cookie('refresh_token', newRawRefreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth',
        expires: expiresAt
      });

      return successResponse(res, {
        accessToken,
        tokenType: 'Bearer',
        expiresIn
      }, { status: 200 });
    } catch (err) {
      // Clear cookie if session invalidation or replay occurred
      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth'
      });
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout
 * Revokes the active session and clears the refresh cookie.
 */
export const logout = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.refresh_token;
    let sessionId = req.sessionId || null;

    if (!sessionId && req.headers.authorization?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.decode(req.headers.authorization.split(' ')[1]);
        if (decoded?.sid) sessionId = decoded.sid;
      } catch (e) {
        // Ignore decode errors
      }
    }

    const ipAddress = req.ip || req.socket?.remoteAddress || null;

    // Clear refresh cookie immediately
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth'
    });

    const result = await authService.logoutSession({
      sessionId,
      rawRefreshToken,
      ipAddress
    });

    return successResponse(res, result, { status: 200 });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/revoke-all
 * Revokes all sessions for the authenticated user and increments token_version.
 */
export const revokeAll = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const ipAddress = req.ip || req.socket?.remoteAddress || null;

    // Clear refresh cookie immediately
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth'
    });

    const result = await authService.revokeAllUserSessions({
      userId,
      ipAddress
    });

    return successResponse(res, result, { status: 200 });
  } catch (error) {
    next(error);
  }
};
