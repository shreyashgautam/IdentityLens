import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

describe('Backend Foundation & Health API', () => {
  let server;
  let baseUrl;

  before(async () => {
    // Bind to an ephemeral port (0) for testing
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

  test('GET /health returns 200 OK and expected status schema', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'ivip-mini-backend');
    assert.equal(body.version, '0.1.0');
    assert.ok(body.timestamp, 'Timestamp should be present');
    assert.ok(res.headers.get('x-request-id'), 'X-Request-ID header should be present');
  });

  test('GET / returns 200 OK with service description', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.message, 'IVIP Mini API Server');
    assert.equal(body.health, '/health');
  });

  test('GET /non-existent-route returns 404 with standard error format', async () => {
    const res = await fetch(`${baseUrl}/non-existent-route`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.ok(body.error, 'Error envelope should exist');
    assert.equal(body.error.code, 'NOT_FOUND');
    assert.ok(body.error.request_id, 'Request ID should be in error response');
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
