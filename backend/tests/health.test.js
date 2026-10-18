import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

describe('Backend Foundation & Health Probes API', () => {
  let server;
  let baseUrl;

  before(async () => {
    // Bind to an ephemeral port (0) for testing without port conflicts
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('GET /health returns 200 OK and expected system metadata schema', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'ivip-mini-backend');
    assert.equal(body.version, '0.1.0');
    assert.ok(typeof body.uptime_seconds === 'number');
    assert.ok(body.timestamp, 'Timestamp should be present');
    assert.ok(res.headers.get('x-request-id'), 'X-Request-ID header should be present');
  });

  test('GET /health/live returns 200 OK for liveness probe', async () => {
    const res = await fetch(`${baseUrl}/health/live`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.checks.process, 'up');
    assert.ok(body.timestamp);
  });

  test('GET /health/ready returns 200 OK for readiness probe', async () => {
    const res = await fetch(`${baseUrl}/health/ready`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.ready, true);
    assert.equal(body.checks.http, 'ready');
    assert.equal(body.checks.database, 'pending_m3');
  });

  test('GET / returns 200 OK with service description and docs route', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.message, 'IVIP Mini API Server');
    assert.equal(body.health, '/health');
    assert.equal(body.docs, '/docs');
  });

  test('GET /docs returns 200/301 for Swagger UI documentation', async () => {
    const res = await fetch(`${baseUrl}/docs/`);
    assert.ok(res.status === 200 || res.status === 301);
  });

  test('GET /docs/openapi.json returns 200 OK with OpenAPI 3.0 specification', async () => {
    const res = await fetch(`${baseUrl}/docs/openapi.json`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.openapi, '3.0.3');
    assert.equal(body.info.title, 'IdentityLens (IVIP Mini) REST API');
    assert.ok(body.paths['/health']);
    assert.ok(body.paths['/api/v1/identities']);
  });

  test('Preserves incoming X-Request-ID when provided by client', async () => {
    const customId = 'test-custom-req-id-12345';
    const res = await fetch(`${baseUrl}/health`, {
      headers: { 'X-Request-ID': customId }
    });
    assert.equal(res.headers.get('x-request-id'), customId);
  });

  test('Security response headers are properly configured', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('x-xss-protection'), '0');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  });

  test('GET /non-existent-route returns 404 with standard error envelope', async () => {
    const res = await fetch(`${baseUrl}/non-existent-route`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.ok(body.error, 'Error envelope should exist');
    assert.equal(body.error.code, 'NOT_FOUND');
    assert.ok(body.error.message.includes('Cannot GET /non-existent-route'));
    assert.ok(body.error.request_id, 'Request ID should be present in error response');
  });

  test('GET /api/v1 returns 200 OK with versioned operational status', async () => {
    const res = await fetch(`${baseUrl}/api/v1`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.version, 'v1');
    assert.equal(body.status, 'operational');
    assert.ok(Array.isArray(body.endpoints));
  });
});
