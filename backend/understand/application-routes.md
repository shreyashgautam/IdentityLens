# Application Inventory Routes Guide (`application-routes.md`)

This document provides a comprehensive architectural and operational reference for the **Application Inventory API** (`/api/v1/applications`) implemented in **Milestone 4 — Part 2**.

It details domain concepts, architectural data flow, parameter rationales, Swagger OpenAPI 3.0 representations (why, how, and interactive browser testing), and copy-pasteable `curl` commands for all supported operations, live responses, and error conditions.

---

## 1. Domain Overview & Architectural Foundation

### 1.1 What is an Application in IdentityLens?
In **IdentityLens**, an **Application** represents an external software system, cloud service provider, SaaS platform, or on-premises directory (e.g., `AWS Cloud Infrastructure`, `GitHub Enterprise`, `Google Workspace`, `Slack Enterprise`, `Jira Software`, `Snowflake Data Warehouse`).

Applications serve as the parent namespace for:
- **Accounts**: Specific credentials, logins, or service principals within that application (e.g. `usr-aws-alice` in AWS, `alice.morgan` in GitHub, `svc-snowflake-bi` in Snowflake).
- **Entitlements**: Fine-grained permissions, roles, groups, or access policies defined within that application (e.g. `AdministratorAccess` in AWS, `Security Team` in GitHub, `ACCOUNTADMIN` in Snowflake).

```
+-------------------------------------------------------------+
|                Target Application (applications)            |
|                 name: "AWS Cloud Infrastructure"            |
|                        key: "aws_cloud"                     |
+-------------------------------------------------------------+
            │                                     │
            ▼                                     ▼
+-----------------------+             +-----------------------+
|  Application Accounts |             | Entitlements (Roles)  |
|  (accounts table)     |             | (entitlements table)  |
+-----------------------+             +-----------------------+
```

### 1.2 Strict Monolith Architecture Flow
The Application module strictly conforms to the repository dependency flow:
$$\text{Routes} \longrightarrow \text{Controllers} \longrightarrow \text{Services} \longrightarrow \text{Repositories} \longrightarrow \text{PostgreSQL}$$

- **`application.routes.js`**: Declares endpoints, mounts input validation middlewares, and intercepts empty update bodies. No business logic.
- **`application.controller.js`**: Unpacks validated inputs (`req.validatedParams`, `req.validatedQuery`, `req.validatedBody`) and formats standard HTTP responses. No SQL.
- **`application.service.js`**: Enforces business logic, calculates pagination math, checks application existence, and verifies unique key collisions.
- **`application.repository.js`**: Owns raw parameterized SQL (`$1, $2, ...`), sort allowlists, and unique key collision checks. No HTTP objects.
- **`application.validation.js`**: Declares Zod schemas validating parameters, query strings, and strict body payloads (`.strict()`).

---

## 2. When to Use Each Route & Lifecycle Decisions

| Endpoint | Method | Operational Purpose | Typical When-to-Use Scenario |
| :--- | :--- | :--- | :--- |
| `/api/v1/applications` | `GET` | Paginated listing with filtering, sorting, and search | Browsing registered SaaS/cloud inventory in UI; generating integration status reports; filtering by authentication type. |
| `/api/v1/applications/:applicationId` | `GET` | Single application lookup by UUID | Viewing target application configuration; reviewing application metadata prior to account ingestion. |
| `/api/v1/applications` | `POST` | Register a new target system application | Onboarding a new cloud provider (e.g. Snowflake, Datadog, Salesforce) into IdentityLens for risk discovery. |
| `/api/v1/applications/:applicationId` | `PATCH` | Partially update permitted application fields | Modifying application display name; changing authentication protocol (`auth_type`); retiring an application (`status: 'inactive'` or `'deprecated'`). |

### Why `DELETE` is Excluded
`DELETE /api/v1/applications/:applicationId` is deliberately **not implemented**:
1. **Destructive Cascading Deletions**: In the PostgreSQL schema:
   - `accounts.application_id REFERENCES applications(id) ON DELETE CASCADE`
   - `entitlements.application_id REFERENCES applications(id) ON DELETE CASCADE`
   - `account_entitlements` cascades via both parent tables.
   Deleting an application would cascade and silently destroy all connected accounts, entitlement definitions, and historical access links across the organization.
2. **Audit Preservation**: Deactivating an application using `PATCH` (`status: 'inactive'` or `'deprecated'`) preserves the historical identity-account link, entitlement history, and past risk findings.

---

## 3. Parameter Deep-Dive & Design Rationales

