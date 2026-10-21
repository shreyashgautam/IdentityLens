# Identity Inventory Routes Guide (`identity-routes.md`)

This document provides a comprehensive architectural and operational reference for the **Identity Inventory API** (`/api/v1/identities`) implemented in **Milestone 4 — Part 1**.

It details the concepts, design decisions, parameter rationales, Swagger OpenAPI representations, and copy-pasteable `curl` commands for all supported operations and error scenarios.

---

## 1. Domain Overview & Architectural Foundation

### 1.1 What is a Canonical Identity?
In **IdentityLens**, an **Identity** represents a real-world entity (human employee, contractor, service account, or automated bot). It is the single source of truth across the organization.

An **Identity** is distinct from an **Account**:
- An **Identity** is the person or autonomous system (e.g., `Dr. Alice Morgan`).
- An **Account** is a specific credential or profile within a target SaaS application (e.g., `alice.morgan` in GitHub, `usr-aws-alice` in AWS, `alice@northstarlabs.io` in Google Workspace).
- One canonical identity can be associated with multiple target accounts across connected systems.

```
+-------------------------------------------------------------+
|               Canonical Identity (identities)               |
|            display_name: "Dr. Alice Morgan"                 |
|             id: a0000000-0000-0000-0000-000000000001        |
+-------------------------------------------------------------+
            │                      │                      │
            ▼                      ▼                      ▼
    +---------------+      +---------------+      +---------------+
    |  AWS Account  |      |  GitHub Acct  |      | Google Acct   |
    | (accounts)    |      | (accounts)    |      | (accounts)    |
    +---------------+      +---------------+      +---------------+
```

### 1.2 Strict Monolith Architecture Flow
The Identity module strictly conforms to the repository dependency flow:
$$\text{Routes} \longrightarrow \text{Controllers} \longrightarrow \text{Services} \longrightarrow \text{Repositories} \longrightarrow \text{PostgreSQL}$$

- **`identity.routes.js`**: Declares endpoints, attaches input validation middlewares, and intercepts empty update bodies.
- **`identity.controller.js`**: Unpacks validated inputs (`req.validatedParams`, `req.validatedQuery`, `req.validatedBody`) and formats standard HTTP responses.
- **`identity.service.js`**: Enforces business logic, calculates pagination offsets and total pages, checks owner existence, and blocks recursive ownership cycles.
- **`identity.repository.js`**: Owns raw parameterized SQL (`$1, $2, ...`), sort allowlists, and the recursive Common Table Expression (CTE) cycle checker.
- **`identity.validation.js`**: Declares Zod schemas rejecting malformed queries, invalid UUIDs, and unknown payload properties (`.strict()`).

---

## 2. When to Use Each Route & Lifecycle Decisions

| Endpoint | Method | Operational Purpose | Typical When-to-Use Scenario |
| :--- | :--- | :--- | :--- |
| `/api/v1/identities` | `GET` | Paginated listing with filtering, sorting, and search | Rendering the main identity directory table in UI; running automated compliance scans; searching employees by keyword. |
| `/api/v1/identities/:identityId` | `GET` | Single canonical identity lookup | Viewing an identity's profile page; verifying identity metadata before account correlation. |
| `/api/v1/identities` | `POST` | Create a new canonical identity | HR onboarding integration; registering a new deployment service account or automated bot. |
| `/api/v1/identities/:identityId` | `PATCH` | Partially update permitted identity fields | Department transfers; job title promotions; updating reporting manager (`owner_id`); soft-deactivating leaving employees (`status: 'inactive'`). |

### Why `DELETE` is Excluded
`DELETE /api/v1/identities/:identityId` is deliberately **not implemented**:
1. **Audit Evidence Preservation**: In the database schema, deleting an identity triggers `ON DELETE CASCADE` on `risk_findings`, which would silently destroy historical compliance and security findings.
2. **Account Disassociation**: Deleting an identity sets `accounts.identity_id = NULL`, converting linked accounts into unmanaged orphan accounts without an audit trail.
3. **Deactivation Policy**: Per `docs/data-model.md` Section 10, identities are deactivated rather than deleted:
   ```json
   PATCH /api/v1/identities/:identityId
   { "status": "inactive" }
   ```
   *(When an identity becomes inactive, the deterministic risk engine automatically detects any associated accounts that remain active under Rule 2: `INACTIVE_USER_ACTIVE_ACCOUNT`).*

