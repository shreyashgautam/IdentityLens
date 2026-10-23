import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { query, closePool } from '../src/database/connection.js';
import { createTestUserAndSession } from './helpers/auth.helper.js';

describe('Milestone 4 — Part 2: Application APIs Integration Suite', () => {
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

  // Known seed IDs from Northstar Labs dataset for read assertions
  const AWS_APP_ID = 'b0000000-0000-0000-0000-000000000001';
  const GITHUB_APP_ID = 'b0000000-0000-0000-0000-000000000002';
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

    // Clean up any lingering test records
    await query("DELETE FROM applications WHERE key LIKE 'test_%' OR name LIKE '[TEST]%'");
  });

  after(async () => {
    // Clean up all test records created during test execution
    try {
      await query("DELETE FROM applications WHERE key LIKE 'test_%' OR name LIKE '[TEST]%'");
      if (testUserId) {
        await query('DELETE FROM auth_audit_log WHERE user_id = $1', [testUserId]);
        await query('DELETE FROM users WHERE id = $1', [testUserId]);
      }
    } catch (e) {
      // Ignore cleanup error
    }

    await new Promise((resolve) => server.close(resolve));
    await closePool();
  });

  // ============================================================================
  // 1. GET /api/v1/applications (Collection, Pagination, Filter, Sort, Search)
  // ============================================================================

  test('GET /api/v1/applications returns 200 with collection envelope and pagination metadata', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/applications`);
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

  test('GET /api/v1/applications pagination respects page and limit parameters', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/applications?page=1&limit=2`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.data.length, 2);
    assert.equal(body.pagination.limit, 2);
    assert.equal(body.pagination.page, 1);
    assert.equal(body.pagination.has_next, true);
  });

  test('GET /api/v1/applications rejects limit exceeding maximum of 100 with 422', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/applications?limit=101`);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'limit'));
  });

  test('GET /api/v1/applications rejects invalid page <= 0 with 422', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/applications?page=0`);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'page'));
  });

  test('GET /api/v1/applications filters by status and auth_type', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/applications?status=active&auth_type=iam`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.data.length > 0);
    for (const item of body.data) {
      assert.equal(item.status, 'active');
      assert.equal(item.auth_type, 'iam');
    }
  });

  test('GET /api/v1/applications sorts by allowlisted column name asc and desc', async () => {
    const resAsc = await authFetch(`${baseUrl}/api/v1/applications?sort_by=name&sort_order=asc&limit=10`);
    assert.equal(resAsc.status, 200);
    const bodyAsc = await resAsc.json();
    const namesAsc = bodyAsc.data.map((a) => a.name);

    const resDesc = await authFetch(`${baseUrl}/api/v1/applications?sort_by=name&sort_order=desc&limit=10`);
    assert.equal(resDesc.status, 200);
    const bodyDesc = await resDesc.json();
    const namesDesc = bodyDesc.data.map((a) => a.name);

    assert.notDeepEqual(namesAsc, namesDesc, 'ASC and DESC orders should differ');
  });

  test('GET /api/v1/applications rejects unallowed sort column with 422', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/applications?sort_by=unallowed_column`);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'sort_by'));
  });

  test('GET /api/v1/applications search matches name, key, or description case-insensitively', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/applications?search=github`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.data.length > 0);
    assert.ok(
      body.data.some(
        (a) =>
          a.name.toLowerCase().includes('github') ||
          a.key.toLowerCase().includes('github') ||
          a.description?.toLowerCase().includes('github')
      )
    );
  });

  // ============================================================================
  // 2. GET /api/v1/applications/:applicationId (Single Resource Retrieval)
  // ============================================================================

  test('GET /api/v1/applications/:applicationId retrieves existing seed application', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/applications/${AWS_APP_ID}`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.data.id, AWS_APP_ID);
    assert.equal(body.data.name, 'AWS Cloud Infrastructure');
    assert.equal(body.data.key, 'aws_cloud');
    assert.equal(body.data.status, 'active');
    assert.equal(body.data.auth_type, 'iam');
    assert.ok(body.meta?.request_id);
  });

  test('GET /api/v1/applications/:applicationId returns 404 for nonexistent UUID', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/applications/${NON_EXISTENT_UUID}`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.error.code, 'APPLICATION_NOT_FOUND');
    assert.ok(body.error.message.includes(NON_EXISTENT_UUID));
    assert.ok(body.error.request_id);
  });

  test('GET /api/v1/applications/:applicationId returns 422 for malformed non-UUID identifier', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/applications/not-a-valid-uuid`);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'applicationId'));
  });

  // ============================================================================
  // 3. POST /api/v1/applications (Creation)
  // ============================================================================

  test('POST /api/v1/applications creates a new target application with 201 Created', async () => {
    const payload = {
      name: '[TEST] Datadog Monitoring',
      key: 'test_datadog_monitoring',
      description: 'Cloud observability and infrastructure monitoring platform',
      status: 'active',
      auth_type: 'saml'
    };

    const res = await authFetch(`${baseUrl}/api/v1/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.id, 'Created application must have a UUID');
    assert.equal(body.data.name, payload.name);
    assert.equal(body.data.key, payload.key);
    assert.equal(body.data.description, payload.description);
    assert.equal(body.data.auth_type, payload.auth_type);
    assert.ok(body.data.created_at);
    assert.ok(body.data.updated_at);
    assert.ok(body.meta?.request_id);
  });

  test('POST /api/v1/applications rejects request missing required name with 422', async () => {
    const payload = {
      key: 'test_missing_name_app',
      status: 'active'
    };

    const res = await authFetch(`${baseUrl}/api/v1/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'name'));
  });

  test('POST /api/v1/applications rejects request missing required key with 422', async () => {
    const payload = {
      name: '[TEST] Missing Key App',
      status: 'active'
    };

    const res = await authFetch(`${baseUrl}/api/v1/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'key'));
  });

  test('POST /api/v1/applications rejects invalid status enum value with 422', async () => {
    const payload = {
      name: '[TEST] Invalid Status App',
      key: 'test_invalid_status_app',
      status: 'pending_approval'
    };

    const res = await authFetch(`${baseUrl}/api/v1/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'status'));
  });

  test('POST /api/v1/applications rejects unknown / forbidden fields via strict schema with 422', async () => {
    const payload = {
      name: '[TEST] Unknown Field App',
      key: 'test_unknown_field_app',
      injected_field: true
    };

    const res = await authFetch(`${baseUrl}/api/v1/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  test('POST /api/v1/applications rejects duplicate key with 409 Conflict', async () => {
    // Attempt to register with key "aws_cloud" which already exists in seed data
    const payload = {
      name: '[TEST] Duplicate AWS App',
      key: 'aws_cloud'
    };

    const res = await authFetch(`${baseUrl}/api/v1/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error.code, 'RESOURCE_CONFLICT');
    assert.ok(body.error.message.includes('aws_cloud'));
  });

  // ============================================================================
  // 4. PATCH /api/v1/applications/:applicationId (Partial Updates)
  // ============================================================================

  test('PATCH /api/v1/applications/:applicationId partially updates permitted fields and touches updated_at', async () => {
    // 1. Create temporary application to update
    const createRes = await authFetch(`${baseUrl}/api/v1/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '[TEST] Update Target App',
        key: 'test_update_target_app',
        description: 'Original description',
        auth_type: 'password'
      })
    });
    const created = (await createRes.json()).data;

    // 2. Patch description and auth_type
    const patchRes = await authFetch(`${baseUrl}/api/v1/applications/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Updated description for monitoring',
        auth_type: 'sso'
      })
    });

    assert.equal(patchRes.status, 200);
    const patched = (await patchRes.json()).data;
    assert.equal(patched.description, 'Updated description for monitoring');
    assert.equal(patched.auth_type, 'sso');
    assert.equal(patched.name, created.name, 'Omitted fields must be preserved');
    assert.equal(patched.key, created.key, 'Omitted key must be preserved');
    assert.notEqual(patched.updated_at, null);
  });

  test('PATCH /api/v1/applications/:applicationId rejects empty update body with 400 Bad Request', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/applications/${AWS_APP_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'BAD_REQUEST');
  });

  test('PATCH /api/v1/applications/:applicationId returns 404 for nonexistent application', async () => {
    const res = await authFetch(`${baseUrl}/api/v1/applications/${NON_EXISTENT_UUID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'New description' })
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error.code, 'APPLICATION_NOT_FOUND');
  });

  test('PATCH /api/v1/applications/:applicationId rejects updating key to an existing key with 409 Conflict', async () => {
    // 1. Create temporary application
    const createRes = await authFetch(`${baseUrl}/api/v1/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '[TEST] Conflict Candidate',
        key: 'test_conflict_candidate'
      })
    });
    const created = (await createRes.json()).data;

    // 2. Attempt to update its key to "aws_cloud" (already taken by seed app)
    const patchRes = await authFetch(`${baseUrl}/api/v1/applications/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'aws_cloud' })
    });

    assert.equal(patchRes.status, 409);
    const body = await patchRes.json();
    assert.equal(body.error.code, 'RESOURCE_CONFLICT');
    assert.ok(body.error.message.includes('aws_cloud'));
  });
});
