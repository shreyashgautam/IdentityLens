import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { getClient, query } from '../../database/connection.js';
import { verifyFirebaseIdToken } from '../../config/firebase.js';
import * as authRepo from './auth.repository.js';

let sessionCreationInterceptor = null;

export const _setSessionCreationInterceptor = (fn) => {
  sessionCreationInterceptor = fn;
};

/**
 * Exchange Firebase ID token for IdentityLens access JWT and HttpOnly refresh token
 * 
 * @param {Object} params
 * @param {string} params.idToken - Raw Firebase ID token
 * @param {string|null} params.userAgent - Client User-Agent header
 * @param {string|null} params.ipAddress - Client IP address
 * @returns {Promise<{ accessToken: string, expiresIn: number, user: Object, rawRefreshToken: string, expiresAt: Date }>}
 */
export const exchangeFirebaseToken = async ({ idToken, userAgent = null, ipAddress = null }) => {
  // 1. Verify Firebase ID token cryptographically
  const firebaseData = await verifyFirebaseIdToken(idToken);
  const { uid, email, emailVerified, provider, tokensValidAfterTime } = firebaseData;

  // 2. Reject missing provider email
  if (!email || typeof email !== 'string' || email.trim() === '') {
    const error = new Error('Provider did not supply a valid email address. An email identifier is required.');
    error.status = 422;
    error.code = 'EMAIL_REQUIRED_FROM_PROVIDER';
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 3. Reconcile user and create session inside an atomic transaction
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Look up existing user by Firebase UID with exclusive row-level lock
    let user = await authRepo.findUserByFirebaseUidForUpdate(client, uid);

    if (user) {
      // User exists by UID: check for confirmed password-reset event
      if (tokensValidAfterTime && user.firebase_tokens_valid_after) {
        const currentCutoff = new Date(tokensValidAfterTime).getTime();
        const storedCutoff = new Date(user.firebase_tokens_valid_after).getTime();

        if (currentCutoff > storedCutoff) {
          // Confirmed password reset event: revoke all previous sessions and advance token_version
          await client.query(
            'UPDATE user_sessions SET is_revoked = TRUE WHERE user_id = $1 AND is_revoked = FALSE',
            [user.id]
          );

          user = await authRepo.updateUser(client, user.id, {
            tokenVersion: user.token_version + 1,
            firebaseTokensValidAfter: tokensValidAfterTime
          });

          await authRepo.createAuditLog(client, {
            action: 'PASSWORD_RESET_CONFIRMED',
            userId: user.id,
            operator: 'firebase_auth',
            details: { reason: 'tokensValidAfterTime advanced' },
            ipAddress
          });
        }
      }

      // Sync updated provider metadata if changed
      const updates = {};
      if (user.email !== normalizedEmail) updates.email = normalizedEmail;
      if (user.email_verified !== emailVerified) updates.emailVerified = emailVerified;
      if (!user.firebase_tokens_valid_after && tokensValidAfterTime) {
        updates.firebaseTokensValidAfter = tokensValidAfterTime;
      }

      if (Object.keys(updates).length > 0) {
        user = await authRepo.updateUser(client, user.id, updates);
      }
    } else {
      // User does not exist by UID: check if normalized email already exists (Zero Auto-Merge Policy)
      const existingEmailUser = await authRepo.findUserByEmail(client, normalizedEmail);
      if (existingEmailUser) {
        const conflictError = new Error(
          'An account with this email already exists under a different identity provider. Account auto-merging is prohibited.'
        );
        conflictError.status = 409;
        conflictError.code = 'IDENTITY_CONFLICT';
        throw conflictError;
      }

      // Provision new user (defaults to role: 'viewer', token_version: 1)
      user = await authRepo.createUser(client, {
        firebaseUid: uid,
        email: normalizedEmail,
        provider,
        emailVerified,
        firebaseTokensValidAfter: tokensValidAfterTime
      });

      await authRepo.createAuditLog(client, {
        action: 'USER_REGISTERED',
        userId: user.id,
        operator: 'self_registration',
        details: { provider, email: normalizedEmail, role: 'viewer' },
        ipAddress
      });
    }

    // 4. Generate cryptographically secure opaque refresh token (256-bit entropy, bound to session ID)
    const sessionId = crypto.randomUUID();
    const rawSecret = crypto.randomBytes(32).toString('hex');
    const rawRefreshToken = `${sessionId}.${rawSecret}`;
    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    // Optional test hook for simulating session creation failure
    if (sessionCreationInterceptor) {
      await sessionCreationInterceptor(client);
    }

    // 5. Create logical device session
    const session = await authRepo.createSession(client, {
      id: sessionId,
      userId: user.id,
      currentRefreshTokenHash: refreshTokenHash,
      userAgent,
      ipAddress,
      expiresAt
    });

    // Commit transaction
    await client.query('COMMIT');

    // 6. Sign short-lived IdentityLens access JWT (15m default)
    const jwtPayload = {
      sub: user.id,
      sid: session.id,
      utv: user.token_version,
      role: user.role,
      email: user.email,
      email_verified: user.email_verified,
      provider: user.provider
    };

    const accessToken = jwt.sign(jwtPayload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN
    });

    return {
      accessToken,
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.email_verified,
        provider: user.provider
      },
      rawRefreshToken,
      expiresAt
    };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      // Ignore rollback errors
    }
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Rotate refresh token with strict row-level locking, replay detection, and session family revocation.
 * Conforms to Milestone 6 Phase 1 Stage C Specification.
 * 
 * @param {Object} params
 * @param {string} params.rawRefreshToken - Raw incoming refresh token from HttpOnly cookie
 * @param {string|null} params.ipAddress - Client IP address
 * @returns {Promise<{ accessToken: string, expiresIn: number, rawRefreshToken: string, expiresAt: Date }>}
 */
