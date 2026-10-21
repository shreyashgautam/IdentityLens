# Account Inventory & Relationship Routes Guide (`account-routes.md`)

This document provides a comprehensive architectural and operational reference for the **Account Inventory & Relationship APIs** (`/api/v1/accounts`, `/api/v1/identities/:identityId/accounts`, and `/api/v1/applications/:applicationId/accounts`) implemented in **Milestone 4 — Part 3**.

It details domain concepts, architectural data flow, parameter rationales, Swagger OpenAPI 3.0 representations (why, how, and interactive browser testing), and copy-pasteable `curl` commands for all supported operations, live responses, and error conditions.

---

## 1. Domain Overview & Architectural Foundation

### 1.1 What is an Account in IdentityLens?
In **IdentityLens**, an **Account** represents a specific principal, login credential, or user/service identity profile provisioned within a target application (e.g., `usr-aws-bcarter` in AWS, `gh-amorgan-ns` in GitHub, `alice.morgan` in Google Workspace).

An **Account** links the abstract **Identity** (the human employee or service owner) to the target **Application** (the cloud service or SaaS provider):
- **Linked Accounts (`identity_id IS NOT NULL`)**: Accounts correlated to a known canonical identity.
- **Orphan Accounts (`identity_id IS NULL`)**: Unowned accounts. These represent a primary security risk where credentials exist in a SaaS app but have no accountable human employee or service owner. They are evaluated by the deterministic risk engine under rule `ORPHAN_ACCOUNT`.

```
+-------------------------------------------------------------+
|               Canonical Identity (identities)               |
|            display_name: "Ben Carter"                       |
|             id: a0000000-0000-0000-0000-000000000002        |
+-------------------------------------------------------------+
            │                                     │
            ▼                                     ▼
+-----------------------+             +-----------------------+
|   AWS Account         |             |   GitHub Account      |
| external_id:          |             | external_id:          |
| "usr-aws-bcarter"     |             | "gh-bcarter-dev"      |
+-----------------------+             +-----------------------+
            │                                     │
            ▼                                     ▼
+-----------------------+             +-----------------------+
| Target Application    |             | Target Application    |
| "AWS Cloud" (b01)     |             | "GitHub Ent" (b02)    |
+-----------------------+             +-----------------------+
```

### 1.2 Strict Monolith Architecture Flow
The Account module strictly conforms to the repository dependency flow:
$$\text{Routes} \longrightarrow \text{Controllers} \longrightarrow \text{Services} \longrightarrow \text{Repositories} \longrightarrow \text{PostgreSQL}$$

- **`account.routes.js`**: Declares endpoints, attaches input validation middlewares, and intercepts empty update bodies.
- **`account.controller.js`**: Unpacks validated inputs (`req.validatedParams`, `req.validatedQuery`, `req.validatedBody`) and formats standard HTTP responses.
- **`account.service.js`**: Enforces foreign key integrity (verifying `application_id` and `identity_id`), calculates pagination offsets and total pages, checks composite uniqueness, and verifies parent existence for relationship endpoints.
- **`account.repository.js`**: Owns raw parameterized SQL (`$1, $2, ...`), sort allowlists, and unique composite constraint checks.
- **`account.validation.js`**: Declares Zod schemas validating parameters, query strings, and strict body payloads (`.strict()`).

---

## 2. When to Use Each Route & Lifecycle Decisions

| Endpoint | Method | Operational Purpose | Typical When-to-Use Scenario |
| :--- | :--- | :--- | :--- |
| `/api/v1/accounts` | `GET` | Paginated listing with filtering, sorting, and search | Rendering the main account inventory table; discovering orphan accounts (`is_orphan=true`); filtering accounts by application or status. |
| `/api/v1/accounts/:accountId` | `GET` | Single account lookup by UUID | Viewing target account configuration; reviewing account metadata prior to entitlement assignment. |
| `/api/v1/accounts` | `POST` | Register a new target system account | SCIM ingestion connector provisioning; registering a newly discovered service principal or employee login. |
| `/api/v1/accounts/:accountId` | `PATCH` | Partially update permitted account fields | Account reconciliation (linking an orphan account to an identity, or unlinking via `null`); disabling a retired account (`status: 'disabled'`). |
| `/api/v1/identities/:identityId/accounts` | `GET` | List accounts belonging to a canonical identity | Rendering the "Connected Accounts" tab on an employee's profile; auditing all cloud access for a departing worker. |
| `/api/v1/applications/:applicationId/accounts` | `GET` | List accounts provisioned in an application | Rendering the "Accounts" tab on an application detail view; auditing all accounts inside AWS or GitHub. |