### 3.1 Pagination (`page` and `limit`)
- **`page` (integer, default: 1)**: 1-indexed page pointer ($\ge 1$). Rejects zero or negative values with `422 Unprocessable Entity`.
- **`limit` (integer, default: 20, max: 100)**: Bounded ceiling. Enforces that queries never perform unbounded table scans or exhaust server memory. Requesting `limit > 100` returns `422 Unprocessable Entity`.
- **Offset Math**: The service converts this to `OFFSET = (page - 1) * limit`.
- **Stable Secondary Sort**: The repository appends `id ASC` as a tie-breaker after any requested sort column, preventing pagination jitter where records swap positions between pages.

### 3.2 Filtering (`status` and `auth_type`)
- **`status`**: Validated against enum `['active', 'inactive', 'deprecated']`. Matches the database check constraint `applications_status_check`.
- **`auth_type`**: String filter (e.g., `iam`, `oauth2`, `saml`, `sso`, `password`).

### 3.3 Search (`search`)
- Searches across `name`, `key`, and `description` simultaneously using case-insensitive PostgreSQL pattern matching (`ILIKE $N`).
- Allows users to find applications by common names or machine keys (e.g., `github`, `snowflake`, or `salesforce`).

### 3.4 Sorting (`sort_by` and `sort_order`)
- **SQL Injection Defense**: Dynamic column interpolation is strictly blocked using an **explicit allowlist**:
  ```javascript
  ['name', 'key', 'status', 'auth_type', 'created_at', 'updated_at']
  ```
  Any unrecognized sort column is rejected with `422 Unprocessable Entity` before reaching the database.
- **`sort_order`**: Restricted to `asc` or `desc` (default: `desc`).

### 3.5 Unique Application Key (`key`)
- **Format**: Lowercase alphanumeric characters with underscores and dashes (`/^[a-z0-9_-]+$/`).
- **Uniqueness**: Enforces that no two applications share the same system identifier (e.g. `aws_cloud` or `snowflake_dw`).
- **Conflict Handling**: Both `POST` and `PATCH` check for existing keys and return **`409 Conflict`** (`code: 'RESOURCE_CONFLICT'`) if a duplicate is attempted.

### 3.6 Strict Request Payloads (`.strict()`)
- Rejects unexpected or forbidden properties (e.g., client-supplied `id`, `created_at`, `updated_at`, or unknown fields).
- Prevents mass-assignment vulnerabilities.

---

## 4. Swagger & OpenAPI 3.0: Why, How, and Browser Testing

### 4.1 Why Swagger / OpenAPI 3.0?
1. **Single Source of Truth**: Eliminates out-of-sync API documentation. The Swagger spec mirrors exact Zod validation rules and database constraints.
2. **Interactive Developer Sandbox**: Frontend developers and security auditors can test live endpoints, verify request payloads, and inspect actual response envelopes directly in the browser without writing code.
3. **Zero-Dependency Local Hosting**: The documentation UI runs entirely within the local Express server via `swagger-ui-express`, requiring no internet connection or external third-party SaaS services.
4. **Standardized Contracts**: Adheres to the OpenAPI 3.0.3 specification, enabling automatic client SDK generation, contract testing, and Postman collection imports.

### 4.2 How Swagger is Configured in IdentityLens
The Swagger implementation is centralized in `backend/src/config/swagger.js` and mounted in `backend/src/app.js`:
- **UI Endpoint**: `GET http://localhost:5001/docs` (interactive Swagger UI).
- **JSON Spec Endpoint**: `GET http://localhost:5001/docs/openapi.json` (machine-readable OpenAPI 3.0 JSON).
- **Component Schema Reuse**: Defines shared schemas including:
  - `#/components/schemas/ApplicationSingleResponse`
  - `#/components/schemas/ApplicationCollectionResponse`
  - `#/components/schemas/ErrorEnvelope`

### 4.3 Step-by-Step Swagger UI Testing Guide
To test the Application APIs using Swagger UI:
1. Open your browser to `http://localhost:5001/docs`.
2. Locate the **Applications** tag group in the UI.
3. Click on any endpoint (e.g. `GET /api/v1/applications` or `POST /api/v1/applications`) to expand its documentation.
4. Click the **"Try it out"** button in the upper right corner of the endpoint panel.
5. Fill in the parameters or sample JSON body.
6. Click the blue **"Execute"** button.
7. Observe the generated `curl` command, Request URL, HTTP response status code, response headers, and formatted JSON response body.

### 4.4 OpenAPI Route & Schema Mapping Table

