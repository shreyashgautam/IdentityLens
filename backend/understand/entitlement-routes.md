# Entitlement Inventory & Access Relationships Guide (`entitlement-routes.md`)

This document provides a comprehensive architectural and operational reference for the **Entitlement Inventory & Access Relationships APIs** (`/api/v1/entitlements` and `/api/v1/accounts/:accountId/entitlements`) implemented in **Milestone 5**.

It details domain concepts, architectural data flow, transaction safeguards, parameter rationales, Swagger OpenAPI 3.0 representations (why, how, and interactive browser testing), and copy-pasteable `curl` commands for all supported operations, live responses, and error conditions.

---

## 1. Domain Overview & Architectural Foundation

### 1.1 What is an Entitlement in IdentityLens?
In **IdentityLens**, an **Entitlement** represents a specific privilege, permission, role, license, or group membership cataloged within a target application (e.g., `AdministratorAccess` or `EC2FullAccess` in AWS, `OrganizationOwner` or `CoreMaintainersTeam` in GitHub, `SuperAdmin` in Google Workspace).

Entitlements establish the **Access Layer** of the identity governance model:
- **Canonical Identities** own **Accounts** in target applications.
- **Accounts** are assigned **Entitlements** within their respective application boundary.
- **Account Entitlements (`account_entitlements`)**: The join table recording access assignments with `assigned_at` timestamps.

```
+-------------------------------------------------------------+
|               Canonical Identity (identities)               |
|            display_name: "Ben Carter"                       |
|             id: a0000000-0000-0000-0000-000000000002        |
+-------------------------------------------------------------+
                            │
                            ▼
+-------------------------------------------------------------+
|               Target Account (accounts)                     |
|           external_id: "usr-aws-bcarter"                    |
|           application_id: AWS Cloud (b01)                   |
|             id: c0000000-0000-0000-0000-000000000001        |
+-------------------------------------------------------------+
                            │
               (account_entitlements join table)
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
+---------------------------+ +---------------------------+
| Entitlement (AWS b01)     | | Entitlement (AWS b01)     |
| AdministratorAccess       | | EC2FullAccess             |
| is_privileged: true       | | is_privileged: false      |
+---------------------------+ +---------------------------+
```

### 1.2 Strict Application Boundary Rule
An account provisioned in Application A can **only** be assigned entitlements cataloged within Application A:
$$\text{account.application\_id} \equiv \text{entitlement.application\_id}$$
If a caller attempts to assign a GitHub entitlement (App `b02`) to an AWS account (App `b01`), the transaction rejects the request with `422 Unprocessable Entity` (`Cross-application entitlement assignment is forbidden`).

### 1.3 Strict Monolith Architecture Flow
The Entitlement module strictly adheres to the dependency direction:
$$\text{Routes} \longrightarrow \text{Controllers} \longrightarrow \text{Services} \longrightarrow \text{Repositories} \longrightarrow \text{PostgreSQL}$$

- **`entitlement.routes.js` & `account.routes.js`**: Declare route endpoints, mount Zod validation middlewares, and intercept empty PATCH payloads with `requireNonEmptyBody`.
- **`entitlement.controller.js`**: Unpacks validated inputs (`req.validatedParams`, `req.validatedQuery`, `req.validatedBody`), invokes service methods, and serializes responses (`200`, `201`, `204 No Content`).
- **`entitlement.service.js`**: Enforces business rules, application boundary checks, transactional consistency, row-level locks, error preservation, and composite uniqueness mappings (`23505` $\to$ `409 Conflict`).
- **`entitlement.repository.js`**: Executes raw parameterized SQL (`$1, $2, ...`), manages join queries, and maintains allowlists for sort columns.
- **`entitlement.validation.js`**: Defines Zod schemas rejecting unknown fields (`.strict()`), validating UUIDs, enums, pagination boundaries, and boolean coercions.

---

## 2. When to Use Each Route & Lifecycle Decisions