### Why `DELETE` is Excluded
`DELETE /api/v1/accounts/:accountId` is deliberately **not implemented**:
1. **Destructive Cascading Deletions**: In PostgreSQL:
   - `account_entitlements.account_id REFERENCES accounts(id) ON DELETE CASCADE`
   - `risk_findings.account_id REFERENCES accounts(id) ON DELETE CASCADE`
   Deleting an account cascades and permanently destroys all assigned permissions and past compliance/security findings.
2. **Audit Preservation**: Deactivating an account using `PATCH` (`status: 'disabled'` or `'suspended'`) preserves the historical identity-account link, assigned roles, and risk audit logs.

---

## 3. Parameter Deep-Dive & Design Rationales

### 3.1 Pagination (`page` and `limit`)
- **`page` (integer, default: 1)**: 1-indexed page pointer ($\ge 1$). Rejects zero or negative values with `422 Unprocessable Entity`.
- **`limit` (integer, default: 20, max: 100)**: Bounded ceiling. Enforces that queries never perform unbounded table scans or exhaust server memory. Requesting `limit > 100` returns `422`.
- **Offset Math**: The service converts this to `OFFSET = (page - 1) * limit`.
- **Stable Secondary Sort**: The repository appends `id ASC` as a tie-breaker after any requested sort column, preventing pagination jitter where records swap positions between pages.

### 3.2 Filtering (`application_id`, `identity_id`, `status`, `is_orphan`)
- **`application_id`**: Filter by target application UUID.
- **`identity_id`**: Filter by owner identity UUID.
- **`status`**: Validated against enum `['active', 'disabled', 'suspended', 'unknown']`. Matches the database check constraint `accounts_status_check`.
- **`is_orphan` (boolean)**:
  - When `true`: SQL generates `identity_id IS NULL` (isolated unowned accounts for risk detection).
  - When `false`: SQL generates `identity_id IS NOT NULL` (correlated accounts).

### 3.3 Search (`search`)
- Searches across `external_id`, `account_name`, and `email` simultaneously using case-insensitive PostgreSQL pattern matching (`ILIKE $N`).
- Allows users to find accounts by username, system login, or email address.

### 3.4 Sorting (`sort_by` and `sort_order`)
- **SQL Injection Defense**: Dynamic column interpolation is strictly blocked using an **explicit allowlist**:
  ```javascript
  ['external_id', 'account_name', 'email', 'status', 'source', 'last_login_at', 'created_at', 'updated_at']
  ```
  Any unrecognized sort column is rejected with `422 Unprocessable Entity` before reaching the database.
- **`sort_order`**: Restricted to `asc` or `desc` (default: `desc`).

### 3.5 Composite Uniqueness (`application_id`, `external_id`)
- **Format**: External identifiers provided by target applications (e.g. `usr-aws-bcarter`, `amorgan-ns`).
- **Uniqueness**: Enforces database constraint `uq_accounts_app_external_id`. No two accounts in the same application can share the same `external_id`.
- **Conflict Handling**: Both `POST` and `PATCH` check for existing keys and return **`409 Conflict`** (`code: 'RESOURCE_CONFLICT'`) if a collision occurs.

---

## 4. Swagger & OpenAPI 3.0: Why, How, and Browser Testing

### 4.1 Why Swagger / OpenAPI 3.0?
1. **Living Contract**: Eliminates out-of-sync API documentation. Mirrors exact Zod validation rules and database constraints.
2. **Interactive Developer Sandbox**: Frontend developers and security auditors can test live endpoints, verify request payloads, and inspect actual response envelopes directly in the browser without writing code.
3. **Zero-Dependency Local Hosting**: The documentation UI runs entirely within the local Express server via `swagger-ui-express`, requiring no external third-party SaaS services.
4. **Standardized Schemas**: Adheres to OpenAPI 3.0.3, enabling automatic client SDK generation and contract testing.

### 4.2 How Swagger is Configured in IdentityLens
Centralized in `backend/src/config/swagger.js` and mounted in `backend/src/app.js`:
- **UI Endpoint**: `GET http://localhost:5001/docs`
- **JSON Spec Endpoint**: `GET http://localhost:5001/docs/openapi.json`
- **Component Schemas**:
  - `#/components/schemas/AccountSingleResponse`
  - `#/components/schemas/AccountCollectionResponse`
  - `#/components/schemas/AccountItem`
  - `#/components/schemas/ErrorEnvelope`