export const rotateRefreshToken = async ({ rawRefreshToken, ipAddress = null }) => {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string' || rawRefreshToken.trim() === '') {
    const error = new Error('Refresh token is required. No refresh token cookie was provided.');
    error.status = 401;
    error.code = 'NO_REFRESH_TOKEN';
    throw error;
  }

  const incomingHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  const client = await getClient();
  try {
    await client.query('BEGIN');

    let sessionRecord = null;
    let explicitSessionId = null;

    if (rawRefreshToken.includes('.')) {
      explicitSessionId = rawRefreshToken.split('.')[0];
      sessionRecord = await authRepo.findSessionByIdForUpdate(client, explicitSessionId);
    }

    if (!sessionRecord) {
      sessionRecord = await authRepo.findSessionByTokenHashForUpdate(client, incomingHash);
    }

    // If session not found by active hash or ID, check if it is a replayed consumed token
    if (!sessionRecord) {
      const consumed = explicitSessionId
        ? await authRepo.findConsumedToken(client, explicitSessionId, incomingHash)
        : await authRepo.findConsumedTokenByHash(client, incomingHash);

      if (consumed) {
        // REPLAY DETECTED: Revoke the entire affected session family immediately
        const sRes = await client.query('SELECT user_id FROM user_sessions WHERE id = $1', [consumed.session_id]);
        const sUserId = sRes.rows[0]?.user_id || null;

        await authRepo.revokeSession(client, consumed.session_id);
        await authRepo.createAuditLog(client, {
          action: 'REFRESH_TOKEN_REPLAY_ATTACK',
          userId: sUserId,
          operator: 'replay_defense',
          details: { sessionId: consumed.session_id, reason: 'Consumed token replayed' },
          ipAddress
        });
        await client.query('COMMIT');

        const error = new Error('Refresh token reuse detected. The session has been revoked for security.');
        error.status = 401;
        error.code = 'SESSION_REVOKED_REPLAY';
        throw error;
      }

      await client.query('ROLLBACK');
      const error = new Error('Invalid or unrecognized refresh token.');
      error.status = 401;
      error.code = 'INVALID_REFRESH_TOKEN';
      throw error;
    }

    // Session exists: check revocation state
    if (sessionRecord.session_revoked) {
      await client.query('ROLLBACK');
      const error = new Error('This session has been revoked.');
      error.status = 401;
      error.code = 'SESSION_REVOKED';
      throw error;
    }

    // Session expiration check
    if (new Date(sessionRecord.session_expires_at) <= new Date()) {
      await client.query('ROLLBACK');
      const error = new Error('This session has expired. Please sign in again.');
      error.status = 401;
      error.code = 'SESSION_EXPIRED';
      throw error;
    }

    // User active check
    if (!sessionRecord.is_active) {
      await client.query('ROLLBACK');
      const error = new Error('User account is inactive.');
      error.status = 401;
      error.code = 'USER_INACTIVE';
      throw error;
    }

    // Check if the presented token matches the session's active token hash
    if (sessionRecord.current_refresh_token_hash !== incomingHash) {
      // It does not match the active hash. Check if it was consumed previously:
      const consumed = await authRepo.findConsumedToken(client, sessionRecord.session_id, incomingHash);
      if (consumed) {
        // REPLAY DETECTED: Revoke the entire session family immediately
        await authRepo.revokeSession(client, sessionRecord.session_id);
        await authRepo.createAuditLog(client, {
          action: 'REFRESH_TOKEN_REPLAY_ATTACK',
          userId: sessionRecord.user_id,
          operator: 'replay_defense',
          details: { sessionId: sessionRecord.session_id, reason: 'Previously consumed token replayed' },
          ipAddress
        });
        await client.query('COMMIT');

        const error = new Error('Refresh token reuse detected. The session has been revoked for security.');
        error.status = 401;
        error.code = 'SESSION_REVOKED_REPLAY';
        throw error;
      }

      await client.query('ROLLBACK');
      const error = new Error('Invalid refresh token.');
      error.status = 401;
      error.code = 'INVALID_REFRESH_TOKEN';
      throw error;
    }

    // Valid Active Token: Perform Strict Single-Use Rotation
    // 1. Move old active hash into consumed history
    await authRepo.recordConsumedToken(client, sessionRecord.session_id, incomingHash);

    // 2. Generate new refresh token for this session
    const newSecret = crypto.randomBytes(32).toString('hex');
    const newRawRefreshToken = `${sessionRecord.session_id}.${newSecret}`;
    const newHash = crypto.createHash('sha256').update(newRawRefreshToken).digest('hex');
    const newExpiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    // 3. Atomically update session with new hash and extended expiration
    await authRepo.rotateSessionToken(client, sessionRecord.session_id, newHash, newExpiresAt);

    // Commit transaction
    await client.query('COMMIT');

    // 4. Issue new access JWT
    const jwtPayload = {
      sub: sessionRecord.user_id,
      sid: sessionRecord.session_id,
      utv: sessionRecord.token_version,
      role: sessionRecord.role,
      email: sessionRecord.email,
      email_verified: sessionRecord.email_verified,
      provider: sessionRecord.provider
    };

    const accessToken = jwt.sign(jwtPayload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN
    });

    return {
      accessToken,
      expiresIn: 900,
      rawRefreshToken: newRawRefreshToken,
      expiresAt: newExpiresAt
    };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      // Ignore rollback errors
    }
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Single-session logout: Revokes the specified session and returns confirmation.
 * 
 * @param {Object} params
 * @param {string|null} params.sessionId - Session ID to revoke
 * @param {string|null} params.rawRefreshToken - Optional raw refresh token from cookie
 * @param {string|null} params.ipAddress - Client IP address
 */