| Endpoint | Method | Status | Operational Purpose | Typical When-to-Use Scenario |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/entitlements` | `GET` | `200 OK` | Paginated listing with filtering, search, and sorting | Rendering the central entitlement catalog table; auditing all privileged roles (`is_privileged=true`); filtering by application or type. |
| `/api/v1/entitlements/:entitlementId` | `GET` | `200 OK` | Single entitlement lookup by UUID | Viewing permission metadata, type, and privilege status before access reviews or approvals. |
| `/api/v1/entitlements` | `POST` | `201 Created` | Create a new entitlement definition | Ingestion connectors cataloging new roles, groups, or permission sets discovered in SaaS applications. |
| `/api/v1/entitlements/:entitlementId` | `PATCH` | `200 OK` | Partially update permitted definition fields | Classifying a role as privileged (`is_privileged: true`) or updating entitlement descriptions. Empty body is rejected with `400 Bad Request`. |
| `/api/v1/accounts/:accountId/entitlements` | `GET` | `200 OK` | List entitlements assigned to an account | Rendering the "Assigned Entitlements" tab on an account detail view; auditing permissions held by an orphan account. |
| `/api/v1/accounts/:accountId/entitlements` | `POST` | `201 Created` | Assign an entitlement to an account | Granting a role or group membership to an account within an ACID transaction. Duplicate assignments return `409 Conflict`. |
| `/api/v1/accounts/:accountId/entitlements/:entitlementId` | `DELETE` | `204 No Content` | Remove an entitlement assignment | Revoking an account's membership or privilege. Deletes the join relationship row; **does not** delete the underlying account or entitlement definition. |

---

## 3. Endpoints in Detail & Copy-Pasteable curl Commands

All endpoints are served at `http://localhost:5001`. Replace IDs as needed for your target environment.

### 3.1 List Entitlements (`GET /api/v1/entitlements`)
Retrieves cataloged entitlements with pagination, filtering, search, and sorting.

```bash
# Basic listing (default page=1, limit=20)
curl -s http://localhost:5001/api/v1/entitlements | jq .

# Filter by application and type
curl -s "http://localhost:5001/api/v1/entitlements?application_id=b0000000-0000-0000-0000-000000000001&type=role" | jq .

# Filter by privileged access only
curl -s "http://localhost:5001/api/v1/entitlements?is_privileged=true" | jq .

# Search by case-insensitive name or description
curl -s "http://localhost:5001/api/v1/entitlements?search=administrator" | jq .

# Sort by name descending
curl -s "http://localhost:5001/api/v1/entitlements?sort_by=name&sort_order=desc" | jq .
```

**Response Body (200 OK):**
```json
{
  "data": [
    {
      "id": "d0000000-0000-0000-0000-000000000001",
      "application_id": "b0000000-0000-0000-0000-000000000001",
      "name": "AdministratorAccess",
      "external_id": "arn:aws:iam::aws:policy/AdministratorAccess",
      "description": "Full unconstrained administrative access across all AWS services",
      "type": "role",
      "is_privileged": true,
      "created_at": "2026-01-10T10:00:00.000Z",
      "updated_at": "2026-01-10T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  },
  "meta": {
    "request_id": "7f8b9a1c-2d3e-4f5a-6b7c-8d9e0f1a2b3c"
  }
}
```

---

### 3.2 Get Entitlement by ID (`GET /api/v1/entitlements/:entitlementId`)
Retrieves a single entitlement definition by primary key.

```bash
curl -s http://localhost:5001/api/v1/entitlements/d0000000-0000-0000-0000-000000000001 | jq .
```

**Response Body (200 OK):**
```json
{
  "data": {
    "id": "d0000000-0000-0000-0000-000000000001",
    "application_id": "b0000000-0000-0000-0000-000000000001",
    "name": "AdministratorAccess",
    "external_id": "arn:aws:iam::aws:policy/AdministratorAccess",
    "description": "Full unconstrained administrative access across all AWS services",
    "type": "role",
    "is_privileged": true,
    "created_at": "2026-01-10T10:00:00.000Z",
    "updated_at": "2026-01-10T10:00:00.000Z"
  },
  "meta": {
    "request_id": "9a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d"
  }
}
```

---

### 3.3 Create Entitlement Definition (`POST /api/v1/entitlements`)
Creates a new entitlement definition inside an application catalog.