| OpenAPI Tag | Operation | Swagger Path | Key Component Schema |
| :--- | :--- | :--- | :--- |
| `Applications` | List Applications | `/api/v1/applications` (`GET`) | `#/components/schemas/ApplicationCollectionResponse` |
| `Applications` | Register Application | `/api/v1/applications` (`POST`) | `#/components/schemas/ApplicationSingleResponse` |
| `Applications` | Get Application Details | `/api/v1/applications/{applicationId}` (`GET`) | `#/components/schemas/ApplicationSingleResponse` |
| `Applications` | Update Application | `/api/v1/applications/{applicationId}` (`PATCH`) | `#/components/schemas/ApplicationSingleResponse` |

---

## 5. Detailed Endpoint Reference & Curl Commands

### Understanding Curl Flags Used
- `-i`: Includes HTTP response status code and headers in output.
- `-X <METHOD>`: Specifies the HTTP verb (`GET`, `POST`, `PATCH`).
- `-H "Content-Type: application/json"`: Informs Express JSON body-parser to parse the request body as JSON.
- `-d '<JSON>'`: Sends the raw JSON payload in the request body.

---

### 5.1 List Applications

Retrieves a paginated collection of target applications matching optional filters and search keywords.

- **Method**: `GET`
- **URL**: `http://localhost:5001/api/v1/applications`
- **Query Parameters**:
  - `page` *(integer, optional, default: 1)*: Page number ($\ge 1$).
  - `limit` *(integer, optional, default: 20)*: Page size ($1 \le \text{limit} \le 100$).
  - `status` *(string, optional)*: `active` \| `inactive` \| `deprecated`.
  - `auth_type` *(string, optional)*: Authentication protocol (e.g., `iam`, `oauth2`, `saml`, `sso`, `password`).
  - `search` *(string, optional)*: Substring search across name, key, and description.
  - `sort_by` *(string, optional, default: 'created_at')*: Allowlisted column name (`name`, `key`, `status`, `auth_type`, `created_at`, `updated_at`).
  - `sort_order` *(string, optional, default: 'desc')*: `asc` \| `desc`.

#### Swagger Spec Excerpt:
```yaml
get:
  summary: List Applications
  tags: [Applications]
  parameters:
    - name: page
      in: query
      schema: { type: integer, default: 1, minimum: 1 }
    - name: limit
      in: query
      schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
    - name: status
      in: query
      schema: { type: string, enum: [active, inactive, deprecated] }
    - name: auth_type
      in: query
      schema: { type: string }
    - name: search
      in: query
      schema: { type: string }
    - name: sort_by
      in: query
      schema: { type: string, enum: [name, key, status, auth_type, created_at, updated_at], default: created_at }
    - name: sort_order
      in: query
      schema: { type: string, enum: [asc, desc], default: desc }
  responses:
    '200':
      schema: { $ref: '#/components/schemas/ApplicationCollectionResponse' }
    '422':
      schema: { $ref: '#/components/schemas/ErrorEnvelope' }
```

#### Curl Command (Success — Pagination & Filter):
```bash
curl -i "http://localhost:5001/api/v1/applications?page=1&limit=2&status=active&sort_by=name&sort_order=asc"
```

#### Response Body (`200 OK`):
```json
{
  "data": [
    {
      "id": "b0000000-0000-0000-0000-000000000001",
      "name": "AWS Cloud Infrastructure",
      "key": "aws_cloud",
      "description": "Production & Staging Amazon Web Services tenant",
      "status": "active",
      "auth_type": "iam",
      "created_at": "2026-10-18T16:19:26.086Z",
      "updated_at": "2026-10-18T16:19:42.527Z"
    },
    {
      "id": "b0000000-0000-0000-0000-000000000002",
      "name": "GitHub Enterprise",
      "key": "github_enterprise",
      "description": "Version control, issue tracking, and CI/CD pipelines",
      "status": "active",
      "auth_type": "oauth2",
      "created_at": "2026-10-18T16:19:26.086Z",
      "updated_at": "2026-10-18T16:19:42.527Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 2,
    "total": 6,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false
  },
  "meta": {
    "request_id": "902d1c14-2f2b-426b-871c-43f9a72d36ab"
  }
}
```

#### Curl Command (Error — Limit Exceeds Maximum of 100):
```bash
curl -i "http://localhost:5001/api/v1/applications?limit=150"
```

#### Response Body (`422 Unprocessable Entity`):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "request_id": "cbfbe445-b16d-4c51-8b54-6ebf99037abf",
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

