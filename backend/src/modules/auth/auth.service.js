import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { getClient } from '../../database/connection.js';
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

    // 4. Generate cryptographically secure opaque refresh token (256-bit entropy)
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    // Optional test hook for simulating session creation failure
    if (sessionCreationInterceptor) {
      await sessionCreationInterceptor(client);
    }

    // 5. Create logical device session
    const session = await authRepo.createSession(client, {
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