```bash
curl -s -X POST http://localhost:5001/api/v1/entitlements \
  -H "Content-Type: application/json" \
  -d '{
    "application_id": "b0000000-0000-0000-0000-000000000001",
    "name": "S3BucketManager",
    "external_id": "arn:aws:iam::aws:policy/AmazonS3FullAccess",
    "description": "Full access to manage Amazon S3 buckets and objects",
    "type": "role",
    "is_privileged": false
  }' | jq .
```

**Response Body (201 Created):**
```json
{
  "data": {
    "id": "f1234567-89ab-cdef-0123-456789abcdef",
    "application_id": "b0000000-0000-0000-0000-000000000001",
    "name": "S3BucketManager",
    "external_id": "arn:aws:iam::aws:policy/AmazonS3FullAccess",
    "description": "Full access to manage Amazon S3 buckets and objects",
    "type": "role",
    "is_privileged": false,
    "created_at": "2026-10-22T11:00:00.000Z",
    "updated_at": "2026-10-22T11:00:00.000Z"
  },
  "meta": {
    "request_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
  }
}
```

---

### 3.4 Partially Update Entitlement Definition (`PATCH /api/v1/entitlements/:entitlementId`)
Updates permitted metadata fields and refreshes the `updated_at` timestamp.

```bash
curl -s -X PATCH http://localhost:5001/api/v1/entitlements/f1234567-89ab-cdef-0123-456789abcdef \
  -H "Content-Type: application/json" \
  -d '{
    "is_privileged": true,
    "description": "Elevated full administrative access over S3 data assets"
  }' | jq .
```

**Empty Body Guard (`400 Bad Request`):**
```bash
curl -s -X PATCH http://localhost:5001/api/v1/entitlements/f1234567-89ab-cdef-0123-456789abcdef \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

---

### 3.5 List Entitlements Assigned to Account (`GET /api/v1/accounts/:accountId/entitlements`)
Retrieves all entitlements currently assigned to a target account.

```bash
# List all entitlements assigned to Ben's AWS account
curl -s http://localhost:5001/api/v1/accounts/c0000000-0000-0000-0000-000000000001/entitlements | jq .

