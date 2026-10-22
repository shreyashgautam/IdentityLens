import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { query, closePool } from '../src/database/connection.js';

describe('Milestone 5 — Entitlements & Access Relationships Integration Suite', () => {
  let server;
  let baseUrl;

  // Track exact IDs and assignment keys for safe, targeted cleanup
  const createdEntitlementIds = new Set();
  const createdAssignments = new Set(); // format: `${accountId}:${entitlementId}`

  const registerEntitlementId = (id) => {
    if (id) createdEntitlementIds.add(id);
  };

  const registerAssignment = (accountId, entitlementId) => {
    if (accountId && entitlementId) {
      createdAssignments.add(`${accountId}:${entitlementId}`);
    }
  };

  // Known seed IDs from Northstar Labs dataset for read assertions
  const AWS_APP_ID = 'b0000000-0000-0000-0000-000000000001';
  const GITHUB_APP_ID = 'b0000000-0000-0000-0000-000000000002';

  const AWS_BEN_ACCOUNT_ID = 'c0000000-0000-0000-0000-000000000001';
  const AWS_NINA_ACCOUNT_ID = 'c0000000-0000-0000-0000-000000000002';
  const GITHUB_ALICE_ACCOUNT_ID = 'c0000000-0000-0000-0000-000000000005';

  const AWS_ADMIN_ENT_ID = 'd0000000-0000-0000-0000-000000000001';
  const AWS_AUDIT_ENT_ID = 'd0000000-0000-0000-0000-000000000002';
  const AWS_EC2_ENT_ID = 'd0000000-0000-0000-0000-000000000003';
  const GITHUB_OWNER_ENT_ID = 'd0000000-0000-0000-0000-000000000004';

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
  });

  after(async () => {
    const cleanupErrors = [];

    // Technical safeguard 2: Clean up tracked assignments independently
    try {
      if (createdAssignments.size > 0) {
        for (const key of createdAssignments) {
          const [accId, entId] = key.split(':');
          await query(
            'DELETE FROM account_entitlements WHERE account_id = $1 AND entitlement_id = $2',
            [accId, entId]
          );
        }
      }
    } catch (err) {
      console.error('[Teardown] Failed to clean up tracked assignments:', err);
      cleanupErrors.push(err);
    }

    // Technical safeguard 2: Clean up tracked entitlement definitions independently
    try {
      if (createdEntitlementIds.size > 0) {
        const ids = Array.from(createdEntitlementIds);
        await query('DELETE FROM entitlements WHERE id = ANY($1::uuid[])', [ids]);
      }
    } catch (err) {
      console.error('[Teardown] Failed to clean up tracked entitlement definitions:', err);
      cleanupErrors.push(err);
    }

    // Technical safeguard 2: Always close server and pool in finally
    try {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
      await closePool();
    } catch (err) {
      console.error('[Teardown] Failed to close server or pool:', err);
      cleanupErrors.push(err);
    }

    // Technical safeguard 2: Report cleanup failures and fail the run if cleanup fails
    if (cleanupErrors.length > 0) {
      throw new Error(
        `Test teardown encountered ${cleanupErrors.length} failure(s): ${cleanupErrors
          .map((e) => e.message)
          .join('; ')}`
      );
    }
  });

  // ============================================================================
  // 1. GET /api/v1/entitlements (Listing, Pagination, Filtering, Search, Sorting)
  // ============================================================================

  test('GET /api/v1/entitlements returns 200 with collection envelope and pagination metadata', async () => {
    const res = await fetch(`${baseUrl}/api/v1/entitlements`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.data), 'data should be an array');
    assert.ok(body.pagination, 'pagination object must exist');
    assert.equal(body.pagination.page, 1);
    assert.equal(body.pagination.limit, 20);
    assert.ok(typeof body.pagination.total === 'number');
    assert.ok(typeof body.pagination.total_pages === 'number');
    assert.equal(body.pagination.has_prev, false);
    assert.ok(body.meta?.request_id, 'request_id must be in meta');
  });

  test('GET /api/v1/entitlements pagination respects page and limit parameters', async () => {
    const res = await fetch(`${baseUrl}/api/v1/entitlements?page=1&limit=3`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.data.length, 3);
    assert.equal(body.pagination.limit, 3);
    assert.equal(body.pagination.page, 1);
    assert.equal(body.pagination.has_next, true);
  });

  test('GET /api/v1/entitlements rejects limit exceeding maximum of 100 with 422', async () => {
    const res = await fetch(`${baseUrl}/api/v1/entitlements?limit=150`);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'limit'));
  });

  test('GET /api/v1/entitlements rejects invalid page <= 0 with 422', async () => {
    const res = await fetch(`${baseUrl}/api/v1/entitlements?page=0`);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'page'));
  });

  test('GET /api/v1/entitlements filters by application_id and type', async () => {
    const res = await fetch(
      `${baseUrl}/api/v1/entitlements?application_id=${AWS_APP_ID}&type=role`
    );
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.data.length > 0);
    assert.ok(body.data.every((e) => e.application_id === AWS_APP_ID && e.type === 'role'));
  });

  test('GET /api/v1/entitlements filters by is_privileged boolean', async () => {
    const res = await fetch(`${baseUrl}/api/v1/entitlements?is_privileged=true`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.data.length > 0);
    assert.ok(body.data.every((e) => e.is_privileged === true));
  });

  test('GET /api/v1/entitlements sorts by allowlisted column name asc and desc', async () => {
    const resAsc = await fetch(`${baseUrl}/api/v1/entitlements?sort_by=name&sort_order=asc`);
    assert.equal(resAsc.status, 200);
    const bodyAsc = await resAsc.json();
    const namesAsc = bodyAsc.data.map((e) => e.name);
    const sortedAsc = [...namesAsc].sort((a, b) => a.localeCompare(b));
    assert.deepEqual(namesAsc, sortedAsc);

    const resDesc = await fetch(`${baseUrl}/api/v1/entitlements?sort_by=name&sort_order=desc`);
    assert.equal(resDesc.status, 200);
    const bodyDesc = await resDesc.json();
    const namesDesc = bodyDesc.data.map((e) => e.name);
    const sortedDesc = [...namesDesc].sort((a, b) => b.localeCompare(a));
    assert.deepEqual(namesDesc, sortedDesc);
  });

  test('GET /api/v1/entitlements rejects unallowed sort column with 422', async () => {
    const res = await fetch(`${baseUrl}/api/v1/entitlements?sort_by=password`);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'sort_by'));
  });

  test('GET /api/v1/entitlements search matches name or description case-insensitively', async () => {
    const res = await fetch(`${baseUrl}/api/v1/entitlements?search=administrator`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.data.length > 0);
    assert.ok(
      body.data.some(
        (e) =>
          e.name.toLowerCase().includes('administrator') ||
          (e.description && e.description.toLowerCase().includes('administrator'))
      )
    );
  });

  // ============================================================================
  // 2. GET /api/v1/entitlements/:entitlementId (Single Resource Lookup)
  // ============================================================================

  test('GET /api/v1/entitlements/:entitlementId retrieves existing seed entitlement', async () => {
    const res = await fetch(`${baseUrl}/api/v1/entitlements/${AWS_ADMIN_ENT_ID}`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.data.id, AWS_ADMIN_ENT_ID);
    assert.equal(body.data.name, 'AdministratorAccess');
    assert.equal(body.data.is_privileged, true);
    assert.equal(body.data.type, 'role');
    assert.ok(body.meta?.request_id);
  });

  test('GET /api/v1/entitlements/:entitlementId returns 404 for nonexistent UUID', async () => {
    const res = await fetch(`${baseUrl}/api/v1/entitlements/${NON_EXISTENT_UUID}`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.error.code, 'ENTITLEMENT_NOT_FOUND');
  });

  test('GET /api/v1/entitlements/:entitlementId returns 422 for malformed non-UUID', async () => {
    const res = await fetch(`${baseUrl}/api/v1/entitlements/not-a-valid-uuid`);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  // ============================================================================
  // 3. POST /api/v1/entitlements (Create Entitlement Definition)
  // ============================================================================

  test('POST /api/v1/entitlements creates a new entitlement definition with 201 Created', async () => {
    const uniqueName = `S3ReadOnly-${Date.now()}`;
    const payload = {
      application_id: AWS_APP_ID,
      name: uniqueName,
      type: 'role',
      description: 'Test S3 read-only access for unit tests',
      is_privileged: false
    };

    const res = await fetch(`${baseUrl}/api/v1/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.id);
    registerEntitlementId(body.data.id);

    assert.equal(body.data.name, uniqueName);
    assert.equal(body.data.application_id, AWS_APP_ID);
    assert.equal(body.data.type, 'role');
    assert.equal(body.data.is_privileged, false);
    assert.ok(body.data.created_at);
    assert.ok(body.data.updated_at);
  });

  test('POST /api/v1/entitlements rejects request missing required name with 422', async () => {
    const payload = {
      application_id: AWS_APP_ID,
      type: 'role'
    };

    const res = await fetch(`${baseUrl}/api/v1/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'name'));
  });

  test('POST /api/v1/entitlements rejects request missing required application_id with 422', async () => {
    const payload = {
      name: 'NoAppRole',
      type: 'role'
    };

    const res = await fetch(`${baseUrl}/api/v1/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'application_id'));
  });

  test('POST /api/v1/entitlements rejects invalid type enum value with 422', async () => {
    const payload = {
      application_id: AWS_APP_ID,
      name: 'InvalidTypeRole',
      type: 'superpower'
    };

    const res = await fetch(`${baseUrl}/api/v1/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'type'));
  });

  test('POST /api/v1/entitlements rejects unknown fields via strict schema with 422', async () => {
    const payload = {
      application_id: AWS_APP_ID,
      name: 'HackerRole',
      type: 'role',
      isAdminUser: true
    };

    const res = await fetch(`${baseUrl}/api/v1/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  test('POST /api/v1/entitlements rejects nonexistent application_id with 422', async () => {
    const payload = {
      application_id: NON_EXISTENT_UUID,
      name: 'GhostAppRole',
      type: 'role'
    };

    const res = await fetch(`${baseUrl}/api/v1/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.some((d) => d.field === 'application_id'));
  });

  test('POST /api/v1/entitlements rejects duplicate (application_id, name) with 409 Conflict', async () => {
    const payload = {
      application_id: AWS_APP_ID,
      name: 'AdministratorAccess', // Clashes with seed AWS entitlement
      type: 'role'
    };

    const res = await fetch(`${baseUrl}/api/v1/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error.code, 'RESOURCE_CONFLICT');
  });

  // ============================================================================
  // 4. PATCH /api/v1/entitlements/:entitlementId (Partial Update)
  // ============================================================================

  test('PATCH /api/v1/entitlements/:entitlementId partially updates permitted fields and touches updated_at', async () => {
    // First create an entitlement to update safely without touching seed data
    const createRes = await fetch(`${baseUrl}/api/v1/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        application_id: AWS_APP_ID,
        name: `PatchTarget-${Date.now()}`,
        type: 'role',
        description: 'Original description',
        is_privileged: false
      })
    });
    const created = await createRes.json();
    const entId = created.data.id;
    registerEntitlementId(entId);

    const updatePayload = {
      description: 'Updated description for patch test',
      is_privileged: true
    };

    const res = await fetch(`${baseUrl}/api/v1/entitlements/${entId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.description, 'Updated description for patch test');
    assert.equal(body.data.is_privileged, true);
    assert.ok(new Date(body.data.updated_at) >= new Date(created.data.updated_at));
  });

  test('PATCH /api/v1/entitlements/:entitlementId rejects empty update body with 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/v1/entitlements/${AWS_ADMIN_ENT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'BAD_REQUEST');
  });

  test('PATCH /api/v1/entitlements/:entitlementId returns 404 for nonexistent entitlement', async () => {
    const res = await fetch(`${baseUrl}/api/v1/entitlements/${NON_EXISTENT_UUID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'New description' })
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error.code, 'ENTITLEMENT_NOT_FOUND');
  });

  test('PATCH /api/v1/entitlements/:entitlementId rejects updating name to an existing name in same app with 409 Conflict', async () => {
    // Create an entitlement
    const createRes = await fetch(`${baseUrl}/api/v1/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        application_id: AWS_APP_ID,
        name: `NameToClash-${Date.now()}`,
        type: 'role'
      })
    });
    const created = await createRes.json();
    registerEntitlementId(created.data.id);

    // Try to update name to existing seed name 'AdministratorAccess' in same app
    const res = await fetch(`${baseUrl}/api/v1/entitlements/${created.data.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'AdministratorAccess' })
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error.code, 'RESOURCE_CONFLICT');
  });

  // ============================================================================
  // 5. GET /api/v1/accounts/:accountId/entitlements (List Account Entitlements)
  // ============================================================================

  test('GET /api/v1/accounts/:accountId/entitlements returns 200 with list of assigned entitlements', async () => {
    const res = await fetch(`${baseUrl}/api/v1/accounts/${AWS_BEN_ACCOUNT_ID}/entitlements`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.data), 'data should be an array');
    assert.ok(body.pagination);
    assert.ok(body.data.length >= 2, 'Ben in AWS has at least 2 seed entitlements');

    const first = body.data[0];
    assert.ok(first.id);
    assert.ok(first.name);
    assert.ok(first.assigned_at);
    assert.ok(body.meta?.request_id);
  });

  test('GET /api/v1/accounts/:accountId/entitlements returns 404 for nonexistent account UUID', async () => {
    const res = await fetch(`${baseUrl}/api/v1/accounts/${NON_EXISTENT_UUID}/entitlements`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.error.code, 'ACCOUNT_NOT_FOUND');
  });

  test('GET /api/v1/accounts/:accountId/entitlements filters by type and is_privileged', async () => {
    const res = await fetch(
      `${baseUrl}/api/v1/accounts/${AWS_BEN_ACCOUNT_ID}/entitlements?type=role&is_privileged=true`
    );
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.data.length > 0);
    assert.ok(body.data.every((e) => e.type === 'role' && e.is_privileged === true));
  });

  // ============================================================================
  // 6. POST /api/v1/accounts/:accountId/entitlements (Assign Entitlement to Account)
  // ============================================================================

  test('POST /api/v1/accounts/:accountId/entitlements assigns entitlement in transaction with 201 Created', async () => {
    // Create a new entitlement in AWS app
    const entRes = await fetch(`${baseUrl}/api/v1/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        application_id: AWS_APP_ID,
        name: `DynamoDBDev-${Date.now()}`,
        type: 'role'
      })
    });
    const ent = await entRes.json();
    const entId = ent.data.id;
    registerEntitlementId(entId);

    // Assign to Nina's AWS account
    const res = await fetch(`${baseUrl}/api/v1/accounts/${AWS_NINA_ACCOUNT_ID}/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entitlement_id: entId
      })
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.account_id, AWS_NINA_ACCOUNT_ID);
    assert.equal(body.data.entitlement_id, entId);
    assert.ok(body.data.assigned_at);
    registerAssignment(AWS_NINA_ACCOUNT_ID, entId);
  });

  test('POST /api/v1/accounts/:accountId/entitlements returns 404 for nonexistent account UUID', async () => {
    const res = await fetch(`${baseUrl}/api/v1/accounts/${NON_EXISTENT_UUID}/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entitlement_id: AWS_ADMIN_ENT_ID })
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error.code, 'ACCOUNT_NOT_FOUND');
  });

  test('POST /api/v1/accounts/:accountId/entitlements returns 422 for nonexistent entitlement UUID', async () => {
    const res = await fetch(`${baseUrl}/api/v1/accounts/${AWS_NINA_ACCOUNT_ID}/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entitlement_id: NON_EXISTENT_UUID })
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  test('POST /api/v1/accounts/:accountId/entitlements enforces application boundary and blocks cross-app assignment with 422', async () => {
    // Attempt to assign GitHub entitlement (App b02) to AWS account (App b01)
    const res = await fetch(`${baseUrl}/api/v1/accounts/${AWS_NINA_ACCOUNT_ID}/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entitlement_id: GITHUB_OWNER_ENT_ID })
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(
      body.error.details.some((d) =>
        d.message.includes('Cross-application entitlement assignment is forbidden')
      )
    );
  });

  test('POST /api/v1/accounts/:accountId/entitlements detects duplicate assignment and returns 409 Conflict', async () => {
    // Seed data: Ben's account already has AWS_ADMIN_ENT_ID
    const res = await fetch(`${baseUrl}/api/v1/accounts/${AWS_BEN_ACCOUNT_ID}/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entitlement_id: AWS_ADMIN_ENT_ID })
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error.code, 'RESOURCE_CONFLICT');
  });

  // ============================================================================
  // 7. DELETE /api/v1/accounts/:accountId/entitlements/:entitlementId (Unassign)
  // ============================================================================

  test('DELETE /api/v1/accounts/:accountId/entitlements/:entitlementId removes assignment with 204 No Content', async () => {
    // 1. Create a test entitlement
    const entRes = await fetch(`${baseUrl}/api/v1/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        application_id: AWS_APP_ID,
        name: `DeleteTestRole-${Date.now()}`,
        type: 'role'
      })
    });
    const ent = await entRes.json();
    const entId = ent.data.id;
    registerEntitlementId(entId);

    // 2. Assign to Nina's AWS account
    const assignRes = await fetch(`${baseUrl}/api/v1/accounts/${AWS_NINA_ACCOUNT_ID}/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entitlement_id: entId })
    });
    assert.equal(assignRes.status, 201);
    registerAssignment(AWS_NINA_ACCOUNT_ID, entId);

    // 3. Delete assignment
    const delRes = await fetch(
      `${baseUrl}/api/v1/accounts/${AWS_NINA_ACCOUNT_ID}/entitlements/${entId}`,
      { method: 'DELETE' }
    );
    assert.equal(delRes.status, 204);

    // 4. Verify assignment is gone (subsequent delete returns 404)
    const secondDel = await fetch(
      `${baseUrl}/api/v1/accounts/${AWS_NINA_ACCOUNT_ID}/entitlements/${entId}`,
      { method: 'DELETE' }
    );
    assert.equal(secondDel.status, 404);

    // 5. Verify the entitlement definition still exists in the database
    const entLookup = await fetch(`${baseUrl}/api/v1/entitlements/${entId}`);
    assert.equal(entLookup.status, 200, 'Entitlement definition must NOT be deleted');

    // 6. Verify the account still exists in the database
    const accLookup = await fetch(`${baseUrl}/api/v1/accounts/${AWS_NINA_ACCOUNT_ID}`);
    assert.equal(accLookup.status, 200, 'Account must NOT be deleted');
  });

  test('DELETE /api/v1/accounts/:accountId/entitlements/:entitlementId returns 404 when assignment does not exist', async () => {
    // Nina does not have EC2FullAccess in seed data
    const res = await fetch(
      `${baseUrl}/api/v1/accounts/${AWS_NINA_ACCOUNT_ID}/entitlements/${AWS_EC2_ENT_ID}`,
      { method: 'DELETE' }
    );
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error.code, 'ASSIGNMENT_NOT_FOUND');
  });

  test('DELETE /api/v1/accounts/:accountId/entitlements/:entitlementId returns 422 for malformed non-UUID param', async () => {
    const res = await fetch(
      `${baseUrl}/api/v1/accounts/${AWS_NINA_ACCOUNT_ID}/entitlements/not-a-valid-uuid`,
      { method: 'DELETE' }
    );
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });
});