export const logoutSession = async ({ sessionId = null, rawRefreshToken = null, ipAddress = null }) => {
  let targetSessionId = sessionId;

  if (!targetSessionId && rawRefreshToken) {
    if (rawRefreshToken.includes('.')) {
      targetSessionId = rawRefreshToken.split('.')[0];
    } else {
      const hash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      const session = await authRepo.findSessionByTokenHashForUpdate(getClient(), hash);
      if (session) targetSessionId = session.session_id;
    }
  }

  if (targetSessionId) {
    const sRes = await query('SELECT user_id FROM user_sessions WHERE id = $1', [targetSessionId]);
    const sUserId = sRes.rows[0]?.user_id || null;

    await authRepo.revokeSession({ query }, targetSessionId);
    await authRepo.createAuditLog({ query }, {
      action: 'USER_LOGOUT',
      userId: sUserId,
      operator: 'user_logout',
      details: { sessionId: targetSessionId },
      ipAddress
    });
  }

  return { success: true, message: 'Logged out successfully' };
};

/**
 * User-wide session revocation: Atomically revokes all sessions and increments user token_version.
 * 
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string|null} params.ipAddress - Client IP address
 */
export const revokeAllUserSessions = async ({ userId, ipAddress = null }) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Acquire exclusive row lock on user record
    await client.query('SELECT id, token_version FROM users WHERE id = $1 FOR UPDATE', [userId]);

    // 1. Revoke all active sessions belonging to the user
    await authRepo.revokeAllUserSessions(client, userId);

    // 2. Increment user token_version to invalidate all existing access JWTs immediately
    const updatedUser = await authRepo.advanceUserTokenVersion(client, userId);

    // 3. Log security audit
    await authRepo.createAuditLog(client, {
      action: 'USER_SESSIONS_REVOKED_ALL',
      userId,
      operator: 'user_self_revocation',
      details: { newTokenVersion: updatedUser.token_version },
      ipAddress
    });

    await client.query('COMMIT');

    return { success: true, message: 'All sessions have been revoked successfully' };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      // Ignore rollback errors
    }
    throw err;
  } finally {
    client.release();
  }
};
