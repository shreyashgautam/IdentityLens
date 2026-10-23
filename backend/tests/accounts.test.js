import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { query, closePool } from '../src/database/connection.js';
import { createTestUserAndSession } from './helpers/auth.helper.js';

describe('Milestone 4 — Part 3: Account APIs & Relationship APIs Integration Suite', () => {
  let server;
  let baseUrl;
  let authHeaders = {};
  let testUserId = null;

  const authFetch = (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...authHeaders,
        ...(options.headers || {})
      }
    });
  };

  // Track exact IDs of test-created accounts for safe, targeted cleanup
  const createdAccountIds = new Set();
  const registerCreatedId = (id) => {
    if (id) createdAccountIds.add(id);
  };

  // Known seed IDs from Northstar Labs dataset for read assertions
  const AWS_APP_ID = 'b0000000-0000-0000-0000-000000000001';
  const GITHUB_APP_ID = 'b0000000-0000-0000-0000-000000000002';
  const BEN_IDENTITY_ID = 'a0000000-0000-0000-0000-000000000002';
  const SEED_ACCOUNT_ID = 'c0000000-0000-0000-0000-000000000001'; // usr-aws-bcarter in AWS
  const SEED_ORPHAN_ACCOUNT_ID = 'c0000000-0000-0000-0000-000000000004'; // usr-aws-legacy-ops (identity_id is null)
  const NON_EXISTENT_UUID = 'e0000000-0000-0000-0000-000000000999';

  before(async () => {
    // Start Express app on ephemeral port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Initialize authenticated test user and session
    const testAuth = await createTestUserAndSession();
    authHeaders = testAuth.authHeaders;
    testUserId = testAuth.user.id;
  });

  after(async () => {
    // Exact-ID cleanup guarantee: clean up only test-created records
    try {
      if (createdAccountIds.size > 0) {
        const ids = Array.from(createdAccountIds);
        await query('DELETE FROM accounts WHERE id = ANY($1::uuid[])', [ids]);
      }
      if (testUserId) {
        await query('DELETE FROM auth_audit_log WHERE user_id = $1', [testUserId]);
        await query('DELETE FROM users WHERE id = $1', [testUserId]);
      }
    } catch (e) {
      // Ignore cleanup error in after hook
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await closePool();
    }
  });

  // ============================================================================
  // 1. GET /api/v1/accounts (Collection, Pagination, Filter, Sort, Search)
  // ============================================================================

  test('GET /api/v1/accounts returns 200 with collection envelope and pagination metadata', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/accounts`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.data), 'data should be an array');
    assert.ok(body.pagination, 'pagination object should exist');
    assert.equal(body.pagination.page, 1);
    assert.equal(body.pagination.limit, 20);
    assert.ok(typeof body.pagination.total === 'number');
    assert.ok(typeof body.pagination.total_pages === 'number');
    assert.equal(body.pagination.has_prev, false);
    assert.ok(body.meta?.request_id, 'request_id must be in meta');
  });

  test('GET /api/v1/accounts pagination respects page and limit parameters', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/accounts?page=1&limit=3`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.data.length, 3);
    assert.equal(body.pagination.limit, 3);
    assert.equal(body.pagination.page, 1);
    assert.equal(body.pagination.has_next, true);
  });

  test('GET /api/v1/accounts rejects limit exceeding maximum of 100 with 422', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/accounts?limit=150`);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'limit'));
  });

  test('GET /api/v1/accounts rejects invalid page <= 0 with 422', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/accounts?page=0`);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'page'));
  });

  test('GET /api/v1/accounts filters by status and application_id', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/accounts?status=active&application_id=${AWS_APP_ID}`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.data.length > 0);
    for (const item of body.data) {
      assert.equal(item.status, 'active');
      assert.equal(item.application_id, AWS_APP_ID);
    }
  });

  test('GET /api/v1/accounts filters by identity_id', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/accounts?identity_id=${BEN_IDENTITY_ID}`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.data.length > 0);
    for (const item of body.data) {
      assert.equal(item.identity_id, BEN_IDENTITY_ID);
    }
  });

  test('GET /api/v1/accounts filters by is_orphan=true (only accounts where identity_id is null)', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/accounts?is_orphan=true`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.data.length > 0);
    for (const item of body.data) {
      assert.equal(item.identity_id, null, 'Orphan accounts must have null identity_id');
    }
  });

  test('GET /api/v1/accounts filters by is_orphan=false (only linked accounts)', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/accounts?is_orphan=false`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.data.length > 0);
    for (const item of body.data) {
      assert.ok(item.identity_id !== null, 'Linked accounts must have non-null identity_id');
    }
  });

  test('GET /api/v1/accounts sorts by allowlisted column account_name asc and desc', async () => {
    const resAsc = await authFetch(`${baseUrl}/api/v1/accounts?sort_by=account_name&sort_order=asc&limit=5`);
    assert.equal(resAsc.status, 200);
    const bodyAsc = await resAsc.json();

    const resDesc = await authFetch(`${baseUrl}/api/v1/accounts?sort_by=account_name&sort_order=desc&limit=5`);
    assert.equal(resDesc.status, 200);
    const bodyDesc = await resDesc.json();

    assert.notDeepEqual(bodyAsc.data[0]?.id, bodyDesc.data[0]?.id);
  });

  test('GET /api/v1/accounts rejects unallowed sort column with 422', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/accounts?sort_by=unallowed_column_name`);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'sort_by'));
  });

  test('GET /api/v1/accounts search matches external_id, account_name, or email case-insensitively', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/accounts?search=bcarter`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.data.length > 0);
    for (const item of body.data) {
      const matches =
        item.external_id.toLowerCase().includes('bcarter') ||
        (item.account_name && item.account_name.toLowerCase().includes('bcarter')) ||
        (item.email && item.email.toLowerCase().includes('bcarter'));
      assert.ok(matches, 'Record should match search query');
    }
  });

  // ============================================================================
  // 2. GET /api/v1/accounts/:accountId (Single Account Lookup)
  // ============================================================================

  test('GET /api/v1/accounts/:accountId retrieves existing seed account', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/accounts/${SEED_ACCOUNT_ID}`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.data.id, SEED_ACCOUNT_ID);
    assert.equal(body.data.external_id, 'usr-aws-bcarter');
    assert.equal(body.data.application_id, AWS_APP_ID);
    assert.equal(body.data.identity_id, BEN_IDENTITY_ID);
    assert.ok(body.meta?.request_id);
  });

  test('GET /api/v1/accounts/:accountId returns 404 for nonexistent UUID', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/accounts/${NON_EXISTENT_UUID}`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.error.code, 'ACCOUNT_NOT_FOUND');
    assert.ok(body.error.message.includes(NON_EXISTENT_UUID));
  });

  test('GET /api/v1/accounts/:accountId returns 422 for malformed non-UUID identifier', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/accounts/not-a-valid-uuid`);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'accountId'));
  });

  // ============================================================================
  // 3. POST /api/v1/accounts (Account Registration)
  // ============================================================================

  test('POST /api/v1/accounts creates a new linked target account with 201 Created', async () => {
    const payload = {
      application_id: AWS_APP_ID,
      external_id: 'test-acc-sec-analyst-1',
      identity_id: BEN_IDENTITY_ID,
      account_name: 'test-sec-analyst',
      email: 'sec-analyst@test.northstarlabs.io',
      status: 'active',
      source: 'aws_iam_scim'
    };

    const res = await authFetch(`${baseUrl}/api/v1/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.data?.id);
    registerCreatedId(body.data.id);

    assert.equal(body.data.external_id, payload.external_id);
    assert.equal(body.data.application_id, payload.application_id);
    assert.equal(body.data.identity_id, payload.identity_id);
    assert.equal(body.data.status, 'active');
    assert.ok(body.meta?.request_id);
  });

  test('POST /api/v1/accounts creates an orphan account with identity_id null', async () => {
    const payload = {
      application_id: AWS_APP_ID,
      external_id: 'test-acc-orphan-unmapped-2',
      identity_id: null,
      account_name: 'unmapped-contractor',
      status: 'active'
    };

    const res = await authFetch(`${baseUrl}/api/v1/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.data?.id);
    registerCreatedId(body.data.id);

    assert.equal(body.data.identity_id, null);
    assert.equal(body.data.external_id, payload.external_id);
  });

  test('POST /api/v1/accounts rejects request missing required application_id with 422', async () => {
    const payload = {
      external_id: 'test-acc-missing-app'
    };

    const res = await authFetch(`${baseUrl}/api/v1/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'application_id'));
  });

  test('POST /api/v1/accounts rejects request missing required external_id with 422', async () => {
    const payload = {
      application_id: AWS_APP_ID
    };

    const res = await authFetch(`${baseUrl}/api/v1/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'external_id'));
  });

  test('POST /api/v1/accounts rejects nonexistent application_id with 422', async () => {
    const payload = {
      application_id: NON_EXISTENT_UUID,
      external_id: 'test-acc-nonexistent-app'
    };

    const res = await authFetch(`${baseUrl}/api/v1/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'application_id'));
  });

  test('POST /api/v1/accounts rejects nonexistent identity_id with 422', async () => {
    const payload = {
      application_id: AWS_APP_ID,
      external_id: 'test-acc-nonexistent-id',
      identity_id: NON_EXISTENT_UUID
    };

    const res = await authFetch(`${baseUrl}/api/v1/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'identity_id'));
  });

  test('POST /api/v1/accounts rejects invalid status enum value with 422', async () => {
    const payload = {
      application_id: AWS_APP_ID,
      external_id: 'test-acc-invalid-status',
      status: 'non_existent_status'
    };

    const res = await authFetch(`${baseUrl}/api/v1/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'status'));
  });

  test('POST /api/v1/accounts rejects unknown / forbidden fields via strict schema with 422', async () => {
    const payload = {
      application_id: AWS_APP_ID,
      external_id: 'test-acc-forbidden-field',
      injected_field: 'malicious_value'
    };

    const res = await authFetch(`${baseUrl}/api/v1/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  test('POST /api/v1/accounts rejects duplicate (application_id, external_id) with 409 Conflict', async () => {
    // Attempt to insert with existing seed external_id in AWS: 'usr-aws-bcarter'
    const payload = {
      application_id: AWS_APP_ID,
      external_id: 'usr-aws-bcarter'
    };

    const res = await authFetch(`${baseUrl}/api/v1/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error.code, 'RESOURCE_CONFLICT');
    assert.ok(body.error.message.includes('usr-aws-bcarter'));
  });

  // ============================================================================
  // 4. PATCH /api/v1/accounts/:accountId (Partial Updates)
  // ============================================================================

  test('PATCH /api/v1/accounts/:accountId partially updates permitted fields and touches updated_at', async () => {
    // Create an isolated account to update
    const createRes = await authFetch(`${baseUrl}/api/v1/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        application_id: AWS_APP_ID,
        external_id: 'test-acc-patch-target',
        account_name: 'initial-name',
        status: 'active'
      })
    });
    assert.equal(createRes.status, 201);
    const created = (await createRes.json()).data;
    registerCreatedId(created.id);

    const updateRes = await authFetch(`${baseUrl}/api/v1/accounts/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_name: 'updated-name',
        status: 'disabled'
      })
    });

    assert.equal(updateRes.status, 200);
    const updated = (await updateRes.json()).data;
    assert.equal(updated.account_name, 'updated-name');
    assert.equal(updated.status, 'disabled');
    assert.equal(updated.external_id, 'test-acc-patch-target'); // Unchanged
    assert.ok(new Date(updated.updated_at) >= new Date(created.updated_at));
  });

  test('PATCH /api/v1/accounts/:accountId can link an orphan account to an identity', async () => {
    // Create orphan account
    const createRes = await authFetch(`${baseUrl}/api/v1/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        application_id: AWS_APP_ID,
        external_id: 'test-acc-orphan-to-link',
        identity_id: null
      })
    });
    assert.equal(createRes.status, 201);
    const created = (await createRes.json()).data;
    registerCreatedId(created.id);

    // Link to Ben
    const patchRes = await authFetch(`${baseUrl}/api/v1/accounts/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity_id: BEN_IDENTITY_ID
      })
    });

    assert.equal(patchRes.status, 200);
    const updated = (await patchRes.json()).data;
    assert.equal(updated.identity_id, BEN_IDENTITY_ID);
  });

  test('PATCH /api/v1/accounts/:accountId can unlink an account by setting identity_id to null', async () => {
    // Create linked account
    const createRes = await authFetch(`${baseUrl}/api/v1/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        application_id: AWS_APP_ID,
        external_id: 'test-acc-linked-to-unlink',
        identity_id: BEN_IDENTITY_ID
      })
    });
    assert.equal(createRes.status, 201);
    const created = (await createRes.json()).data;
    registerCreatedId(created.id);

    // Unlink to make orphan
    const patchRes = await authFetch(`${baseUrl}/api/v1/accounts/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity_id: null
      })
    });

    assert.equal(patchRes.status, 200);
    const updated = (await patchRes.json()).data;
    assert.equal(updated.identity_id, null);
  });

  test('PATCH /api/v1/accounts/:accountId rejects empty update body with 400 Bad Request', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/accounts/${SEED_ACCOUNT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'BAD_REQUEST');
  });

  test('PATCH /api/v1/accounts/:accountId returns 404 for nonexistent account', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/accounts/${NON_EXISTENT_UUID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'disabled' })
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error.code, 'ACCOUNT_NOT_FOUND');
  });

  test('PATCH /api/v1/accounts/:accountId rejects updating external_id to collision with 409 Conflict', async () => {
    // Create an account
    const createRes = await authFetch(`${baseUrl}/api/v1/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        application_id: AWS_APP_ID,
        external_id: 'test-acc-patch-collision-source'
      })
    });
    assert.equal(createRes.status, 201);
    const created = (await createRes.json()).data;
    registerCreatedId(created.id);

    // Attempt to update external_id to existing 'usr-aws-bcarter'
    const patchRes = await authFetch(`${baseUrl}/api/v1/accounts/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        external_id: 'usr-aws-bcarter'
      })
    });

    assert.equal(patchRes.status, 409);
    const body = await patchRes.json();
    assert.equal(body.error.code, 'RESOURCE_CONFLICT');
  });

  // ============================================================================
  // 5. Relationship Endpoints
  // ============================================================================

  test('GET /api/v1/identities/:identityId/accounts returns accounts for an existing identity', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/identities/${BEN_IDENTITY_ID}/accounts`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
    for (const item of body.data) {
      assert.equal(item.identity_id, BEN_IDENTITY_ID);
    }
    assert.ok(body.pagination);
    assert.ok(body.meta?.request_id);
  });

  test('GET /api/v1/identities/:identityId/accounts returns 404 for nonexistent identity', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/identities/${NON_EXISTENT_UUID}/accounts`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.error.code, 'IDENTITY_NOT_FOUND');
    assert.ok(body.error.message.includes(NON_EXISTENT_UUID));
  });

  test('GET /api/v1/identities/:identityId/accounts returns 422 for malformed UUID', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/identities/invalid-uuid-string/accounts`);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'identityId'));
  });

  test('GET /api/v1/applications/:applicationId/accounts returns accounts for an existing application', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/applications/${AWS_APP_ID}/accounts`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
    for (const item of body.data) {
      assert.equal(item.application_id, AWS_APP_ID);
    }
    assert.ok(body.pagination);
    assert.ok(body.meta?.request_id);
  });

  test('GET /api/v1/applications/:applicationId/accounts returns 404 for nonexistent application', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/applications/${NON_EXISTENT_UUID}/accounts`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.error.code, 'APPLICATION_NOT_FOUND');
    assert.ok(body.error.message.includes(NON_EXISTENT_UUID));
  });

  test('GET /api/v1/applications/:applicationId/accounts returns 422 for malformed UUID', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/applications/invalid-uuid-string/accounts`);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'applicationId'));
  });
});
