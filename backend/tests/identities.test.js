import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { query, closePool } from '../src/database/connection.js';

describe('Milestone 4 — Part 1: Identity APIs Integration Suite', () => {
  let server;
  let baseUrl;

  // Known seed IDs from Northstar Labs dataset for read assertions
  const ALICE_ID = 'a0000000-0000-0000-0000-000000000001';
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

    // Clean up any lingering test records
    await query("DELETE FROM identities WHERE email LIKE '%@test.identitylens.local' OR display_name LIKE '[TEST]%'");
  });

  after(async () => {
    // Clean up all test records created during test execution
    try {
      await query("DELETE FROM identities WHERE email LIKE '%@test.identitylens.local' OR display_name LIKE '[TEST]%'");
    } catch (e) {
      // Ignore cleanup error
    }

    await new Promise((resolve) => server.close(resolve));
    await closePool();
  });

  // ============================================================================
  // 1. GET /api/v1/identities (Collection, Pagination, Filter, Sort, Search)
  // ============================================================================

  test('GET /api/v1/identities returns 200 with collection envelope and pagination metadata', async () => {
    const res = await fetch(`${baseUrl}/api/v1/identities`);
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

  test('GET /api/v1/identities pagination respects page and limit parameters', async () => {
    const res = await fetch(`${baseUrl}/api/v1/identities?page=1&limit=2`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.data.length, 2);
    assert.equal(body.pagination.limit, 2);
    assert.equal(body.pagination.page, 1);
    assert.equal(body.pagination.has_next, true);
  });

  test('GET /api/v1/identities rejects limit exceeding maximum of 100 with 422', async () => {
    const res = await fetch(`${baseUrl}/api/v1/identities?limit=101`);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'limit'));
  });

  test('GET /api/v1/identities rejects invalid page <= 0 with 422', async () => {
    const res = await fetch(`${baseUrl}/api/v1/identities?page=0`);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'page'));
  });

  test('GET /api/v1/identities filters by status and identity_type', async () => {
    const res = await fetch(`${baseUrl}/api/v1/identities?status=active&identity_type=bot`);
    assert.equal(res.status, 200);

    const body = await res.json();
    for (const item of body.data) {
      assert.equal(item.status, 'active');
      assert.equal(item.identity_type, 'bot');
    }
  });

  test('GET /api/v1/identities sorts by allowlisted column display_name asc and desc', async () => {
    const resAsc = await fetch(`${baseUrl}/api/v1/identities?sort_by=display_name&sort_order=asc&limit=10`);
    assert.equal(resAsc.status, 200);
    const bodyAsc = await resAsc.json();
    const namesAsc = bodyAsc.data.map((i) => i.display_name);

    const resDesc = await fetch(`${baseUrl}/api/v1/identities?sort_by=display_name&sort_order=desc&limit=10`);
    assert.equal(resDesc.status, 200);
    const bodyDesc = await resDesc.json();
    const namesDesc = bodyDesc.data.map((i) => i.display_name);

    assert.notDeepEqual(namesAsc, namesDesc, 'ASC and DESC orders should differ');
  });

  test('GET /api/v1/identities rejects unallowed sort column with 422', async () => {
    const res = await fetch(`${baseUrl}/api/v1/identities?sort_by=unallowed_column`);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'sort_by'));
  });

  test('GET /api/v1/identities search matches display_name and email case-insensitively', async () => {
    const res = await fetch(`${baseUrl}/api/v1/identities?search=alice`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.data.length > 0);
    assert.ok(
      body.data.some(
        (i) => i.display_name.toLowerCase().includes('alice') || i.email?.toLowerCase().includes('alice')
      )
    );
  });

  // ============================================================================
  // 2. GET /api/v1/identities/:identityId (Single Resource Retrieval)
  // ============================================================================

  test('GET /api/v1/identities/:identityId retrieves existing seed identity', async () => {
    const res = await fetch(`${baseUrl}/api/v1/identities/${ALICE_ID}`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.data.id, ALICE_ID);
    assert.equal(body.data.display_name, 'Dr. Alice Morgan');
    assert.equal(body.data.identity_type, 'human');
    assert.equal(body.data.email, 'alice.morgan@northstarlabs.io');
    assert.ok(body.meta?.request_id);
  });

  test('GET /api/v1/identities/:identityId returns 404 for nonexistent UUID', async () => {
    const res = await fetch(`${baseUrl}/api/v1/identities/${NON_EXISTENT_UUID}`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.error.code, 'IDENTITY_NOT_FOUND');
    assert.ok(body.error.message.includes(NON_EXISTENT_UUID));
    assert.ok(body.error.request_id);
  });

  test('GET /api/v1/identities/:identityId returns 422 for malformed non-UUID identifier', async () => {
    const res = await fetch(`${baseUrl}/api/v1/identities/not-a-valid-uuid`);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'identityId'));
  });

  // ============================================================================
  // 3. POST /api/v1/identities (Creation)
  // ============================================================================

  test('POST /api/v1/identities creates a new canonical identity with 201 Created', async () => {
    const payload = {
      display_name: '[TEST] Unit Test User',
      identity_type: 'human',
      email: 'unit.test.user@test.identitylens.local',
      status: 'active',
      owner_id: ALICE_ID,
      department: 'Platform Engineering',
      title: 'Software Engineer'
    };

    const res = await fetch(`${baseUrl}/api/v1/identities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.id, 'Created identity must have a UUID');
    assert.equal(body.data.display_name, payload.display_name);
    assert.equal(body.data.identity_type, payload.identity_type);
    assert.equal(body.data.email, payload.email);
    assert.equal(body.data.owner_id, ALICE_ID);
    assert.ok(body.data.created_at);
    assert.ok(body.data.updated_at);
    assert.ok(body.meta?.request_id);
  });

  test('POST /api/v1/identities rejects request missing required display_name with 422', async () => {
    const payload = {
      identity_type: 'human',
      email: 'missing.name@test.identitylens.local'
    };

    const res = await fetch(`${baseUrl}/api/v1/identities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'display_name'));
  });

  test('POST /api/v1/identities rejects invalid identity_type enum value with 422', async () => {
    const payload = {
      display_name: '[TEST] Invalid Type User',
      identity_type: 'superhero'
    };

    const res = await fetch(`${baseUrl}/api/v1/identities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'identity_type'));
  });

  test('POST /api/v1/identities rejects unknown / forbidden fields via strict schema with 422', async () => {
    const payload = {
      display_name: '[TEST] Unknown Field User',
      identity_type: 'human',
      forbidden_admin_field: true
    };

    const res = await fetch(`${baseUrl}/api/v1/identities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  test('POST /api/v1/identities rejects nonexistent owner_id with 422', async () => {
    const payload = {
      display_name: '[TEST] Missing Owner User',
      identity_type: 'human',
      owner_id: NON_EXISTENT_UUID
    };

    const res = await fetch(`${baseUrl}/api/v1/identities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'owner_id'));
  });

  // ============================================================================
  // 4. PATCH /api/v1/identities/:identityId (Partial Updates & Ownership Hierarchy)
  // ============================================================================

  test('PATCH /api/v1/identities/:identityId partially updates permitted fields and touches updated_at', async () => {
    // 1. Create temporary identity to update
    const createRes = await fetch(`${baseUrl}/api/v1/identities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: '[TEST] Update Target',
        identity_type: 'human',
        email: 'patch.target@test.identitylens.local',
        title: 'Junior Engineer'
      })
    });
    const created = (await createRes.json()).data;

    // 2. Patch title and department
    const patchRes = await fetch(`${baseUrl}/api/v1/identities/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Senior Engineer',
        department: 'Security Engineering'
      })
    });

    assert.equal(patchRes.status, 200);
    const patched = (await patchRes.json()).data;
    assert.equal(patched.title, 'Senior Engineer');
    assert.equal(patched.department, 'Security Engineering');
    assert.equal(patched.display_name, created.display_name, 'Omitted fields must be preserved');
    assert.notEqual(patched.updated_at, null);
  });

  test('PATCH /api/v1/identities/:identityId rejects empty update body with 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/v1/identities/${ALICE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'BAD_REQUEST');
  });

  test('PATCH /api/v1/identities/:identityId returns 404 for nonexistent identity', async () => {
    const res = await fetch(`${baseUrl}/api/v1/identities/${NON_EXISTENT_UUID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Title' })
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error.code, 'IDENTITY_NOT_FOUND');
  });

  test('PATCH /api/v1/identities/:identityId rejects direct self-ownership with 422', async () => {
    const res = await fetch(`${baseUrl}/api/v1/identities/${ALICE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_id: ALICE_ID })
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'owner_id'));
  });

  test('PATCH /api/v1/identities/:identityId detects and blocks multi-hop circular ownership with 409 Conflict', async () => {
    // 1. Create Identity Node A
    const resA = await fetch(`${baseUrl}/api/v1/identities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: '[TEST] Node A',
        identity_type: 'human',
        email: 'node.a@test.identitylens.local'
      })
    });
    const nodeA = (await resA.json()).data;

    // 2. Create Identity Node B owned by Node A (A is owner of B)
    const resB = await fetch(`${baseUrl}/api/v1/identities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: '[TEST] Node B',
        identity_type: 'human',
        email: 'node.b@test.identitylens.local',
        owner_id: nodeA.id
      })
    });
    const nodeB = (await resB.json()).data;

    // 3. Attempt to set Node A's owner to Node B (which would create cycle: A -> B -> A)
    const resCycle = await fetch(`${baseUrl}/api/v1/identities/${nodeA.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_id: nodeB.id })
    });

    assert.equal(resCycle.status, 409);
    const body = await resCycle.json();
    assert.equal(body.error.code, 'RESOURCE_CONFLICT');
    assert.ok(body.error.message.includes('Ownership cycle detected'));
  });
});
