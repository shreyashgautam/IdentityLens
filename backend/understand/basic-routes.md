# Basic & Operational Routes (`basic-routes.md`)

This document covers all foundational, health, documentation, and error-handling endpoints in the IdentityLens backend.

---

## 1. Root Informational Endpoint

Returns server information, active API version gateway, and links to documentation.

- **Method**: `GET`
- **Path**: `/`
- **Auth**: None (Public)

### Example Request (curl):
```bash
curl -i http://localhost:5001/
```

### Response Headers:
```http
HTTP/1.1 200 OK
X-Request-ID: d3335737-88f9-41a5-bf0f-f751e92b0ac5
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Referrer-Policy: strict-origin-when-cross-origin
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json; charset=utf-8
```

### Response Body:
```json
{
  "message": "IVIP Mini API Server",
  "health": "/health",
  "api_base": "/api/v1",
  "docs": "/docs"
}
```

---

## 2. Overall System Health

Returns system operational status, timestamp, service name, version, and uptime in seconds.

- **Method**: `GET`
- **Path**: `/health`
- **Auth**: None (Public)

### Example Request (curl):
```bash
curl -i http://localhost:5001/health
```

### Response Headers:
```http
HTTP/1.1 200 OK
X-Request-ID: 07d37a1c-f948-48db-8a28-793b105ddcb7
Content-Type: application/json; charset=utf-8
```

### Response Body:
```json
{
  "status": "ok",
  "timestamp": "2026-10-18T09:15:39.309Z",
  "service": "ivip-mini-backend",
  "version": "0.1.0",
  "uptime_seconds": 45
}
```

---

## 3. Liveness Probe (`/health/live`)

Container orchestration probe (Kubernetes / ECS). Checks whether the Node.js event loop and process are alive.

- **Method**: `GET`
- **Path**: `/health/live`
- **Auth**: None (Public)

### Example Request (curl):
```bash
curl -i http://localhost:5001/health/live
```

### Response Body:
```json
{
  "status": "ok",
  "timestamp": "2026-10-18T09:15:56.368Z",
  "checks": {
    "process": "up"
  }
}
```

---

## 4. Readiness Probe (`/health/ready`)

Container orchestration probe. Checks whether the server is initialized and ready to receive traffic.

- **Method**: `GET`
- **Path**: `/health/ready`
- **Auth**: None (Public)

### Example Request (curl):
```bash
curl -i http://localhost:5001/health/ready
```

### Response Body:
```json
{
  "status": "ok",
  "ready": true,
  "timestamp": "2026-10-18T09:16:01.407Z",
  "checks": {
    "http": "ready",
    "database": "pending_m3"
  }
}
```
*(Note: Database status is decoupled from M2 and reports `pending_m3` until PostgreSQL connectivity is introduced in Milestone 3).*

---

## 5. Swagger Interactive Documentation (`/docs`)

Renders the interactive OpenAPI Swagger UI in any modern web browser.

- **Method**: `GET`
- **Path**: `/docs` or `/docs/`
- **Browser URL**: `http://localhost:5001/docs`

### Example Request (curl):
```bash
curl -i http://localhost:5001/docs/
```

### Response:
Returns complete HTML/JS/CSS assets bundled by `swagger-ui-express`.

---

## 6. Raw OpenAPI 3.0 Specification (`/docs/openapi.json`)

Returns the machine-readable OpenAPI 3.0.3 JSON schema for code generation, Postman import, and automated verification.

- **Method**: `GET`
- **Path**: `/docs/openapi.json`

### Example Request (curl):
```bash
curl -i http://localhost:5001/docs/openapi.json
```

### Response Body:
```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "IdentityLens (IVIP Mini) REST API",
    "version": "0.1.0"
  },
  "paths": { ... }
}
```

---

## 7. Versioned API Gateway (`/api/v1`)

Returns the operational status of the `/api/v1` gateway and directory of supported modules.

- **Method**: `GET`
- **Path**: `/api/v1`

### Example Request (curl):
```bash
curl -i http://localhost:5001/api/v1
```

### Response Body:
```json
{
  "version": "v1",
  "status": "operational",
  "endpoints": [
    "/identities",
    "/applications",
    "/accounts",
    "/entitlements",
    "/risk-findings"
  ]
}
```

---

## 8. Not Found Handler (404 Error Envelope)

Demonstrates the safe client-facing error envelope when an unmatched route is requested.

- **Method**: `ANY`
- **Path**: `/non-existent-route`

### Example Request (curl):
```bash
curl -i http://localhost:5001/random-route
```

### Response Headers:
```http
HTTP/1.1 404 Not Found
X-Request-ID: 6949c597-3d20-4d9f-be72-78f0a1d66017
Content-Type: application/json; charset=utf-8
```

### Response Body:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found: Cannot GET /random-route",
    "request_id": "6949c597-3d20-4d9f-be72-78f0a1d66017"
  }
}
```

---

## 9. Custom `X-Request-ID` Trace Correlation

Demonstrates client-supplied correlation IDs preserved by `backend/src/middlewares/request-id.js`.

### Example Request (curl):
```bash
curl -i -H "X-Request-ID: custom-client-trace-777" http://localhost:5001/health
```

### Response Headers:
```http
HTTP/1.1 200 OK
X-Request-ID: custom-client-trace-777
```