---

## 3. Parameter Deep-Dive & Design Rationales

### 3.1 Pagination (`page` and `limit`)
- **`page` (integer, default: 1)**: 1-indexed page pointer. Negative or zero numbers are rejected with `422 Unprocessable Entity`.
- **`limit` (integer, default: 20, max: 100)**: Bounded ceiling. Enforces that queries never perform unbounded table scans or exhaust server memory. Requesting `limit > 100` returns `422`.
- **Offset Math**: The service converts this to `OFFSET = (page - 1) * limit`.
- **Stable Secondary Sort**: The repository appends `id ASC` as a tie-breaker after any requested sort column, preventing pagination jitter where records swap positions between pages.

### 3.2 Filtering (`status`, `identity_type`, `department`)
- **`status`**: Validated against enum `['active', 'inactive', 'suspended', 'unknown']`. Matches the database check constraint and the index `idx_identities_status`.
- **`identity_type`**: Validated against enum `['human', 'service_account', 'bot', 'ai_agent']`. Allows security auditors to filter specifically for machine accounts.
- **`department`**: Trimmed string up to 100 characters.

### 3.3 Search (`search`)
- Searches across `display_name`, `email`, `title`, and `department` simultaneously using case-insensitive PostgreSQL pattern matching (`ILIKE $N`).
- Avoids multiple frontend calls by providing unified keyword searching across primary human-readable attributes.

### 3.4 Sorting (`sort_by` and `sort_order`)
- **SQL Injection Defense**: Dynamic column interpolation into SQL queries is an OWASP Top 10 vulnerability. The repository uses an **explicit allowlist**:
  ```javascript
  ['display_name', 'email', 'status', 'identity_type', 'department', 'created_at', 'updated_at']
  ```
  Any unrecognized sort column is rejected by Zod before reaching the database.
- **`sort_order`**: Restricted to `asc` or `desc` (default: `desc`).

### 3.5 Ownership Hierarchy & Cycle Prevention (`owner_id`)
The `owner_id` attribute models reporting hierarchies and service-account ownership:
- **Direct Self-Ownership Rejection**: An identity cannot own itself (`owner_id === identityId`). Handled both by Zod/service logic and PostgreSQL check constraint `chk_identities_not_self_owner`.
- **Nonexistent Owner Rejection**: If `owner_id` is specified, the service queries `identities.id` to verify the owner exists. Throws `422 VALIDATION_ERROR` if missing.
- **Multi-Hop Circular Dependency Prevention**: If User A is owned by User B, setting User B's owner to User A forms a loop ($A \to B \to A$). The service executes a PostgreSQL recursive CTE tracing up to 25 ancestral hops:
  ```sql
  WITH RECURSIVE owner_chain AS (
    SELECT id, owner_id, 1 AS depth FROM identities WHERE id = $1
    UNION ALL
    SELECT i.id, i.owner_id, oc.depth + 1
    FROM identities i JOIN owner_chain oc ON i.id = oc.owner_id
    WHERE oc.owner_id IS NOT NULL AND oc.depth < 25
  )
  SELECT 1 FROM owner_chain WHERE id = $2 LIMIT 1;
  ```
  If detected, the update is rejected with **`409 Conflict`** (`code: 'RESOURCE_CONFLICT'`).

### 3.6 Strict Request Payloads (`.strict()`)
Both `createIdentityBodySchema` and `updateIdentityBodySchema` enforce Zod's `.strict()` mode:
- Rejects unexpected or forbidden properties (e.g., client-supplied `id`, `created_at`, `updated_at`, or arbitrary injected parameters).
- Prevents mass-assignment vulnerabilities.

---

## 4. Interactive Swagger Documentation Mapping

All Identity routes are documented in the OpenAPI 3.0 specification served at:
- **Interactive UI**: `GET http://localhost:5001/docs`
- **Raw OpenAPI Spec**: `GET http://localhost:5001/docs/openapi.json`