### 4.3 Step-by-Step Swagger UI Testing Guide
To test the Account APIs using Swagger UI:
1. Open your browser to `http://localhost:5001/docs`.
2. Locate the **Accounts** tag group in the UI.
3. Click on any endpoint (e.g. `GET /api/v1/accounts` or `POST /api/v1/accounts`) to expand its documentation.
4. Click the **"Try it out"** button in the upper right corner.
5. Fill in parameters or sample JSON body.
6. Click the blue **"Execute"** button.
7. Observe the generated `curl` command, Request URL, HTTP status code, response headers, and formatted JSON response body.

### 4.4 OpenAPI Route & Schema Mapping Table

| OpenAPI Tag | Operation | Swagger Path | Key Component Schema |
| :--- | :--- | :--- | :--- |
| `Accounts` | List Accounts | `/api/v1/accounts` (`GET`) | `#/components/schemas/AccountCollectionResponse` |
| `Accounts` | Create Account | `/api/v1/accounts` (`POST`) | `#/components/schemas/AccountSingleResponse` |
| `Accounts` | Get Account Details | `/api/v1/accounts/{accountId}` (`GET`) | `#/components/schemas/AccountSingleResponse` |
| `Accounts` | Update Account | `/api/v1/accounts/{accountId}` (`PATCH`) | `#/components/schemas/AccountSingleResponse` |
| `Identities`, `Accounts` | List Accounts for Identity | `/api/v1/identities/{identityId}/accounts` (`GET`) | `#/components/schemas/AccountCollectionResponse` |
| `Applications`, `Accounts` | List Accounts for Application | `/api/v1/applications/{applicationId}/accounts` (`GET`) | `#/components/schemas/AccountCollectionResponse` |

---

## 5. Detailed Endpoint Reference & Curl Commands

### Understanding Curl Flags Used
- `-i`: Includes HTTP response status code and headers in output.
- `-X <METHOD>`: Specifies HTTP verb (`GET`, `POST`, `PATCH`).
- `-H "Content-Type: application/json"`: Informs Express JSON body-parser to parse the request body as JSON.
- `-d '<JSON>'`: Sends the raw JSON payload in the request body.

---

### 5.1 List Accounts

Retrieves a paginated collection of target accounts matching optional filters and search keywords.

- **Method**: `GET`
- **URL**: `http://localhost:5001/api/v1/accounts`
- **Query Parameters**:
  - `page` *(integer, optional, default: 1)*: Page number ($\ge 1$).
  - `limit` *(integer, optional, default: 20)*: Page size ($1 \le \text{limit} \le 100$).
  - `application_id` *(UUID, optional)*: Filter by application.
  - `identity_id` *(UUID, optional)*: Filter by identity.
  - `status` *(string, optional)*: `active` \| `disabled` \| `suspended` \| `unknown`.
  - `is_orphan` *(boolean, optional)*: Filter for orphan accounts (`identity_id IS NULL`).
  - `search` *(string, optional)*: Substring search across external_id, account_name, and email.
  - `sort_by` *(string, optional, default: 'created_at')*: Allowlisted column name.
  - `sort_order` *(string, optional, default: 'desc')*: `asc` \| `desc`.

#### Swagger Spec Excerpt:
```yaml
get:
  summary: List Application Accounts
  tags: [Accounts]
  parameters:
    - name: page
      in: query
      schema: { type: integer, default: 1, minimum: 1 }
    - name: limit
      in: query
      schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
    - name: is_orphan
      in: query
      schema: { type: boolean }
    - name: sort_by
      in: query
      schema: { type: string, enum: [external_id, account_name, email, status, source, last_login_at, created_at, updated_at], default: created_at }
```

#### Curl Command (Success — Discover Orphan Accounts):
```bash
curl -i "http://localhost:5001/api/v1/accounts?is_orphan=true"
```