# Filter by privileged roles assigned to account
curl -s "http://localhost:5001/api/v1/accounts/c0000000-0000-0000-0000-000000000001/entitlements?is_privileged=true" | jq .
```

**Response Body (200 OK):**
```json
{
  "data": [
    {
      "id": "d0000000-0000-0000-0000-000000000001",
      "application_id": "b0000000-0000-0000-0000-000000000001",
      "name": "AdministratorAccess",
      "external_id": "arn:aws:iam::aws:policy/AdministratorAccess",
      "description": "Full unconstrained administrative access across all AWS services",
      "type": "role",
      "is_privileged": true,
      "assigned_at": "2026-01-10T10:00:00.000Z",
      "created_at": "2026-01-10T10:00:00.000Z",
      "updated_at": "2026-01-10T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  },
  "meta": {
    "request_id": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e"
  }
}
```

---

### 3.6 Assign Entitlement to Account (`POST /api/v1/accounts/:accountId/entitlements`)
Assigns an entitlement to an account within an ACID transaction with row-level locks.

```bash
curl -s -X POST http://localhost:5001/api/v1/accounts/c0000000-0000-0000-0000-000000000002/entitlements \
  -H "Content-Type: application/json" \
  -d '{
    "entitlement_id": "d0000000-0000-0000-0000-000000000003"
  }' | jq .
```

**Response Body (201 Created):**
```json
{
  "data": {
    "account_id": "c0000000-0000-0000-0000-000000000002",
    "entitlement_id": "d0000000-0000-0000-0000-000000000003",
    "assigned_at": "2026-10-22T11:05:00.000Z"
  },
  "meta": {
    "request_id": "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f"
  }
}
```

**Duplicate Assignment Conflict (`409 Conflict`):**
If the assignment already exists, the database unique key constraint is caught and mapped to `409 Conflict`:
```json
{
  "error": {
    "code": "RESOURCE_CONFLICT",
    "message": "Entitlement is already assigned to this account",
    "request_id": "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a"
  }
}
```

**Cross-Application Mismatch (`422 Unprocessable Entity`):**
If the account belongs to Application A and the entitlement belongs to Application B:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "request_id": "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
    "details": [
      {
        "field": "entitlement_id",
        "message": "Cross-application entitlement assignment is forbidden: account and entitlement belong to different applications"
      }
    ]
  }
}
```

---

### 3.7 Remove Entitlement Assignment (`DELETE /api/v1/accounts/:accountId/entitlements/:entitlementId`)
Removes the assignment relationship from `account_entitlements`.

```bash
curl -i -X DELETE http://localhost:5001/api/v1/accounts/c0000000-0000-0000-0000-000000000002/entitlements/d0000000-0000-0000-0000-000000000003
```

**Response (204 No Content):**
```http
HTTP/1.1 204 No Content
X-Request-ID: f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c
Date: Thu, 22 Oct 2026 11:06:00 GMT
Connection: keep-alive
```

**Nonexistent Assignment (`404 Not Found`):**
If the assignment does not exist:
```json
{
  "error": {
    "code": "ASSIGNMENT_NOT_FOUND",
    "message": "Entitlement 'd0000000-0000-0000-0000-000000000003' is not assigned to account 'c0000000-0000-0000-0000-000000000002'",
    "request_id": "a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d"
  }
}
```

---

## 4. Transaction Handling & Concurrency Safeguards

The `POST /api/v1/accounts/:accountId/entitlements` operation implements two critical technical safeguards:

1. **Row-Level Shared Locks (`SELECT ... FOR SHARE`)**:
   During assignment, both the account record and the entitlement record are queried using `FOR SHARE` inside the transaction. This prevents concurrent transactions from mutating or deleting the parent records while the application consistency check is evaluated:
   ```sql
   SELECT id, application_id FROM accounts WHERE id = $1 FOR SHARE;
   SELECT id, application_id FROM entitlements WHERE id = $1 FOR SHARE;
   ```

2. **Rollback Error Preservation**:
   If an error occurs after `BEGIN`, a `ROLLBACK` query is attempted. The rollback execution is wrapped in a nested `try/catch` block so that any network or database driver error during rollback will **never mask the original exception**:
   ```javascript
   } catch (originalError) {
     if (inTransaction) {
       try {
         await client.query('ROLLBACK');
       } catch (rollbackErr) {
         console.error('[Transaction Rollback Error] Rollback failed:', rollbackErr);
       }
     }
     if (originalError.code === '23505') {
       throw createConflictError('Entitlement is already assigned to this account');
     }
     throw originalError;
   } finally {
     client.release();
   }
   ```

---

## 5. Swagger / OpenAPI 3.0 Documentation & Browser Testing

All 7 endpoints are documented in Swagger UI at:
- **Interactive UI**: `http://localhost:5001/docs`
- **Raw OpenAPI 3.0 Spec**: `http://localhost:5001/docs/openapi.json`

### Interactive Testing Steps:
1. Open `http://localhost:5001/docs` in your browser.
2. Locate the **Entitlements** tag in Swagger UI.
3. Test `GET /api/v1/entitlements` by clicking **Try it out** and **Execute**.
4. Test `POST /api/v1/accounts/{accountId}/entitlements` with account ID `c0000000-0000-0000-0000-000000000001` and verify `409 Conflict` when assigning existing entitlement `d0000000-0000-0000-0000-000000000001`.
5. Verify response schemas `EntitlementCollectionResponse`, `EntitlementSingleResponse`, and `AccountEntitlementAssignmentResponse`.

---

## 6. Test Suite & Teardown Verification

The automated integration suite is located at `backend/tests/entitlements.test.js` and contains **34 comprehensive tests**.

### Teardown Safeguards:
- Clean up tracked assignments (`DELETE FROM account_entitlements WHERE account_id = $1 AND entitlement_id = $2`) and tracked definitions (`DELETE FROM entitlements WHERE id = ANY($1::uuid[])`) in **independent try/catch blocks** so failure in one does not halt the other.
- The test HTTP server and PostgreSQL pool are **always closed in `finally`**.
- Teardown failures are reported to `stderr` and will fail the test run.
- Zero seed records (`SEED_ENTITLEMENTS` and `SEED_ACCOUNT_ENTITLEMENTS`) are mutated or deleted.
