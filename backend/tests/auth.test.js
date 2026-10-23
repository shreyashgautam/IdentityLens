import { test, describe, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { query, closePool } from '../src/database/connection.js';
import { env } from '../src/config/env.js';
import { setCustomTokenVerifier, resetCustomTokenVerifier } from '../src/config/firebase.js';

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
        // Explicitly clean up audit log entries associated with test users before user deletion
        await query('DELETE FROM auth_audit_log WHERE user_id = ANY($1::uuid[])', [ids]);
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
});