#### Response Body (`200 OK`):
```json
{
  "data": [
    {
      "id": "c0000000-0000-0000-0000-000000000004",
      "application_id": "b0000000-0000-0000-0000-000000000001",
      "identity_id": null,
      "external_id": "usr-aws-legacy-ops",
      "account_name": "legacy-ops-admin",
      "email": "ops-temp-2024@northstarlabs.io",
      "status": "active",
      "source": "aws_iam_scim",
      "last_login_at": "2026-02-14T18:20:00.000Z",
      "created_at": "2026-10-18T16:19:26.086Z",
      "updated_at": "2026-10-18T16:19:42.527Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  },
  "meta": {
    "request_id": "18fbf77d-6ff5-430c-ab91-c80387a32dcb"
  }
}
```

#### Curl Command (Error — Limit Exceeds Maximum):
```bash
curl -i "http://localhost:5001/api/v1/accounts?limit=150"
```

#### Response Body (`422 Unprocessable Entity`):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "request_id": "b8a09a5b-0cfc-40ad-be00-b8ec1215bc99",
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

### 5.2 Retrieve Account by ID

Retrieves complete profile and configuration details for a target account by UUID.

- **Method**: `GET`
- **URL**: `http://localhost:5001/api/v1/accounts/:accountId`
- **Path Parameters**:
  - `accountId` *(UUID, required)*: Valid UUID v4.

#### Curl Command (Success — Retrieve Ben Carter's AWS Account):
```bash
curl -i "http://localhost:5001/api/v1/accounts/c0000000-0000-0000-0000-000000000001"
```

#### Response Body (`200 OK`):
```json
{
  "data": {
    "id": "c0000000-0000-0000-0000-000000000001",
    "application_id": "b0000000-0000-0000-0000-000000000001",
    "identity_id": "a0000000-0000-0000-0000-000000000002",
    "external_id": "usr-aws-bcarter",
    "account_name": "bcarter-admin",
    "email": "ben.carter@northstarlabs.io",
    "status": "active",
    "source": "aws_iam_scim",
    "last_login_at": "2026-04-10T12:00:00.000Z",
    "created_at": "2026-10-18T16:19:26.086Z",
    "updated_at": "2026-10-18T16:19:42.527Z"
  },
  "meta": {
    "request_id": "3587b1c1-432d-4ce4-8c88-e24ff8890104"
  }
}
```

#### Curl Command (Error — Nonexistent UUID):
```bash
curl -i "http://localhost:5001/api/v1/accounts/e0000000-0000-0000-0000-000000000999"
```

#### Response Body (`404 Not Found`):
```json
{
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account with ID 'e0000000-0000-0000-0000-000000000999' not found",
    "request_id": "df46b1c1-229d-4889-aa81-a64ff8890119"
  }
}
```

---

### 5.3 Register Account

Registers a new target system account with foreign key validation and uniqueness checks.

- **Method**: `POST`
- **URL**: `http://localhost:5001/api/v1/accounts`
- **Headers**: `Content-Type: application/json`
- **Request Body Fields**:
  - `application_id` *(UUID, required)*: Must exist in `applications` table.
  - `external_id` *(string, required)*: 1–255 characters.
  - `identity_id` *(UUID, optional, nullable)*: Canonical identity owner.
  - `account_name` *(string, optional, nullable)*: Username or display handle.
  - `email` *(string, optional, nullable)*: Account email address.
  - `status` *(string, optional, default: 'active')*: `active` \| `disabled` \| `suspended` \| `unknown`.
  - `source` *(string, optional, default: 'direct')*: Ingestion source.
  - `last_login_at` *(string datetime, optional, nullable)*: ISO 8601 timestamp.

#### Curl Command (Success — Register Account):
```bash
curl -i -X POST "http://localhost:5001/api/v1/accounts" \
  -H "Content-Type: application/json" \
  -d '{
    "application_id": "b0000000-0000-0000-0000-000000000001",
    "external_id": "usr-aws-cloud-security",
    "identity_id": "a0000000-0000-0000-0000-000000000002",
    "account_name": "cloud-sec-ops",
    "email": "sec-ops@northstarlabs.io",
    "status": "active",
    "source": "aws_iam_scim"
  }'
```

#### Response Body (`201 Created`):
```json
{
  "data": {
    "id": "70b92df1-4c12-4f24-9b5a-1c093a89011a",
    "application_id": "b0000000-0000-0000-0000-000000000001",
    "identity_id": "a0000000-0000-0000-0000-000000000002",
    "external_id": "usr-aws-cloud-security",
    "account_name": "cloud-sec-ops",
    "email": "sec-ops@northstarlabs.io",
    "status": "active",
    "source": "aws_iam_scim",
    "last_login_at": null,
    "created_at": "2026-10-22T01:36:00.000Z",
    "updated_at": "2026-10-22T01:36:00.000Z"
  },
  "meta": {
    "request_id": "e932b1c1-432d-4ce4-8c88-e24ff8890204"
  }
}
```