### 5.2 Retrieve Application by ID

Retrieves complete profile and configuration details for a target application by UUID.

- **Method**: `GET`
- **URL**: `http://localhost:5001/api/v1/applications/:applicationId`
- **Path Parameters**:
  - `applicationId` *(UUID, required)*: Valid UUID v4.

#### Swagger Spec Excerpt:
```yaml
get:
  summary: Get Application Details
  tags: [Applications]
  parameters:
    - name: applicationId
      in: path
      required: true
      schema: { type: string, format: uuid }
  responses:
    '200':
      schema: { $ref: '#/components/schemas/ApplicationSingleResponse' }
    '404':
      schema: { $ref: '#/components/schemas/ErrorEnvelope' }
    '422':
      schema: { $ref: '#/components/schemas/ErrorEnvelope' }
```

#### Curl Command (Success — Retrieve Snowflake Data Warehouse):
```bash
curl -i "http://localhost:5001/api/v1/applications/7d463ccf-e1b7-4bc3-af1c-d90e18dc7622"
```

#### Response Body (`200 OK`):
```json
{
  "data": {
    "id": "7d463ccf-e1b7-4bc3-af1c-d90e18dc7622",
    "name": "Snowflake Data Warehouse",
    "key": "snowflake_dw",
    "description": "Analytics data lakehouse and business intelligence storage",
    "status": "active",
    "auth_type": "oauth2",
    "created_at": "2026-10-21T15:52:52.022Z",
    "updated_at": "2026-10-21T15:52:52.022Z"
  },
  "meta": {
    "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

#### Curl Command (Error — Nonexistent UUID):
```bash
curl -i "http://localhost:5001/api/v1/applications/e0000000-0000-0000-0000-000000000999"
```

#### Response Body (`404 Not Found`):
```json
{
  "error": {
    "code": "APPLICATION_NOT_FOUND",
    "message": "Application with ID 'e0000000-0000-0000-0000-000000000999' not found",
    "request_id": "70872d02-2e4f-4fc3-807c-1dcf5d062bab"
  }
}
```

#### Curl Command (Error — Invalid UUID Format):
```bash
curl -i "http://localhost:5001/api/v1/applications/not-a-valid-uuid"
```

#### Response Body (`422 Unprocessable Entity`):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "request_id": "bb407135-236b-4e1d-872f-5aa3ef9bc610",
    "details": [
      {
        "field": "applicationId",
        "message": "Invalid application ID format. Must be a valid UUID."
      }
    ]
  }
}
```

---

### 5.3 Register Application

Registers a new target system application with unique key validation.

- **Method**: `POST`
- **URL**: `http://localhost:5001/api/v1/applications`
- **Headers**: `Content-Type: application/json`
- **Request Body Fields**:
  - `name` *(string, required)*: 1–255 characters.
  - `key` *(string, required)*: 1–100 characters, lowercase alphanumeric with `_` and `-`.
  - `description` *(string, optional, nullable)*: Application description.
  - `status` *(string, optional, default: 'active')*: `active` \| `inactive` \| `deprecated`.
  - `auth_type` *(string, optional, default: 'password')*: Max 50 characters.

#### Swagger Spec Excerpt:
```yaml
post:
  summary: Register Application
  tags: [Applications]
  requestBody:
    required: true
    content:
      application/json:
        schema:
          type: object
          required: [name, key]
          properties:
            name: { type: string, example: "Salesforce Production" }
            key: { type: string, example: "salesforce_prod" }
            description: { type: string, example: "Corporate CRM system" }
            status: { type: string, enum: [active, inactive, deprecated], default: active }
            auth_type: { type: string, example: "saml", default: "password" }
  responses:
    '201':
      schema: { $ref: '#/components/schemas/ApplicationSingleResponse' }
    '409':
      schema: { $ref: '#/components/schemas/ErrorEnvelope' }
    '422':
      schema: { $ref: '#/components/schemas/ErrorEnvelope' }
```

#### Curl Command (Success — Register Snowflake Data Warehouse):
```bash
curl -i -X POST "http://localhost:5001/api/v1/applications" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Snowflake Data Warehouse",
    "key": "snowflake_dw",
    "description": "Analytics data lakehouse and business intelligence storage",
    "status": "active",
    "auth_type": "oauth2"
  }'
```

