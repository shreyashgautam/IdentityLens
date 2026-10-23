import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';
import { query } from '../../src/database/connection.js';

// Safety guard: Test auth helper must never be executable in production
if (process.env.NODE_ENV === 'production') {
  throw new Error('Test authentication helper is strictly prohibited in production environments.');
}

/**
 * Creates a real test user and session in PostgreSQL and signs a valid access JWT.
 * 
 * @param {Object} options
 * @param {string} options.role - 'viewer' | 'admin' (default: 'viewer')
 * @param {boolean} options.emailVerified - default: true
 * @param {string} options.provider - 'google.com' | 'github.com' | 'password' (default: 'google.com')
 * @param {boolean} options.isActive - default: true
 * @param {string} options.email - optional custom email
 * @returns {Promise<{ user: Object, session: Object, token: string, rawRefreshToken: string, authHeaders: Object }>}
 */
export const createTestUserAndSession = async ({
  role = 'viewer',
  emailVerified = true,
  provider = 'google.com',
  isActive = true,
  email = null
} = {}) => {
  const testUid = `test-uid-${crypto.randomBytes(8).toString('hex')}`;
  const testEmail = email || `test-${crypto.randomBytes(6).toString('hex')}@identitylens.test`;

  // 1. Insert user
  const userSql = `
    INSERT INTO users (
      firebase_uid,
      email,
      provider,
      role,
      email_verified,
      is_active,
      token_version,
      tokens_valid_after,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, 1, NOW(), NOW(), NOW())
    RETURNING id, firebase_uid, email, provider, role, email_verified, is_active, token_version;
  `;
  const userRes = await query(userSql, [testUid, testEmail, provider, role, emailVerified, isActive]);
  const user = userRes.rows[0];

  // 2. Generate and hash refresh token (token format: <sessionId>.<random32Bytes>)
  const rawSecret = crypto.randomBytes(32).toString('hex');
  const tempSessionId = crypto.randomUUID();
  const rawRefreshToken = `${tempSessionId}.${rawSecret}`;
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  // 3. Insert session
  const sessionSql = `
    INSERT INTO user_sessions (
      id,
      user_id,
      current_refresh_token_hash,
      is_revoked,
      expires_at,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, FALSE, NOW() + INTERVAL '7 days', NOW(), NOW())
    RETURNING id, user_id, current_refresh_token_hash, is_revoked, expires_at;
  `;
  const sessionRes = await query(sessionSql, [tempSessionId, user.id, tokenHash]);
  const session = sessionRes.rows[0];

  // 4. Sign IdentityLens access JWT
  const jwtPayload = {
    sub: user.id,
    sid: session.id,
    utv: user.token_version,
    role: user.role,
    email: user.email,
    email_verified: user.email_verified,
    provider: user.provider
  };

  const token = jwt.sign(jwtPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN || '15m'
  });

  return {
    user,
    session,
    token,
    rawRefreshToken,
    authHeaders: {
      Authorization: `Bearer ${token}`
    }
  };
};

/**
 * Generate an expired access token for testing
 */
export const createExpiredToken = ({ userId, sessionId, tokenVersion = 1 }) => {
  const jwtPayload = {
    sub: userId,
    sid: sessionId,
    utv: tokenVersion,
    role: 'viewer',
    email: 'expired@identitylens.test',
    email_verified: true,
    provider: 'google.com'
  };
  return jwt.sign(jwtPayload, env.JWT_ACCESS_SECRET, { expiresIn: '-1s' });
};

/**
 * Generate a token signed with an invalid secret
 */
export const createTamperedToken = ({ userId, sessionId, tokenVersion = 1 }) => {
  const jwtPayload = {
    sub: userId,
    sid: sessionId,
    utv: tokenVersion,
    role: 'viewer',
    email: 'tampered@identitylens.test',
    email_verified: true,
    provider: 'google.com'
  };
  return jwt.sign(jwtPayload, 'completely-wrong-invalid-secret-key-12345', { expiresIn: '15m' });
};
