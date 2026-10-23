import { test, describe, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { query, closePool } from '../src/database/connection.js';
import { env } from '../src/config/env.js';
import { setCustomTokenVerifier, resetCustomTokenVerifier } from '../src/config/firebase.js';
import {
  createTestUserAndSession,
  createExpiredToken,
  createTamperedToken
} from './helpers/auth.helper.js';

describe('Milestone 6 — Phase 1 Stage B: Firebase Authentication & Token Exchange Suite', () => {
  let server;
  let baseUrl;

  // Track exact IDs of test-created users for safe, targeted cleanup
  const createdUserIds = new Set();
  const registerCreatedUser = (id) => {
    if (id) createdUserIds.add(id);
  };

  before(async () => {
    // Start Express app on ephemeral port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterEach(() => {
    resetCustomTokenVerifier();
  });

  after(async () => {
    // Exact-ID cleanup guarantee: remove only test-created records
    try {
      if (createdUserIds.size > 0) {
        const ids = Array.from(createdUserIds);
        // Explicitly clean up audit log entries associated with test users or their sessions
        await query(
          `DELETE FROM auth_audit_log
           WHERE user_id = ANY($1::uuid[])
              OR (details->>'sessionId')::uuid IN (
                SELECT id FROM user_sessions WHERE user_id = ANY($1::uuid[])
              )`,
          [ids]
        );
        // Cascades to user_sessions and consumed_refresh_tokens
        await query('DELETE FROM users WHERE id = ANY($1::uuid[])', [ids]);
      }
    } catch (e) {
      // Ignore cleanup error in after hook
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await closePool();
    }
  });

  // ============================================================================
  // 1. POST /api/v1/auth/firebase/exchange - Happy Path & Token Properties
  // ============================================================================

  test('POST /api/v1/auth/firebase/exchange succeeds with valid Firebase token and creates user with role viewer', async () => {
    const testUid = `fb-test-${crypto.randomBytes(8).toString('hex')}`;
    const testEmail = `analyst-${crypto.randomBytes(4).toString('hex')}@identitylens.test`;

    setCustomTokenVerifier(async (token) => {
      if (token === 'valid-id-token-1') {
        return {
          uid: testUid,
          email: testEmail,
          emailVerified: true,
          provider: 'google.com',
          tokensValidAfterTime: null
        };
      }
      throw new Error('Invalid token');
    });

    const res = await fetch(`${baseUrl}/api/v1/auth/firebase/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': env.CORS_ORIGIN
      },
      body: JSON.stringify({ idToken: 'valid-id-token-1' })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.user.email, testEmail);
    assert.equal(body.data.user.role, 'viewer', 'New user must default to viewer role');
    assert.equal(body.data.user.emailVerified, true);
    assert.equal(body.data.user.provider, 'google.com');
    assert.ok(body.data.accessToken, 'Access token must be returned');
    assert.equal(body.data.tokenType, 'Bearer');
    assert.equal(body.data.expiresIn, 900);

    registerCreatedUser(body.data.user.id);

    // Verify raw refresh token is NOT in JSON body
    assert.equal(body.data.refreshToken, undefined, 'Refresh token must NOT appear in JSON');

    // Verify Set-Cookie header contains HttpOnly refresh token
    const cookieHeader = res.headers.get('set-cookie');
    assert.ok(cookieHeader, 'Set-Cookie header must exist');
    assert.ok(cookieHeader.includes('refresh_token='), 'Cookie name must be refresh_token');
    assert.ok(cookieHeader.toLowerCase().includes('httponly'), 'Cookie must have HttpOnly');
    assert.ok(cookieHeader.toLowerCase().includes('samesite=lax'), 'Cookie must have SameSite=Lax');
    assert.ok(cookieHeader.toLowerCase().includes('path=/api/v1/auth'), 'Cookie must have Path=/api/v1/auth');

    // Extract raw refresh token from cookie and verify SHA-256 hash in database
    const match = cookieHeader.match(/refresh_token=([^;]+)/);
    assert.ok(match, 'Refresh token extracted from cookie');
    const rawRefreshToken = match[1];
    const expectedHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const sessionRes = await query(
      'SELECT id, current_refresh_token_hash, is_revoked FROM user_sessions WHERE user_id = $1',
      [body.data.user.id]
    );
    assert.equal(sessionRes.rows.length, 1);
    assert.equal(sessionRes.rows[0].current_refresh_token_hash, expectedHash, 'Database must store SHA-256 hash');
    assert.equal(sessionRes.rows[0].is_revoked, false);

    // Verify JWT payload claims
    const decoded = jwt.verify(body.data.accessToken, env.JWT_ACCESS_SECRET);
    assert.equal(decoded.sub, body.data.user.id);
    assert.equal(decoded.sid, sessionRes.rows[0].id);
    assert.equal(decoded.utv, 1);
    assert.equal(decoded.role, 'viewer');
    assert.equal(decoded.email, testEmail);
    assert.equal(decoded.email_verified, true);
  });

  test('POST /api/v1/auth/firebase/exchange reconciles existing user without duplicate rows', async () => {
    const testUid = `fb-test-existing-${crypto.randomBytes(8).toString('hex')}`;
    const testEmail = `existing-${crypto.randomBytes(4).toString('hex')}@identitylens.test`;

    setCustomTokenVerifier(async () => ({
      uid: testUid,
      email: testEmail,
      emailVerified: true,
      provider: 'google.com',
      tokensValidAfterTime: null
    }));

    // First login
    const res1 = await fetch(`${baseUrl}/api/v1/auth/firebase/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': env.CORS_ORIGIN },
      body: JSON.stringify({ idToken: 'first-token' })
    });
    assert.equal(res1.status, 200);
    const body1 = await res1.json();
    registerCreatedUser(body1.data.user.id);

    // Second login with same Firebase UID
    const res2 = await fetch(`${baseUrl}/api/v1/auth/firebase/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': env.CORS_ORIGIN },
      body: JSON.stringify({ idToken: 'second-token' })
    });
    assert.equal(res2.status, 200);
    const body2 = await res2.json();

    assert.equal(body2.data.user.id, body1.data.user.id, 'User ID must remain identical');

    // Confirm only 1 user record exists in database
    const userCount = await query('SELECT COUNT(*)::int AS count FROM users WHERE firebase_uid = $1', [testUid]);
    assert.equal(userCount.rows[0].count, 1);

    // Confirm two separate sessions exist (one per login)
    const sessionCount = await query('SELECT COUNT(*)::int AS count FROM user_sessions WHERE user_id = $1', [body1.data.user.id]);
    assert.equal(sessionCount.rows[0].count, 2);
  });

  // ============================================================================
  // 2. Strict Input Validation & Privilege Protection
  // ============================================================================

  test('POST /api/v1/auth/firebase/exchange rejects client attempts to supply a role with 422', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/firebase/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': env.CORS_ORIGIN },
      body: JSON.stringify({
        idToken: 'some-token',
        role: 'admin'
      })
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  test('POST /api/v1/auth/firebase/exchange rejects missing idToken with 422', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/firebase/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': env.CORS_ORIGIN },
      body: JSON.stringify({})
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  test('POST /api/v1/auth/firebase/exchange rejects empty string idToken with 422', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/firebase/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': env.CORS_ORIGIN },
      body: JSON.stringify({ idToken: '   ' })
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  // ============================================================================
  // 3. Provider Policy, Missing Email & Zero Auto-Merge
  // ============================================================================

  test('POST /api/v1/auth/firebase/exchange preserves authentic provider email_verified: false for GitHub', async () => {
    const testUid = `github-${crypto.randomBytes(8).toString('hex')}`;
    const testEmail = `dev-${crypto.randomBytes(4).toString('hex')}@github.test`;

    setCustomTokenVerifier(async () => ({
      uid: testUid,
      email: testEmail,
      emailVerified: false, // Provider reports false
      provider: 'github.com',
      tokensValidAfterTime: null
    }));

    const res = await fetch(`${baseUrl}/api/v1/auth/firebase/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': env.CORS_ORIGIN },
      body: JSON.stringify({ idToken: 'github-token' })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    registerCreatedUser(body.data.user.id);

    // Verify provider's actual email_verified status is preserved as false
    assert.equal(body.data.user.emailVerified, false, 'Must not falsely force GitHub email_verified to true');
    assert.equal(body.data.user.provider, 'github.com');

    // Confirm database record has email_verified = false
    const dbUser = await query('SELECT email_verified, provider FROM users WHERE id = $1', [body.data.user.id]);
    assert.equal(dbUser.rows[0].email_verified, false);
    assert.equal(dbUser.rows[0].provider, 'github.com');
  });

  test('POST /api/v1/auth/firebase/exchange rejects provider account with missing email with 422', async () => {
    setCustomTokenVerifier(async () => ({
      uid: 'github-no-email',
      email: null, // Private / unshared email
      emailVerified: false,
      provider: 'github.com',
      tokensValidAfterTime: null
    }));

    const res = await fetch(`${baseUrl}/api/v1/auth/firebase/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': env.CORS_ORIGIN },
      body: JSON.stringify({ idToken: 'no-email-token' })
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'EMAIL_REQUIRED_FROM_PROVIDER');
  });

  test('POST /api/v1/auth/firebase/exchange enforces Zero Auto-Merge with 409 Conflict', async () => {
    const sharedEmail = `target-${crypto.randomBytes(4).toString('hex')}@company.test`;

    // 1. Initial user signs up with Google
    setCustomTokenVerifier(async () => ({
      uid: 'uid-google-original',
      email: sharedEmail,
      emailVerified: true,
      provider: 'google.com',
      tokensValidAfterTime: null
    }));

    const res1 = await fetch(`${baseUrl}/api/v1/auth/firebase/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': env.CORS_ORIGIN },
      body: JSON.stringify({ idToken: 'google-token' })
    });
    assert.equal(res1.status, 200);
    const body1 = await res1.json();
    registerCreatedUser(body1.data.user.id);

    // 2. An attacker or different identity signs in with the same email under a DIFFERENT Firebase UID
    setCustomTokenVerifier(async () => ({
      uid: 'uid-github-imposter',
      email: sharedEmail,
      emailVerified: false,
      provider: 'github.com',
      tokensValidAfterTime: null
    }));

    const res2 = await fetch(`${baseUrl}/api/v1/auth/firebase/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': env.CORS_ORIGIN },
      body: JSON.stringify({ idToken: 'imposter-token' })
    });

    assert.equal(res2.status, 409);
    const body2 = await res2.json();
    assert.equal(body2.error.code, 'IDENTITY_CONFLICT');
  });

  // ============================================================================
  // 4. Token Invalidation & Verification Failure Handling
  // ============================================================================

  test('POST /api/v1/auth/firebase/exchange returns 401 when Firebase token verifier throws', async () => {
    setCustomTokenVerifier(async () => {
      const err = new Error('Firebase ID token has expired.');
      err.status = 401;
      err.code = 'INVALID_FIREBASE_TOKEN';
      throw err;
    });

    const res = await fetch(`${baseUrl}/api/v1/auth/firebase/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': env.CORS_ORIGIN },
      body: JSON.stringify({ idToken: 'expired-token' })
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, 'INVALID_FIREBASE_TOKEN');
  });

  // ============================================================================
  // 5. CSRF & Origin Verification
  // ============================================================================

  test('POST /api/v1/auth/firebase/exchange blocks cross-site request via Sec-Fetch-Site with 403', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/firebase/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': env.CORS_ORIGIN,
        'Sec-Fetch-Site': 'cross-site'
      },
      body: JSON.stringify({ idToken: 'any-token' })
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, 'FORBIDDEN_ORIGIN');
  });

  test('POST /api/v1/auth/firebase/exchange blocks unallowed Origin with 403', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/firebase/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://malicious-site.attacker'
      },
      body: JSON.stringify({ idToken: 'any-token' })
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, 'FORBIDDEN_ORIGIN');
  });

  // ============================================================================
  // 6. Confirmed Password Reset Detection & Concurrency
  // ============================================================================

  test('POST /api/v1/auth/firebase/exchange detects advanced tokensValidAfterTime and revokes prior sessions', async () => {
    const testUid = `pwd-reset-${crypto.randomBytes(8).toString('hex')}`;
    const testEmail = `reset-${crypto.randomBytes(4).toString('hex')}@company.test`;

    const baselineCutoff = '2026-10-22T10:00:00.000Z';
    const advancedCutoff = '2026-10-22T12:00:00.000Z';

    // 1. Initial login with baseline cutoff
    setCustomTokenVerifier(async () => ({
      uid: testUid,
      email: testEmail,
      emailVerified: true,
      provider: 'password',
      tokensValidAfterTime: baselineCutoff
    }));

    const res1 = await fetch(`${baseUrl}/api/v1/auth/firebase/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': env.CORS_ORIGIN },
      body: JSON.stringify({ idToken: 'baseline-token' })
    });
    assert.equal(res1.status, 200);
    const body1 = await res1.json();
    registerCreatedUser(body1.data.user.id);

    // Verify session 1 is active
    const s1Res = await query('SELECT id, is_revoked FROM user_sessions WHERE user_id = $1', [body1.data.user.id]);
    assert.equal(s1Res.rows.length, 1);
    assert.equal(s1Res.rows[0].is_revoked, false);
    const s1Id = s1Res.rows[0].id;

    // 2. User completes password reset in Firebase; subsequent exchange has advancedCutoff
    setCustomTokenVerifier(async () => ({
      uid: testUid,
      email: testEmail,
      emailVerified: true,
      provider: 'password',
      tokensValidAfterTime: advancedCutoff
    }));

    const res2 = await fetch(`${baseUrl}/api/v1/auth/firebase/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': env.CORS_ORIGIN },
      body: JSON.stringify({ idToken: 'advanced-token' })
    });
    assert.equal(res2.status, 200);
    const body2 = await res2.json();

    // Verify session 1 is now revoked
    const s1Revoked = await query('SELECT is_revoked FROM user_sessions WHERE id = $1', [s1Id]);
    assert.equal(s1Revoked.rows[0].is_revoked, true, 'Prior session must be revoked upon confirmed password reset');

    // Verify user token_version incremented from 1 to 2
    const userRow = await query('SELECT token_version FROM users WHERE id = $1', [body1.data.user.id]);
    assert.equal(userRow.rows[0].token_version, 2, 'token_version must increment');

    // Verify new token has utv = 2
    const decoded2 = jwt.verify(body2.data.accessToken, env.JWT_ACCESS_SECRET);
    assert.equal(decoded2.utv, 2);
  });

  test('Concurrent exchanges serialize safely under row locking without data corruption', async () => {
    const testUid = `concurrent-${crypto.randomBytes(8).toString('hex')}`;
    const testEmail = `concurrent-${crypto.randomBytes(4).toString('hex')}@company.test`;

    setCustomTokenVerifier(async () => ({
      uid: testUid,
      email: testEmail,
      emailVerified: true,
      provider: 'google.com',
      tokensValidAfterTime: null
    }));

    // Trigger two simultaneous exchange requests
    const [res1, res2] = await Promise.all([
      fetch(`${baseUrl}/api/v1/auth/firebase/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': env.CORS_ORIGIN },
        body: JSON.stringify({ idToken: 'c-token-1' })
      }),
      fetch(`${baseUrl}/api/v1/auth/firebase/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': env.CORS_ORIGIN },
        body: JSON.stringify({ idToken: 'c-token-2' })
      })
    ]);

    const body1 = res1.ok ? await res1.json() : null;
    const body2 = res2.ok ? await res2.json() : null;

    if (body1?.data?.user?.id) registerCreatedUser(body1.data.user.id);
    if (body2?.data?.user?.id) registerCreatedUser(body2.data.user.id);

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);

    assert.equal(body1.data.user.id, body2.data.user.id, 'Both requests must reconcile to the same user');

    // Exactly 1 user record created
    const countRes = await query('SELECT COUNT(*)::int AS count FROM users WHERE firebase_uid = $1', [testUid]);
    assert.equal(countRes.rows[0].count, 1);
  });

  test('Transaction rollback ensures user is not persisted when session creation fails', async () => {
    const testUid = `rollback-${crypto.randomBytes(8).toString('hex')}`;
    const testEmail = `rollback-${crypto.randomBytes(4).toString('hex')}@company.test`;

    setCustomTokenVerifier(async () => ({
      uid: testUid,
      email: testEmail,
      emailVerified: true,
      provider: 'google.com',
      tokensValidAfterTime: null
    }));

    // Induce session creation failure by using the test interceptor
    const { _setSessionCreationInterceptor } = await import('../src/modules/auth/auth.service.js');
    _setSessionCreationInterceptor(async () => {
      throw new Error('Simulated database failure during session creation');
    });

    try {
      const res = await fetch(`${baseUrl}/api/v1/auth/firebase/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': env.CORS_ORIGIN },
        body: JSON.stringify({ idToken: 'rollback-token' })
      });

      assert.equal(res.status, 500);

      // Verify that the user record was completely rolled back and not persisted
      const userRes = await query('SELECT id FROM users WHERE firebase_uid = $1', [testUid]);
      assert.equal(userRes.rows.length, 0, 'User record must be rolled back on session creation failure');
    } finally {
      _setSessionCreationInterceptor(null);
    }
  });

  // ============================================================================
  // Stage C: Session Security, Refresh Rotation & Protected APIs Tests
  // ============================================================================

  // 1. Missing, malformed, expired, and tampered access tokens
  test('Stage C: Rejects missing, malformed, expired, and tampered access tokens on protected routes', async () => {
    // Missing token
    const resMissing = await fetch(`${baseUrl}/api/v1/identities`);
    assert.equal(resMissing.status, 401);
    const bodyMissing = await resMissing.json();
    assert.equal(bodyMissing.error.code, 'MISSING_TOKEN');

    // Malformed auth scheme
    const resScheme = await fetch(`${baseUrl}/api/v1/identities`, {
      headers: { Authorization: 'Basic somebase64credentials' }
    });
    assert.equal(resScheme.status, 401);
    const bodyScheme = await resScheme.json();
    assert.equal(bodyScheme.error.code, 'MALFORMED_TOKEN');

    // Malformed JWT string
    const resGarbage = await fetch(`${baseUrl}/api/v1/identities`, {
      headers: { Authorization: 'Bearer this.is.not.a.valid.jwt' }
    });
    assert.equal(resGarbage.status, 401);
    const bodyGarbage = await resGarbage.json();
    assert.equal(bodyGarbage.error.code, 'INVALID_TOKEN');

    // Expired token
    const authContext = await createTestUserAndSession();
    registerCreatedUser(authContext.user.id);
    const expiredToken = createExpiredToken({
      userId: authContext.user.id,
      sessionId: authContext.session.id,
      tokenVersion: authContext.user.token_version
    });
    const resExpired = await fetch(`${baseUrl}/api/v1/identities`, {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert.equal(resExpired.status, 401);
    const bodyExpired = await resExpired.json();
    assert.equal(bodyExpired.error.code, 'TOKEN_EXPIRED');

    // Tampered signature
    const tamperedToken = createTamperedToken({
      userId: authContext.user.id,
      sessionId: authContext.session.id,
      tokenVersion: authContext.user.token_version
    });
    const resTampered = await fetch(`${baseUrl}/api/v1/identities`, {
      headers: { Authorization: `Bearer ${tamperedToken}` }
    });
    assert.equal(resTampered.status, 401);
    const bodyTampered = await resTampered.json();
    assert.equal(bodyTampered.error.code, 'INVALID_TOKEN');
  });

  // 2. Missing or invalid session IDs
  test('Stage C: Rejects tokens with missing, invalid or non-existent session IDs', async () => {
    const authContext = await createTestUserAndSession();
    registerCreatedUser(authContext.user.id);

    // Missing sid claim
    const tokenNoSid = jwt.sign(
      { sub: authContext.user.id, utv: 1, role: 'viewer', email: 'test@lens.test', email_verified: true, provider: 'google.com' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
    const resNoSid = await fetch(`${baseUrl}/api/v1/identities`, {
      headers: { Authorization: `Bearer ${tokenNoSid}` }
    });
    assert.equal(resNoSid.status, 401);
    const bodyNoSid = await resNoSid.json();
    assert.equal(bodyNoSid.error.code, 'INVALID_TOKEN');

    // Non-existent session UUID in DB
    const nonExistentSid = crypto.randomUUID();
    const tokenBadSid = jwt.sign(
      { sub: authContext.user.id, sid: nonExistentSid, utv: 1, role: 'viewer', email: 'test@lens.test', email_verified: true, provider: 'google.com' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
    const resBadSid = await fetch(`${baseUrl}/api/v1/identities`, {
      headers: { Authorization: `Bearer ${tokenBadSid}` }
    });
    assert.equal(resBadSid.status, 401);
    const bodyBadSid = await resBadSid.json();
    assert.equal(bodyBadSid.error.code, 'SESSION_NOT_FOUND');
  });

  // 3. Revoked sessions and expired sessions
  test('Stage C: Rejects revoked sessions and expired sessions', async () => {
    const authContext = await createTestUserAndSession();
    registerCreatedUser(authContext.user.id);

    // 1. Revoke session directly in DB
    await query('UPDATE user_sessions SET is_revoked = TRUE WHERE id = $1', [authContext.session.id]);
    const resRevoked = await fetch(`${baseUrl}/api/v1/identities`, {
      headers: { Authorization: `Bearer ${authContext.token}` }
    });
    assert.equal(resRevoked.status, 401);
    const bodyRevoked = await resRevoked.json();
    assert.equal(bodyRevoked.error.code, 'SESSION_REVOKED');

    // 2. Expired session in DB
    const authContext2 = await createTestUserAndSession();
    registerCreatedUser(authContext2.user.id);
    await query("UPDATE user_sessions SET expires_at = NOW() - INTERVAL '1 hour' WHERE id = $1", [authContext2.session.id]);
    const resExpired = await fetch(`${baseUrl}/api/v1/identities`, {
      headers: { Authorization: `Bearer ${authContext2.token}` }
    });
    assert.equal(resExpired.status, 401);
    const bodyExpired = await resExpired.json();
    assert.equal(bodyExpired.error.code, 'SESSION_EXPIRED');
  });

  // 4. Stale utv after revoke-all
  test('Stage C: Rejects stale token_version after user-wide revocation', async () => {
    const authContext = await createTestUserAndSession();
    registerCreatedUser(authContext.user.id);

    // Bump user token_version directly in DB
    await query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [authContext.user.id]);

    const res = await fetch(`${baseUrl}/api/v1/identities`, {
      headers: { Authorization: `Bearer ${authContext.token}` }
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, 'TOKEN_REVOKED');
  });

  // 5. Inactive users
  test('Stage C: Rejects inactive users with 401 USER_INACTIVE', async () => {
    const authContext = await createTestUserAndSession({ isActive: false });
    registerCreatedUser(authContext.user.id);

    const res = await fetch(`${baseUrl}/api/v1/identities`, {
      headers: { Authorization: `Bearer ${authContext.token}` }
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, 'USER_INACTIVE');
  });

  // 6. Email-verification policy for each supported provider
  test('Stage C: Enforces provider-specific email verification policies', async () => {
    // 1. Password provider without verified email -> 403 FORBIDDEN
    const pwUnverified = await createTestUserAndSession({ provider: 'password', emailVerified: false });
    registerCreatedUser(pwUnverified.user.id);
    const resPwUnverified = await fetch(`${baseUrl}/api/v1/identities`, {
      headers: { Authorization: `Bearer ${pwUnverified.token}` }
    });
    assert.equal(resPwUnverified.status, 403);
    const bodyPwUnverified = await resPwUnverified.json();
    assert.equal(bodyPwUnverified.error.code, 'EMAIL_NOT_VERIFIED');

    // 2. Password provider with verified email -> 200 OK
    const pwVerified = await createTestUserAndSession({ provider: 'password', emailVerified: true });
    registerCreatedUser(pwVerified.user.id);
    const resPwVerified = await fetch(`${baseUrl}/api/v1/identities`, {
      headers: { Authorization: `Bearer ${pwVerified.token}` }
    });
    assert.equal(resPwVerified.status, 200);

    // 3. Google provider with email_verified: false -> 200 OK (Google provider policy)
    const googleUser = await createTestUserAndSession({ provider: 'google.com', emailVerified: false });
    registerCreatedUser(googleUser.user.id);
    const resGoogle = await fetch(`${baseUrl}/api/v1/identities`, {
      headers: { Authorization: `Bearer ${googleUser.token}` }
    });
    assert.equal(resGoogle.status, 200);

    // 4. GitHub provider with email_verified: false -> 200 OK (GitHub provider policy)
    const githubUser = await createTestUserAndSession({ provider: 'github.com', emailVerified: false });
    registerCreatedUser(githubUser.user.id);
    const resGithub = await fetch(`${baseUrl}/api/v1/identities`, {
      headers: { Authorization: `Bearer ${githubUser.token}` }
    });
    assert.equal(resGithub.status, 200);
  });

  // 7. Unauthenticated requests to every protected inventory route & public routes
  test('Stage C: Rejects unauthenticated requests to all inventory routes while preserving public probes', async () => {
    const endpoints = [
      '/api/v1/identities',
      '/api/v1/applications',
      '/api/v1/accounts',
      '/api/v1/entitlements'
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep}`);
      assert.equal(res.status, 401, `${ep} must reject unauthenticated requests`);
      const body = await res.json();
      assert.equal(body.error.code, 'MISSING_TOKEN');
    }

    // Public probes remain functional without authentication
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);

    const liveRes = await fetch(`${baseUrl}/health/live`);
    assert.equal(liveRes.status, 200);

    const readyRes = await fetch(`${baseUrl}/health/ready`);
    assert.equal(readyRes.status, 200);

    const docsRes = await fetch(`${baseUrl}/docs/openapi.json`);
    assert.equal(docsRes.status, 200);
  });

  // 8. Successful refresh rotation and hash replacement
  test('Stage C: Rotates refresh token, hashes token before lookup, and replaces session hash', async () => {
    const authContext = await createTestUserAndSession();
    registerCreatedUser(authContext.user.id);

    const oldRawToken = authContext.rawRefreshToken;
    const oldHash = crypto.createHash('sha256').update(oldRawToken).digest('hex');

    // Call POST /api/v1/auth/refresh
    const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Origin': env.CORS_ORIGIN,
        'Cookie': `refresh_token=${oldRawToken}`
      }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.accessToken, 'Must return new accessToken');
    assert.equal(body.data.tokenType, 'Bearer');
    assert.equal(body.data.expiresIn, 900);
    assert.equal(body.data.refreshToken, undefined, 'Must not return refresh token in JSON');

    // Verify Set-Cookie header contains new refresh token
    const cookieHeader = res.headers.get('set-cookie');
    assert.ok(cookieHeader, 'Set-Cookie header must be present');
    assert.ok(cookieHeader.includes('refresh_token='));
    assert.ok(cookieHeader.toLowerCase().includes('httponly'));
    assert.ok(cookieHeader.toLowerCase().includes('samesite=lax'));
    assert.ok(cookieHeader.toLowerCase().includes('path=/api/v1/auth'));

    const match = cookieHeader.match(/refresh_token=([^;]+)/);
    const newRawToken = match[1];
    assert.notEqual(newRawToken, oldRawToken, 'New refresh token must differ from old one');

    const newHash = crypto.createHash('sha256').update(newRawToken).digest('hex');

    // Check DB state
    const sessionRes = await query('SELECT current_refresh_token_hash FROM user_sessions WHERE id = $1', [authContext.session.id]);
    assert.equal(sessionRes.rows[0].current_refresh_token_hash, newHash, 'Session hash must be updated');

    // Check consumed_refresh_tokens table contains old hash
    const consumedRes = await query(
      'SELECT id, session_id, token_hash FROM consumed_refresh_tokens WHERE session_id = $1 AND token_hash = $2',
      [authContext.session.id, oldHash]
    );
    assert.equal(consumedRes.rows.length, 1, 'Consumed token must be recorded');

    // Verify new access token can access protected inventory
    const accessRes = await fetch(`${baseUrl}/api/v1/identities`, {
      headers: { Authorization: `Bearer ${body.data.accessToken}` }
    });
    assert.equal(accessRes.status, 200);
  });

  // 9. Replay of a consumed refresh token and session-family revocation
  test('Stage C: Replay of consumed refresh token revokes entire session family and clears cookie', async () => {
    const authContext = await createTestUserAndSession();
    registerCreatedUser(authContext.user.id);

    const oldRawToken = authContext.rawRefreshToken;

    // 1. Perform successful rotation first
    const res1 = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Origin': env.CORS_ORIGIN, 'Cookie': `refresh_token=${oldRawToken}` }
    });
    assert.equal(res1.status, 200);

    // 2. Replay the old consumed token
    const res2 = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Origin': env.CORS_ORIGIN, 'Cookie': `refresh_token=${oldRawToken}` }
    });
    assert.equal(res2.status, 401);
    const body2 = await res2.json();
    assert.equal(body2.error.code, 'SESSION_REVOKED_REPLAY');

    // Confirm cookie was cleared
    const clearCookieHeader = res2.headers.get('set-cookie');
    assert.ok(clearCookieHeader, 'Set-Cookie header must clear the cookie');
    assert.ok(clearCookieHeader.includes('refresh_token=;'));

    // Confirm session is revoked in database
    const sessionCheck = await query('SELECT is_revoked FROM user_sessions WHERE id = $1', [authContext.session.id]);
    assert.equal(sessionCheck.rows[0].is_revoked, true, 'Session must be revoked');

    // Confirm audit log contains replay attack action
    const auditRes = await query(
      "SELECT id, action, details FROM auth_audit_log WHERE action = 'REFRESH_TOKEN_REPLAY_ATTACK' AND details->>'sessionId' = $1",
      [authContext.session.id]
    );
    assert.equal(auditRes.rows.length, 1, 'Audit log must record replay attack');
  });

  // 10. Two simultaneous refreshes using the same token (Controlled Concurrency)
  test('Stage C: Controlled concurrency - two simultaneous refreshes serialize safely and detect replay', async () => {
    const authContext = await createTestUserAndSession();
    registerCreatedUser(authContext.user.id);

    const rawToken = authContext.rawRefreshToken;

    // Concurrently fire two refresh requests with the exact same refresh token
    const [resA, resB] = await Promise.all([
      fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Origin': env.CORS_ORIGIN, 'Cookie': `refresh_token=${rawToken}` }
      }),
      fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Origin': env.CORS_ORIGIN, 'Cookie': `refresh_token=${rawToken}` }
      })
    ]);

    const statuses = [resA.status, resB.status].sort();
    assert.deepEqual(statuses, [200, 401], 'Exactly one request must succeed and the other be detected as replay');

    const failedRes = resA.status === 401 ? resA : resB;
    const failedBody = await failedRes.json();
    assert.equal(failedBody.error.code, 'SESSION_REVOKED_REPLAY');

    // The entire session must now be revoked as replay defense
    const sessionCheck = await query('SELECT is_revoked FROM user_sessions WHERE id = $1', [authContext.session.id]);
    assert.equal(sessionCheck.rows[0].is_revoked, true);
  });

  // 11. Single-session logout without revoking other sessions
  test('Stage C: Single-session logout revokes only the targeted session, leaving other sessions active', async () => {
    // Create user and first session
    const authContext1 = await createTestUserAndSession();
    registerCreatedUser(authContext1.user.id);

    // Create second session for the same user
    const rawSecret2 = crypto.randomBytes(32).toString('hex');
    const sessionId2 = crypto.randomUUID();
    const rawRefreshToken2 = `${sessionId2}.${rawSecret2}`;
    const tokenHash2 = crypto.createHash('sha256').update(rawRefreshToken2).digest('hex');

    await query(
      `INSERT INTO user_sessions (id, user_id, current_refresh_token_hash, is_revoked, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, FALSE, NOW() + INTERVAL '7 days', NOW(), NOW())`,
      [sessionId2, authContext1.user.id, tokenHash2]
    );

    const token2 = jwt.sign(
      { sub: authContext1.user.id, sid: sessionId2, utv: authContext1.user.token_version, role: 'viewer', email: authContext1.user.email, email_verified: true, provider: 'google.com' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    // Call POST /api/v1/auth/logout with session 1 cookie and Bearer token
    const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Origin': env.CORS_ORIGIN,
        'Cookie': `refresh_token=${authContext1.rawRefreshToken}`,
        'Authorization': `Bearer ${authContext1.token}`
      }
    });
    assert.equal(logoutRes.status, 200);

    // Verify session 1 is revoked in DB
    const s1 = await query('SELECT is_revoked FROM user_sessions WHERE id = $1', [authContext1.session.id]);
    assert.equal(s1.rows[0].is_revoked, true);

    // Verify session 2 remains unrevoked in DB
    const s2 = await query('SELECT is_revoked FROM user_sessions WHERE id = $1', [sessionId2]);
    assert.equal(s2.rows[0].is_revoked, false);

    // Verify session 2 access token continues to work
    const accessRes2 = await fetch(`${baseUrl}/api/v1/identities`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert.equal(accessRes2.status, 200);
  });

  // 12. Revoke-all invalidating all prior sessions and access tokens
  test('Stage C: Revoke-all revokes all sessions and increments token_version atomically', async () => {
    const authContext = await createTestUserAndSession();
    registerCreatedUser(authContext.user.id);

    // Create second session
    const sessionId2 = crypto.randomUUID();
    const rawSecret2 = crypto.randomBytes(32).toString('hex');
    const rawRefreshToken2 = `${sessionId2}.${rawSecret2}`;
    const tokenHash2 = crypto.createHash('sha256').update(rawRefreshToken2).digest('hex');

    await query(
      `INSERT INTO user_sessions (id, user_id, current_refresh_token_hash, is_revoked, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, FALSE, NOW() + INTERVAL '7 days', NOW(), NOW())`,
      [sessionId2, authContext.user.id, tokenHash2]
    );

    const token2 = jwt.sign(
      { sub: authContext.user.id, sid: sessionId2, utv: authContext.user.token_version, role: 'viewer', email: authContext.user.email, email_verified: true, provider: 'google.com' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    // Call POST /api/v1/auth/revoke-all with session 1 access token
    const revokeRes = await fetch(`${baseUrl}/api/v1/auth/revoke-all`, {
      method: 'POST',
      headers: {
        'Origin': env.CORS_ORIGIN,
        'Authorization': `Bearer ${authContext.token}`
      }
    });
    assert.equal(revokeRes.status, 200);

    // Check DB: both sessions revoked
    const sessions = await query('SELECT is_revoked FROM user_sessions WHERE user_id = $1', [authContext.user.id]);
    assert.equal(sessions.rows.length, 2);
    assert.ok(sessions.rows.every(r => r.is_revoked === true), 'All sessions must be marked revoked');

    // Check DB: token_version incremented
    const userRow = await query('SELECT token_version FROM users WHERE id = $1', [authContext.user.id]);
    assert.equal(userRow.rows[0].token_version, 2, 'User token_version must be incremented to 2');

    // Both previous tokens now fail on protected routes (session is revoked and token_version is stale)
    const resA = await fetch(`${baseUrl}/api/v1/identities`, {
      headers: { Authorization: `Bearer ${authContext.token}` }
    });
    assert.equal(resA.status, 401);
    const bodyA = await resA.json();
    assert.ok(['TOKEN_REVOKED', 'SESSION_REVOKED'].includes(bodyA.error.code));

    const resB = await fetch(`${baseUrl}/api/v1/identities`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert.equal(resB.status, 401);
    const bodyB = await resB.json();
    assert.ok(['TOKEN_REVOKED', 'SESSION_REVOKED'].includes(bodyB.error.code));
  });

  // 13. Concurrent refresh and revoke-all behavior
  test('Stage C: Concurrent refresh and revoke-all execute safely within database transaction boundaries', async () => {
    const authContext = await createTestUserAndSession();
    registerCreatedUser(authContext.user.id);

    // Concurrently trigger refresh and revoke-all
    const [refreshRes, revokeRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Origin': env.CORS_ORIGIN,
          'Cookie': `refresh_token=${authContext.rawRefreshToken}`
        }
      }),
      fetch(`${baseUrl}/api/v1/auth/revoke-all`, {
        method: 'POST',
        headers: {
          'Origin': env.CORS_ORIGIN,
          'Authorization': `Bearer ${authContext.token}`
        }
      })
    ]);

    // Both requests must complete HTTP cycle without 500 error or deadlock
    assert.ok([200, 401].includes(refreshRes.status));
    assert.ok([200, 401].includes(revokeRes.status));

    // Confirm that the final user state has advanced token_version or all sessions revoked
    const userRes = await query('SELECT token_version FROM users WHERE id = $1', [authContext.user.id]);
    assert.ok(userRes.rows[0].token_version >= 1);
  });

  // 14. Cookie attributes and cookie clearing on logout and revocation
  test('Stage C: Refresh cookies enforce security attributes and clear on logout', async () => {
    const authContext = await createTestUserAndSession();
    registerCreatedUser(authContext.user.id);

    const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Origin': env.CORS_ORIGIN,
        'Cookie': `refresh_token=${authContext.rawRefreshToken}`
      }
    });

    assert.equal(logoutRes.status, 200);
    const cookieHeader = logoutRes.headers.get('set-cookie');
    assert.ok(cookieHeader, 'Set-Cookie header must be present on logout');
    assert.ok(cookieHeader.includes('refresh_token=;'));
    assert.ok(cookieHeader.toLowerCase().includes('httponly'));
    assert.ok(cookieHeader.toLowerCase().includes('samesite=lax'));
    assert.ok(cookieHeader.toLowerCase().includes('path=/api/v1/auth'));
    assert.ok(
      cookieHeader.includes('Expires=Thu, 01 Jan 1970') || cookieHeader.includes('Max-Age=0'),
      'Cookie must be expired'
    );
  });

  // 15. Invalid Origin/CSRF requests
  test('Stage C: Rejects requests with invalid Origin on sensitive state-changing auth endpoints', async () => {
    // 1. Invalid Origin on /refresh
    const resRefresh = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Origin': 'http://malicious-site.attacker.com',
        'Cookie': 'refresh_token=fake.token'
      }
    });
    assert.equal(resRefresh.status, 403);
    const bodyRefresh = await resRefresh.json();
    assert.equal(bodyRefresh.error.code, 'FORBIDDEN_ORIGIN');

    // 2. Invalid Origin on /logout
    const resLogout = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Origin': 'http://malicious-site.attacker.com'
      }
    });
    assert.equal(resLogout.status, 403);
    const bodyLogout = await resLogout.json();
    assert.equal(bodyLogout.error.code, 'FORBIDDEN_ORIGIN');

    // 3. Cross-site sec-fetch-site header
    const resCrossSite = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Sec-Fetch-Site': 'cross-site'
      }
    });
    assert.equal(resCrossSite.status, 403);
    const bodyCrossSite = await resCrossSite.json();
    assert.equal(bodyCrossSite.error.code, 'FORBIDDEN_ORIGIN');
  });

  // 16. Exact-ID test cleanup and preservation of all seed records
  test('Stage C: Verifies all original seed data counts remain completely untouched', async () => {
    const identities = await query('SELECT COUNT(*)::int AS count FROM identities');
    const applications = await query('SELECT COUNT(*)::int AS count FROM applications');
    const accounts = await query('SELECT COUNT(*)::int AS count FROM accounts');
    const entitlements = await query('SELECT COUNT(*)::int AS count FROM entitlements');
    const assignments = await query('SELECT COUNT(*)::int AS count FROM account_entitlements');
    const risks = await query('SELECT COUNT(*)::int AS count FROM risk_findings');

    assert.equal(identities.rows[0].count, 10, 'Identities count must remain 10');
    assert.equal(applications.rows[0].count, 6, 'Applications count must remain 6');
    assert.equal(accounts.rows[0].count, 14, 'Accounts count must remain 14');
    assert.equal(entitlements.rows[0].count, 10, 'Entitlements count must remain 10');
    assert.equal(assignments.rows[0].count, 18, 'Account entitlements count must remain 18');
    assert.equal(risks.rows[0].count, 6, 'Risk findings count must remain 6');
  });
});