#### Curl Command (Error — Duplicate `external_id` in Application):
```bash
curl -i -X POST "http://localhost:5001/api/v1/accounts" \
  -H "Content-Type: application/json" \
  -d '{
    "application_id": "b0000000-0000-0000-0000-000000000001",
    "external_id": "usr-aws-bcarter"
  }'
```

#### Response Body (`409 Conflict`):
```json
{
  "error": {
    "code": "RESOURCE_CONFLICT",
    "message": "Account with external_id 'usr-aws-bcarter' already exists in this application",
    "request_id": "d094b1c1-432d-4ce4-8c88-e24ff8890205"
  }
}
```

---

### 5.4 Partially Update Account

Partially updates fields on an existing account (including linking or unlinking canonical identity).

- **Method**: `PATCH`
- **URL**: `http://localhost:5001/api/v1/accounts/:accountId`
- **Headers**: `Content-Type: application/json`

#### Curl Command (Success — Link Orphan Account to Identity):
```bash
curl -i -X PATCH "http://localhost:5001/api/v1/accounts/c0000000-0000-0000-0000-000000000004" \
  -H "Content-Type: application/json" \
  -d '{
    "identity_id": "a0000000-0000-0000-0000-000000000002",
    "status": "active"
  }'
```

#### Response Body (`200 OK`):
```json
{
  "data": {
    "id": "c0000000-0000-0000-0000-000000000004",
    "application_id": "b0000000-0000-0000-0000-000000000001",
    "identity_id": "a0000000-0000-0000-0000-000000000002",
    "external_id": "usr-aws-legacy-ops",
    "account_name": "legacy-ops-admin",
    "email": "ops-temp-2024@northstarlabs.io",
    "status": "active",
    "source": "aws_iam_scim",
    "last_login_at": "2026-02-14T18:20:00.000Z",
    "created_at": "2026-10-18T16:19:26.086Z",
    "updated_at": "2026-10-22T01:36:30.000Z"
  },
  "meta": {
    "request_id": "a021b1c1-432d-4ce4-8c88-e24ff8890306"
  }
}
```

#### Curl Command (Error — Empty Body):
```bash
curl -i -X PATCH "http://localhost:5001/api/v1/accounts/c0000000-0000-0000-0000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Response Body (`400 Bad Request`):
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Request body cannot be empty",
    "request_id": "6732b1c1-432d-4ce4-8c88-e24ff8890407"
  }
}
```

---

### 5.5 List Accounts for Identity

Retrieves all application accounts linked to a specific canonical identity.

- **Method**: `GET`
- **URL**: `http://localhost:5001/api/v1/identities/:identityId/accounts`
- **Path Parameters**:
  - `identityId` *(UUID, required)*

#### Curl Command (Success — Ben Carter's Connected Accounts):
```bash
curl -i "http://localhost:5001/api/v1/identities/a0000000-0000-0000-0000-000000000002/accounts"
```

#### Response Body (`200 OK`):
```json
{
  "data": [
    {
      "id": "c0000000-0000-0000-0000-000000000001",
      "application_id": "b0000000-0000-0000-0000-000000000001",
      "identity_id": "a0000000-0000-0000-0000-000000000002",
      "external_id": "usr-aws-bcarter",
      "account_name": "bcarter-admin",
      "email": "ben.carter@northstarlabs.io",
      "status": "active",
      "source": "aws_iam_scim",
      "last_login_at": "2026-04-10T12:00:00.000Z",
      "created_at": "2026-10-18T16:19:26.086Z",
      "updated_at": "2026-10-18T16:19:42.527Z"
    },
    {
      "id": "c0000000-0000-0000-0000-000000000006",
      "application_id": "b0000000-0000-0000-0000-000000000002",
      "identity_id": "a0000000-0000-0000-0000-000000000002",
      "external_id": "gh-bcarter-dev",
      "account_name": "bcarter-dev",
      "email": "ben.carter@northstarlabs.io",
      "status": "active",
      "source": "github_scim",
      "last_login_at": "2026-10-18T11:00:00.000Z",
      "created_at": "2026-10-18T16:19:26.086Z",
      "updated_at": "2026-10-18T16:19:42.527Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  },
  "meta": {
    "request_id": "c921b1c1-432d-4ce4-8c88-e24ff8890508"
  }
}
```