| OpenAPI Tag | Endpoint | Swagger Path | Key Component Schema |
| :--- | :--- | :--- | :--- |
| `Identities` | List Identities | `/api/v1/identities` (`GET`) | `#/components/schemas/IdentityCollectionResponse` |
| `Identities` | Create Identity | `/api/v1/identities` (`POST`) | `#/components/schemas/CreateIdentityInput` |
| `Identities` | Get Identity | `/api/v1/identities/{identityId}` (`GET`) | `#/components/schemas/IdentitySingleResponse` |
| `Identities` | Update Identity | `/api/v1/identities/{identityId}` (`PATCH`) | `#/components/schemas/IdentitySingleResponse` |

---

## 5. Detailed Endpoint Reference & Curl Commands

### 5.1 List Canonical Identities

Retrieves a paginated collection of canonical identities matching optional filters and search keywords.

- **Method**: `GET`
- **URL**: `http://localhost:5001/api/v1/identities`
- **Query Parameters**:
  - `page` *(integer, optional, default: 1)*: Page number ($\ge 1$).
  - `limit` *(integer, optional, default: 20)*: Page size ($1 \le \text{limit} \le 100$).
  - `status` *(string, optional)*: `active` \| `inactive` \| `suspended` \| `unknown`.
  - `identity_type` *(string, optional)*: `human` \| `service_account` \| `bot` \| `ai_agent`.
  - `department` *(string, optional)*: Exact department name.
  - `search` *(string, optional)*: Substring search across name, email, title, and department.
  - `sort_by` *(string, optional, default: 'created_at')*: Allowlisted column name.
  - `sort_order` *(string, optional, default: 'desc')*: `asc` \| `desc`.

#### Swagger Spec Excerpt:
```yaml
get:
  summary: List Canonical Identities
  tags: [Identities]
  parameters:
    - name: page
      in: query
      schema: { type: integer, default: 1, minimum: 1 }
    - name: limit
      in: query
      schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
```

#### Curl Command (Success — Pagination & Filter):
```bash
curl -i "http://localhost:5001/api/v1/identities?page=1&limit=2&status=active&sort_by=display_name&sort_order=asc"
```

#### Response Body (`200 OK`):
```json
{
  "data": [
    {
      "id": "a0000000-0000-0000-0000-000000000002",
      "display_name": "Ben Carter",
      "identity_type": "human",
      "email": "ben.carter@northstarlabs.io",
      "status": "active",
      "owner_id": "a0000000-0000-0000-0000-000000000001",
      "department": "Platform & Infrastructure",
      "title": "Principal DevOps Engineer",
      "created_at": "2026-10-18T16:19:26.086Z",
      "updated_at": "2026-10-18T16:19:42.527Z"
    },
    {
      "id": "a0000000-0000-0000-0000-000000000006",
      "display_name": "David Kim",
      "identity_type": "human",
      "email": "david.kim@northstarlabs.io",
      "status": "active",
      "owner_id": "a0000000-0000-0000-0000-000000000001",
      "department": "Engineering Leadership",
      "title": "Director of Software Engineering",
      "created_at": "2026-10-18T16:19:26.086Z",
      "updated_at": "2026-10-18T16:19:42.527Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 2,
    "total": 8,
    "total_pages": 4,
    "has_next": true,
    "has_prev": false
  },
  "meta": {
    "request_id": "c1f7b822-4211-4f81-a901-729909ef4302"
  }
}
```

#### Curl Command (Error — Limit Exceeds Maximum):
```bash
curl -i "http://localhost:5001/api/v1/identities?limit=150"
```

#### Response Body (`422 Unprocessable Entity`):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "request_id": "7bba2a16-af99-43de-afa7-d48e741d533d",
    "details": [
      {
        "field": "limit",
        "message": "Limit cannot exceed 100"
      }
    ]
  }
}
```

---

### 5.2 Retrieve Identity by ID

Retrieves complete profile details for a canonical identity by UUID.

- **Method**: `GET`
- **URL**: `http://localhost:5001/api/v1/identities/:identityId`
- **Path Parameters**:
  - `identityId` *(UUID, required)*: Valid UUID v4.

#### Swagger Spec Excerpt:
```yaml
get:
  summary: Get Identity Details
  tags: [Identities]
  parameters:
    - name: identityId
      in: path
      required: true
      schema: { type: string, format: uuid }
```