#### Response Body (`201 Created`):
```json
{
  "data": {
    "id": "7d463ccf-e1b7-4bc3-af1c-d90e18dc7622",
    "name": "Snowflake Data Warehouse",
    "key": "snowflake_dw",
    "description": "Analytics data lakehouse and business intelligence storage",
    "status": "active",
    "auth_type": "oauth2",
    "created_at": "2026-10-21T15:52:52.022Z",
    "updated_at": "2026-10-21T15:52:52.022Z"
  },
  "meta": {
    "request_id": "efbc3b53-2b8b-43b5-a50a-8e3d08f2cfb5"
  }
}
```

#### Curl Command (Error — Duplicate Key Conflict):
```bash
curl -i -X POST "http://localhost:5001/api/v1/applications" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Duplicate Snowflake",
    "key": "snowflake_dw"
  }'
```

#### Response Body (`409 Conflict`):
```json
{
  "error": {
    "code": "RESOURCE_CONFLICT",
    "message": "Application with key 'snowflake_dw' already exists",
    "request_id": "8f6aee2e-ab60-40ee-8201-3beaa6fbd653"
  }
}
```

---

### 5.4 Partially Update Application

Partially updates fields on an existing target application while preserving omitted fields.

- **Method**: `PATCH`
- **URL**: `http://localhost:5001/api/v1/applications/:applicationId`
- **Headers**: `Content-Type: application/json`
- **Constraints**:
  - Rejects empty bodies (`{}`) with `400 Bad Request`.
  - Rejects duplicate keys with `409 Conflict`.
  - Automatically updates `updated_at = NOW()`.

#### Swagger Spec Excerpt:
```yaml
patch:
  summary: Update Application
  tags: [Applications]
  parameters:
    - name: applicationId
      in: path
      required: true
      schema: { type: string, format: uuid }
  requestBody:
    required: true
    content:
      application/json:
        schema:
          type: object
          properties:
            name: { type: string }
            key: { type: string }
            description: { type: string, nullable: true }
            status: { type: string, enum: [active, inactive, deprecated] }
            auth_type: { type: string }
  responses:
    '200':
      schema: { $ref: '#/components/schemas/ApplicationSingleResponse' }
    '400':
      schema: { $ref: '#/components/schemas/ErrorEnvelope' }
    '404':
      schema: { $ref: '#/components/schemas/ErrorEnvelope' }
    '409':
      schema: { $ref: '#/components/schemas/ErrorEnvelope' }
    '422':
      schema: { $ref: '#/components/schemas/ErrorEnvelope' }
```

#### Curl Command (Success — Update Description & Auth Type):
```bash
curl -i -X PATCH "http://localhost:5001/api/v1/applications/b0000000-0000-0000-0000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Primary Production, Staging, and Development AWS multi-account organization",
    "auth_type": "iam_identity_center"
  }'
```

#### Response Body (`200 OK`):
```json
{
  "data": {
    "id": "b0000000-0000-0000-0000-000000000001",
    "name": "AWS Cloud Infrastructure",
    "key": "aws_cloud",
    "description": "Primary Production, Staging, and Development AWS multi-account organization",
    "status": "active",
    "auth_type": "iam_identity_center",
    "created_at": "2026-10-18T16:19:26.086Z",
    "updated_at": "2026-10-21T18:31:00.000Z"
  },
  "meta": {
    "request_id": "f1e2d3c4-b5a6-7890-1234-567890abcdef"
  }
}
```

#### Curl Command (Error — Empty Body):
```bash
curl -i -X PATCH "http://localhost:5001/api/v1/applications/b0000000-0000-0000-0000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Response Body (`400 Bad Request`):
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Request body cannot be empty",
    "request_id": "dcf34c1f-7354-471d-a0f1-2c4ffadfcfe2"
  }
}
```

---

## 6. Public Error Codes Summary

| HTTP Status | Error Code | Trigger Condition | Troubleshooting / Recovery |
| :--- | :--- | :--- | :--- |
| `400` | `BAD_REQUEST` | Sent an empty `{}` JSON body to `PATCH`. | Ensure at least one valid field is passed to update. |
| `404` | `APPLICATION_NOT_FOUND` | UUID does not exist in `applications` table. | Confirm ID via `GET /api/v1/applications` listing. |
| `409` | `RESOURCE_CONFLICT` | Application key already exists in database. | Choose a unique key for the application. |
| `422` | `VALIDATION_ERROR` | Schema failure: malformed UUID, unallowed sort column, limit > 100, invalid enum status, or key containing invalid characters. | Inspect the `details: [{ field, message }]` array in the response. |
| `500` | `INTERNAL_ERROR` | Uncaught database or server failure. | Inspect backend server console with the matching `request_id`. |
