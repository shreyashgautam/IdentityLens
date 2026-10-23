import { query as defaultQuery } from '../../database/connection.js';

/**
 * Authentication Repository
 * Parameterized SQL queries for users, user_sessions, and auth_audit_log.
 * Conforms to docs/architecture.md & Milestone 6 Phase 1 Specification.
 */

/**
 * Find user by Firebase UID
 */
export const findUserByFirebaseUid = async (clientOrPool, firebaseUid) => {
  const q = clientOrPool.query ? clientOrPool.query.bind(clientOrPool) : defaultQuery;
  const sql = `
    SELECT id, firebase_uid, email, provider, role, email_verified, is_active,
           token_version, tokens_valid_after, firebase_tokens_valid_after,
           created_at, updated_at
    FROM users
    WHERE firebase_uid = $1
    LIMIT 1;
  `;
  const { rows } = await q(sql, [firebaseUid]);
  return rows[0] || null;
};

/**
 * Find user by Firebase UID with exclusive row-level lock (FOR UPDATE)
 */
export const findUserByFirebaseUidForUpdate = async (client, firebaseUid) => {
  const sql = `
    SELECT id, firebase_uid, email, provider, role, email_verified, is_active,
           token_version, tokens_valid_after, firebase_tokens_valid_after,
           created_at, updated_at
    FROM users
    WHERE firebase_uid = $1
    FOR UPDATE;
  `;
  const { rows } = await client.query(sql, [firebaseUid]);
  return rows[0] || null;
};

/**
 * Find user by normalized email address
 */
export const findUserByEmail = async (clientOrPool, email) => {
  const q = clientOrPool.query ? clientOrPool.query.bind(clientOrPool) : defaultQuery;
  const sql = `
    SELECT id, firebase_uid, email, provider, role, email_verified, is_active,
           token_version, tokens_valid_after, firebase_tokens_valid_after,
           created_at, updated_at
    FROM users
    WHERE email = $1
    LIMIT 1;
  `;
  const { rows } = await q(sql, [email]);
  return rows[0] || null;
};

/**
 * Create a new user record (defaults to role: 'viewer')
 */
export const createUser = async (client, {
  firebaseUid,
  email,
  provider = 'password',
  emailVerified = false,
  firebaseTokensValidAfter = null
}) => {
  const sql = `
    INSERT INTO users (
      firebase_uid,
      email,
      provider,
      role,
      email_verified,
      is_active,
      token_version,
      tokens_valid_after,
      firebase_tokens_valid_after,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, 'viewer', $4, TRUE, 1, NOW(), $5, NOW(), NOW())
    ON CONFLICT (firebase_uid) DO UPDATE
    SET updated_at = NOW()
    RETURNING id, firebase_uid, email, provider, role, email_verified, is_active,
              token_version, tokens_valid_after, firebase_tokens_valid_after,
              created_at, updated_at;
  `;
  const params = [
    firebaseUid,
    email,
    provider,
    emailVerified,
    firebaseTokensValidAfter ? new Date(firebaseTokensValidAfter) : null
  ];
  try {
    const { rows } = await client.query(sql, params);
    return rows[0];
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'users_email_key') {
      const conflictError = new Error(
        'An account with this email already exists under a different identity provider. Account auto-merging is prohibited.'
      );
      conflictError.status = 409;
      conflictError.code = 'IDENTITY_CONFLICT';
      throw conflictError;
    }
    throw err;
  }
};

/**
 * Update user record fields (e.g. email, email_verified, token_version, firebase_tokens_valid_after)
 */
export const updateUser = async (client, id, {
  email,
  emailVerified,
  tokenVersion,
  firebaseTokensValidAfter
}) => {
  const updates = [];
  const params = [id];
  let idx = 2;

  if (email !== undefined) {
    updates.push(`email = $${idx++}`);
    params.push(email);
  }
  if (emailVerified !== undefined) {
    updates.push(`email_verified = $${idx++}`);
    params.push(emailVerified);
  }
  if (tokenVersion !== undefined) {
    updates.push(`token_version = $${idx++}`);
    params.push(tokenVersion);
  }
  if (firebaseTokensValidAfter !== undefined) {
    updates.push(`firebase_tokens_valid_after = $${idx++}`);
    params.push(firebaseTokensValidAfter ? new Date(firebaseTokensValidAfter) : null);
  }

  updates.push(`updated_at = NOW()`);

  const sql = `
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING id, firebase_uid, email, provider, role, email_verified, is_active,
              token_version, tokens_valid_after, firebase_tokens_valid_after,
              created_at, updated_at;
  `;
  const { rows } = await client.query(sql, params);
  return rows[0] || null;
};

/**
 * Create a new logical device session
 */
export const createSession = async (client, {
  userId,
  currentRefreshTokenHash,
  userAgent = null,
  ipAddress = null,
  expiresAt
}) => {
  const sql = `
    INSERT INTO user_sessions (
      user_id,
      current_refresh_token_hash,
      user_agent,
      ip_address,
      is_revoked,
      expires_at,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, FALSE, $5, NOW(), NOW())
    RETURNING id, user_id, current_refresh_token_hash, user_agent, ip_address,
              is_revoked, expires_at, created_at, updated_at;
  `;
  const params = [
    userId,
    currentRefreshTokenHash,
    userAgent,
    ipAddress,
    expiresAt
  ];
  const { rows } = await client.query(sql, params);
  return rows[0];
};

/**
 * Append audit log record
 */
export const createAuditLog = async (clientOrPool, {
  action,
  userId = null,
  operator,
  details = {},
  ipAddress = null
}) => {
  const q = clientOrPool.query ? clientOrPool.query.bind(clientOrPool) : defaultQuery;
  const sql = `
    INSERT INTO auth_audit_log (
      action,
      user_id,
      operator,
      details,
      ip_address,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING id, action, user_id, operator, details, ip_address, created_at;
  `;
  const params = [
    action,
    userId,
    operator,
    JSON.stringify(details),
    ipAddress
  ];
  const { rows } = await q(sql, params);
  return rows[0];
};