#### Curl Command (Success — Dr. Alice Morgan):
```bash
curl -i "http://localhost:5001/api/v1/identities/a0000000-0000-0000-0000-000000000001"
```

#### Response Body (`200 OK`):
```json
{
  "data": {
    "id": "a0000000-0000-0000-0000-000000000001",
    "display_name": "Dr. Alice Morgan",
    "identity_type": "human",
    "email": "alice.morgan@northstarlabs.io",
    "status": "active",
    "owner_id": null,
    "department": "Engineering Leadership",
    "title": "VP of Engineering",
    "created_at": "2026-10-18T16:19:26.086Z",
    "updated_at": "2026-10-18T16:19:42.527Z"
  },
  "meta": {
    "request_id": "dae9947a-c192-4164-ae10-b556eca0daae"
  }
}
```

#### Curl Command (Error — Nonexistent UUID):
```bash
curl -i "http://localhost:5001/api/v1/identities/e0000000-0000-0000-0000-000000000999"
```

#### Response Body (`404 Not Found`):
```json
{
  "error": {
    "code": "IDENTITY_NOT_FOUND",
    "message": "Identity with ID 'e0000000-0000-0000-0000-000000000999' not found",
    "request_id": "51462ce6-27a2-49c0-8dc3-f6ead440789f"
  }
}
```

#### Curl Command (Error — Invalid UUID Format):
```bash
curl -i "http://localhost:5001/api/v1/identities/not-a-valid-uuid"
```

#### Response Body (`422 Unprocessable Entity`):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "request_id": "020d8664-8053-4cc7-9f8b-6e13a29ed808",
    "details": [
      {
        "field": "identityId",
        "message": "Identity ID must be a valid UUID"
      }
    ]
  }
}
```

---

### 5.3 Create Identity

Creates a new canonical identity. Request payload is strictly validated using Zod.

- **Method**: `POST`
- **URL**: `http://localhost:5001/api/v1/identities`
- **Headers**: `Content-Type: application/json`
- **Request Body Fields**:
  - `display_name` *(string, required)*: 1–255 characters.
  - `identity_type` *(string, required)*: `human` \| `service_account` \| `bot` \| `ai_agent`.
  - `email` *(string, optional, nullable)*: Valid email format, max 255 chars.
  - `status` *(string, optional, default: 'active')*: Enum status.
  - `owner_id` *(UUID, optional, nullable)*: UUID of an existing identity.
  - `department` *(string, optional, nullable)*: Max 100 characters.
  - `title` *(string, optional, nullable)*: Max 150 characters.

#### Swagger Spec Excerpt:
```yaml
post:
  summary: Create Identity
  tags: [Identities]
  requestBody:
    required: true
    content:
      application/json:
        schema: { $ref: '#/components/schemas/CreateIdentityInput' }
  responses:
    '201':
      description: Identity created successfully
    '422':
      description: Validation Error
```

#### Curl Command (Success — Create Human Identity):
```bash
curl -i -X POST "http://localhost:5001/api/v1/identities" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Elena Rostova",
    "identity_type": "human",
    "email": "elena.rostova@northstarlabs.io",
    "status": "active",
    "owner_id": "a0000000-0000-0000-0000-000000000001",
    "department": "Security Architecture",
    "title": "Senior Cryptographer"
  }'
```

#### Response Body (`201 Created`):
```json
{
  "data": {
    "id": "f83a547b-1234-4567-8901-abcdef012345",
    "display_name": "Elena Rostova",
    "identity_type": "human",
    "email": "elena.rostova@northstarlabs.io",
    "status": "active",
    "owner_id": "a0000000-0000-0000-0000-000000000001",
    "department": "Security Architecture",
    "title": "Senior Cryptographer",
    "created_at": "2026-10-21T17:48:00.000Z",
    "updated_at": "2026-10-21T17:48:00.000Z"
  },
  "meta": {
    "request_id": "bbe94fc4-f98d-4a22-8e03-d1273de4bc1f"
  }
}
```

#### Curl Command (Error — Missing Required Display Name):
```bash
curl -i -X POST "http://localhost:5001/api/v1/identities" \
  -H "Content-Type: application/json" \
  -d '{
    "identity_type": "human",
    "email": "no.name@northstarlabs.io"
  }'
```