#### Curl Command (Error — Nonexistent Identity):
```bash
curl -i "http://localhost:5001/api/v1/identities/e0000000-0000-0000-0000-000000000999/accounts"
```

#### Response Body (`404 Not Found`):
```json
{
  "error": {
    "code": "IDENTITY_NOT_FOUND",
    "message": "Identity with ID 'e0000000-0000-0000-0000-000000000999' not found",
    "request_id": "9081b1c1-432d-4ce4-8c88-e24ff8890609"
  }
}
```

---

### 5.6 List Accounts for Application

Retrieves all target accounts provisioned within a specific application.

- **Method**: `GET`
- **URL**: `http://localhost:5001/api/v1/applications/:applicationId/accounts`
- **Path Parameters**:
  - `applicationId` *(UUID, required)*

#### Curl Command (Success — List AWS Accounts):
```bash
curl -i "http://localhost:5001/api/v1/applications/b0000000-0000-0000-0000-000000000001/accounts?page=1&limit=2"
```

#### Response Body (`200 OK`):
```json
{
  "data": [
    {
      "id": "c0000000-0000-0000-0000-000000000001",
      "application_id": "b0000000-0000-0000-0000-000000000001",
      "identity_id": "a0000000-0000-0000-0000-000000000002",
      "external_id": "usr-aws-bcarter",
      "account_name": "bcarter-admin",
      "email": "ben.carter@northstarlabs.io",
      "status": "active",
      "source": "aws_iam_scim",
      "last_login_at": "2026-04-10T12:00:00.000Z",
      "created_at": "2026-10-18T16:19:26.086Z",
      "updated_at": "2026-10-18T16:19:42.527Z"
    },
    {
      "id": "c0000000-0000-0000-0000-000000000002",
      "application_id": "b0000000-0000-0000-0000-000000000001",
      "identity_id": "a0000000-0000-0000-0000-000000000003",
      "external_id": "usr-aws-npatel",
      "account_name": "npatel-audit",
      "email": "nina.patel@northstarlabs.io",
      "status": "active",
      "source": "aws_iam_scim",
      "last_login_at": "2026-10-17T09:30:00.000Z",
      "created_at": "2026-10-18T16:19:26.086Z",
      "updated_at": "2026-10-18T16:19:42.527Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 2,
    "total": 4,
    "total_pages": 2,
    "has_next": true,
    "has_prev": false
  },
  "meta": {
    "request_id": "a183b1c1-432d-4ce4-8c88-e24ff8890710"
  }
}
```

#### Curl Command (Error — Nonexistent Application):
```bash
curl -i "http://localhost:5001/api/v1/applications/e0000000-0000-0000-0000-000000000999/accounts"
```

#### Response Body (`404 Not Found`):
```json
{
  "error": {
    "code": "APPLICATION_NOT_FOUND",
    "message": "Application with ID 'e0000000-0000-0000-0000-000000000999' not found",
    "request_id": "8912b1c1-432d-4ce4-8c88-e24ff8890811"
  }
}
```

---

## 6. Public Error Codes Summary

| HTTP Status | Error Code | Trigger Condition | Troubleshooting / Recovery |
| :--- | :--- | :--- | :--- |
| `400` | `BAD_REQUEST` | Sent an empty `{}` JSON body to `PATCH`. | Ensure at least one valid field is passed to update. |
| `404` | `ACCOUNT_NOT_FOUND` | UUID does not exist in `accounts` table. | Confirm ID via `GET /api/v1/accounts` listing. |
| `404` | `IDENTITY_NOT_FOUND` | Parent UUID does not exist on `/identities/:identityId/accounts`. | Verify identity ID via `GET /api/v1/identities`. |
| `404` | `APPLICATION_NOT_FOUND` | Parent UUID does not exist on `/applications/:applicationId/accounts`. | Verify application ID via `GET /api/v1/applications`. |
| `409` | `RESOURCE_CONFLICT` | `(application_id, external_id)` already exists. | Use a distinct external identifier for this application. |
| `422` | `VALIDATION_ERROR` | Schema failure: malformed UUID, unallowed sort column, limit > 100, invalid enum status, or nonexistent foreign key reference. | Inspect the `details: [{ field, message }]` array in the response. |
| `500` | `INTERNAL_ERROR` | Uncaught database or server failure. | Inspect backend server console with the matching `request_id`. |
