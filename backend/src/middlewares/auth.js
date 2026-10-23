import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../database/connection.js';
import { errorResponse } from '../helpers/response.helper.js';

/**
 * Authentication Middleware
 * Validates access JWT claims and checks real-time database session and user state.
 * Conforms to docs/api-contract.md Section 14 & Milestone 6 Phase 1 Specification.
 */
export const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return errorResponse(res, {
      status: 401,
      code: 'MISSING_TOKEN',
      message: 'Authentication token is required. Please provide a valid Bearer token.',
      req
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return errorResponse(res, {
      status: 401,
      code: 'MALFORMED_TOKEN',
      message: 'Authorization header must use Bearer scheme.',
      req
    });
  }

  const token = authHeader.slice(7).trim();

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, {
        status: 401,
        code: 'TOKEN_EXPIRED',
        message: 'Access token has expired. Please refresh your session.',
        req
      });
    }

    return errorResponse(res, {
      status: 401,
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token.',
      req
    });
  }

  // Validate required claims in JWT payload
  if (!decoded.sub || !decoded.sid || decoded.utv === undefined) {
    return errorResponse(res, {
      status: 401,
      code: 'INVALID_TOKEN',
      message: 'Token payload missing required identity claims.',
      req
    });
  }

  try {
    // Validate session existence, revocation state, expiry, and user active status directly in PostgreSQL
    const sql = `
      SELECT u.id AS user_id, u.email, u.provider, u.role, u.email_verified, u.is_active, u.token_version,
             s.id AS session_id, s.is_revoked AS session_revoked, s.expires_at AS session_expires_at
      FROM users u
      JOIN user_sessions s ON s.id = $1 AND s.user_id = u.id
      WHERE u.id = $2
      LIMIT 1;
    `;
    const { rows } = await query(sql, [decoded.sid, decoded.sub]);

    if (rows.length === 0) {
      return errorResponse(res, {
        status: 401,
        code: 'SESSION_NOT_FOUND',
        message: 'The session referenced by this token does not exist or has been deleted.',
        req
      });
    }

    const sessionRecord = rows[0];

    // Account active check
    if (!sessionRecord.is_active) {
      return errorResponse(res, {
        status: 401,
        code: 'USER_INACTIVE',
        message: 'User account is inactive or has been disabled.',
        req
      });
    }

    // Session revocation check
    if (sessionRecord.session_revoked) {
      return errorResponse(res, {
        status: 401,
        code: 'SESSION_REVOKED',
        message: 'This session has been revoked. Please sign in again.',
        req
      });
    }

    // Session expiration check
    if (new Date(sessionRecord.session_expires_at) <= new Date()) {
      return errorResponse(res, {
        status: 401,
        code: 'SESSION_EXPIRED',
        message: 'This session has expired. Please sign in again.',
        req
      });
    }

    // User-wide token version check (catches revoke-all or password-reset events)
    if (decoded.utv !== sessionRecord.token_version) {
      return errorResponse(res, {
        status: 401,
        code: 'TOKEN_REVOKED',
        message: 'Access token was invalidated by a recent security event.',
        req
      });
    }

    // Attach authenticated identity and session context to request
    req.user = {
      id: sessionRecord.user_id,
      email: sessionRecord.email,
      provider: sessionRecord.provider,
      role: sessionRecord.role,
      emailVerified: sessionRecord.email_verified
    };
    req.sessionId = sessionRecord.session_id;

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Email Verification Policy Middleware
 * Enforces provider-specific access restrictions on protected inventory data.
 * 
 * - Password accounts: Strictly requires email_verified = true
 * - Google accounts: Domain ownership verified by Google (admitted)
 * - GitHub accounts: Admitted without separate email verification workflow per product policy
 */
export const requireVerifiedEmail = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return errorResponse(res, {
      status: 401,
      code: 'MISSING_TOKEN',
      message: 'Authentication token is required.',
      req
    });
  }

  // Google and GitHub identities are admitted per policy
  if (user.provider === 'google.com' || user.provider === 'github.com') {
    return next();
  }

  // Email/password accounts must be verified
  if (!user.emailVerified) {
    return errorResponse(res, {
      status: 403,
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Email verification is required before accessing inventory data. Please verify your email via the link sent to your inbox.',
      req
    });
  }

  next();
};
