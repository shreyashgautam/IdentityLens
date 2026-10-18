# Account Routes (`account-routes.md`)

This document details all application account and entitlement-assignment endpoints defined in `docs/api-contract.md` Section 14.3 and scheduled for Milestone 4 & Milestone 5.

Accounts represent target-system credentials (e.g. AWS IAM users, Salesforce accounts, GitHub logins) and establish links to canonical identities.

---

## 1. List Application Accounts

Retrieves accounts across all connected applications, with filters for orphaned accounts (no linked identity), specific application IDs, or identity IDs.

- **Method**: `GET`
- **Path**: `/api/v1/accounts`
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
  - `identity_id` (UUID, optional): Filter accounts owned by an identity
  - `application_id` (UUID, optional): Filter by target system
  - `status` (string, optional): `active` | `disabled` | `suspended`
  - `is_orphaned` (boolean, optional): If `true`, returns accounts where `identity_id IS NULL`

### Example Request (curl):
```bash
curl -i "http://localhost:5001/api/v1/accounts?is_orphaned=true&limit=2"
```

### Response Body (200 OK):
```json
{
  "data": [
    {
      "id": "55555555-5555-5555-5555-555555555555",
      "external_id": "usr-aws-root-legacy",
      "account_name": "legacy-dev-admin",
      "status": "active",
      "identity_id": null,
      "application_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "application_name": "AWS Production",
      "last_login_at": "2026-02-10T19:22:00.000Z",
      "created_at": "2025-06-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 2,
    "total": 1,
    "total_pages": 1
  },
  "meta": {
    "request_id": "d027df2b-42ab-4171-87aa-65cebbba8842"
  }
}
```

---

## 2. Get Account by ID

- **Method**: `GET`
- **Path**: `/api/v1/accounts/:id`

### Example Request (curl):
```bash
curl -i http://localhost:5001/api/v1/accounts/55555555-5555-5555-5555-555555555555
```

### Response Body (200 OK):
```json
{
  "data": {
    "id": "55555555-5555-5555-5555-555555555555",
    "external_id": "usr-aws-root-legacy",
    "account_name": "legacy-dev-admin",
    "status": "active",
    "identity_id": null,
    "application_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "application_name": "AWS Production",
    "entitlements_count": 3,
    "last_login_at": "2026-02-10T19:22:00.000Z",
    "created_at": "2025-06-01T10:00:00.000Z",
    "updated_at": "2026-02-10T19:22:00.000Z"
  },
  "meta": {
    "request_id": "4221da21-f002-4fc8-9f36-1e0e5a593361"
  }
}
```

---

## 3. Link Account to Identity (Reconciliation Update)

Links an account to a canonical identity or updates account status.

- **Method**: `PATCH`
- **Path**: `/api/v1/accounts/:id`
- **Headers**: `Content-Type: application/json`

### Example Request (curl):
```bash
curl -i -X PATCH http://localhost:5001/api/v1/accounts/55555555-5555-5555-5555-555555555555 \
  -H "Content-Type: application/json" \
  -d '{
    "identity_id": "11111111-1111-1111-1111-111111111111"
  }'
```

### Response Body (200 OK):
```json
{
  "data": {
    "id": "55555555-5555-5555-5555-555555555555",
    "external_id": "usr-aws-root-legacy",
    "account_name": "legacy-dev-admin",
    "status": "active",
    "identity_id": "11111111-1111-1111-1111-111111111111",
    "application_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "updated_at": "2026-10-18T14:55:00.000Z"
  },
  "meta": {
    "request_id": "b0cfbeaa-2ba6-455b-b5d1-133501ad9c70"
  }
}
```
*(Notice: Resolving the orphaned link automatically triggers the deterministic risk engine to resolve any open `ORPHAN_ACCOUNT` finding for this account).*

---

## 4. List Account Entitlements (Assigned Privileges)

Retrieves all roles, permissions, or groups assigned to an account.

- **Method**: `GET`
- **Path**: `/api/v1/accounts/:accountId/entitlements`

### Example Request (curl):
```bash
curl -i http://localhost:5001/api/v1/accounts/55555555-5555-5555-5555-555555555555/entitlements
```

### Response Body (200 OK):
```json
{
  "data": [
    {
      "id": "77777777-7777-7777-7777-777777777777",
      "name": "AdministratorAccess",
      "type": "role",
      "is_privileged": true,
      "assigned_at": "2026-01-01T12:00:00.000Z"
    }
  ],
  "meta": {
    "request_id": "1005ca78-3b32-4740-9a25-c6fa720e3dd8"
  }
}
```

---

## 5. Assign Entitlement to Account

- **Method**: `POST`
- **Path**: `/api/v1/accounts/:accountId/entitlements`
- **Headers**: `Content-Type: application/json`

### Example Request (curl):
```bash
curl -i -X POST http://localhost:5001/api/v1/accounts/55555555-5555-5555-5555-555555555555/entitlements \
  -H "Content-Type: application/json" \
  -d '{
    "entitlement_id": "77777777-7777-7777-7777-777777777777"
  }'
```

### Response Body (201 Created):
```json
{
  "data": {
    "account_id": "55555555-5555-5555-5555-555555555555",
    "entitlement_id": "77777777-7777-7777-7777-777777777777",
    "assigned_at": "2026-10-18T14:56:00.000Z"
  },
  "meta": {
    "request_id": "8bb31980-ffca-4d64-be23-5e2694b9101c"
  }
}
```

---

## 6. Revoke Entitlement Assignment

Removes an assigned entitlement from an account (does NOT delete the entitlement definition).

- **Method**: `DELETE`
- **Path**: `/api/v1/accounts/:accountId/entitlements/:entitlementId`

### Example Request (curl):
```bash
curl -i -X DELETE http://localhost:5001/api/v1/accounts/55555555-5555-5555-5555-555555555555/entitlements/77777777-7777-7777-7777-777777777777
```

### Response Body (204 No Content):
```http
HTTP/1.1 204 No Content
X-Request-ID: 9912cead-20b1-419b-a796-0ba149e6aa85
```