#### Response Body (`422 Unprocessable Entity`):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "request_id": "bbe94fc4-f98d-4a22-8e03-d1273de4bc1f",
    "details": [
      {
        "field": "display_name",
        "message": "Display name is required"
      }
    ]
  }
}
```

---

### 5.4 Partially Update Identity

Updates one or more fields on an existing canonical identity record while preserving omitted fields.

- **Method**: `PATCH`
- **URL**: `http://localhost:5001/api/v1/identities/:identityId`
- **Headers**: `Content-Type: application/json`
- **Constraints**:
  - Rejects empty bodies (`{}`) with `400 Bad Request`.
  - Rejects direct self-ownership (`owner_id = identityId`) with `422`.
  - Rejects circular multi-hop ownership dependencies ($A \to B \to A$) with `409 Conflict`.
  - Automatically sets `updated_at = NOW()`.

#### Swagger Spec Excerpt:
```yaml
patch:
  summary: Update Identity
  tags: [Identities]
  parameters:
    - name: identityId
      in: path
      required: true
      schema: { type: string, format: uuid }
  responses:
    '200':
      description: Updated identity record
    '400':
      description: Empty body
    '404':
      description: Identity not found
    '409':
      description: Ownership cycle detected
    '422':
      description: Validation error
```

#### Curl Command (Success — Title Promotion & Department Move):
```bash
curl -i -X PATCH "http://localhost:5001/api/v1/identities/a0000000-0000-0000-0000-000000000002" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Distinguished Infrastructure Architect",
    "department": "Core Platform & Reliability"
  }'
```

#### Response Body (`200 OK`):
```json
{
  "data": {
    "id": "a0000000-0000-0000-0000-000000000002",
    "display_name": "Ben Carter",
    "identity_type": "human",
    "email": "ben.carter@northstarlabs.io",
    "status": "active",
    "owner_id": "a0000000-0000-0000-0000-000000000001",
    "department": "Core Platform & Reliability",
    "title": "Distinguished Infrastructure Architect",
    "created_at": "2026-10-18T16:19:26.086Z",
    "updated_at": "2026-10-21T17:50:00.000Z"
  },
  "meta": {
    "request_id": "04654d0f-fc5b-45b7-8d4d-711b2ff1f725"
  }
}
```

#### Curl Command (Error — Empty Body):
```bash
curl -i -X PATCH "http://localhost:5001/api/v1/identities/a0000000-0000-0000-0000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Response Body (`400 Bad Request`):
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Request body cannot be empty",
    "request_id": "04654d0f-fc5b-45b7-8d4d-711b2ff1f725"
  }
}
```

#### Curl Command (Error — Ownership Cycle Detected):
```bash
# Dr. Alice Morgan (a001) owns Ben Carter (a002).
# Attempting to assign Ben Carter as Alice's owner creates an illegal loop:
curl -i -X PATCH "http://localhost:5001/api/v1/identities/a0000000-0000-0000-0000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{"owner_id": "a0000000-0000-0000-0000-000000000002"}'
```

#### Response Body (`409 Conflict`):
```json
{
  "error": {
    "code": "RESOURCE_CONFLICT",
    "message": "Ownership cycle detected: assigning this owner would create a circular dependency",
    "request_id": "4be62795-380f-4898-b921-e8518e831620"
  }
}
```

---

## 6. Public Error Codes Summary

| HTTP Status | Error Code | Trigger Condition | Troubleshooting / Recovery |
| :--- | :--- | :--- | :--- |
| `400` | `BAD_REQUEST` | Sent an empty `{}` JSON body to `PATCH`. | Ensure at least one valid field is passed to update. |
| `404` | `IDENTITY_NOT_FOUND` | UUID does not exist in `identities` table. | Confirm ID via `GET /api/v1/identities` listing. |
| `409` | `RESOURCE_CONFLICT` | Ownership cycle detected via recursive CTE. | Choose an owner that does not report to the candidate. |
| `422` | `VALIDATION_ERROR` | Schema failure: malformed UUID, unallowed sort column, limit > 100, invalid enum, or nonexistent `owner_id`. | Inspect the `details: [{ field, message }]` array in the response. |
| `500` | `INTERNAL_ERROR` | Uncaught database or server failure. | Inspect backend server console with the matching `request_id`. |
