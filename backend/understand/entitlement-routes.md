# Entitlement Routes (`entitlement-routes.md`)

This document details all entitlement catalog endpoints defined in `docs/api-contract.md` Section 14.4 and scheduled for Milestone 5.

Entitlements represent permissions, privileges, groups, or roles defined within target applications (e.g. AWS IAM Policies, Salesforce Permission Sets, GitHub Teams).

---

## 1. List Entitlements

Retrieves a paginated list of cataloged entitlements with filters for privilege classification, application ID, or type.

- **Method**: `GET`
- **Path**: `/api/v1/entitlements`
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
  - `application_id` (UUID, optional): Filter by target application
  - `is_privileged` (boolean, optional): If `true`, returns only high-risk/admin privileges
  - `type` (string, optional): `role` | `group` | `permission`

### Example Request (curl):
```bash
curl -i "http://localhost:5001/api/v1/entitlements?is_privileged=true"
```

### Response Body (200 OK):
```json
{
  "data": [
    {
      "id": "77777777-7777-7777-7777-777777777777",
      "name": "AdministratorAccess",
      "external_id": "arn:aws:iam::aws:policy/AdministratorAccess",
      "description": "Full administrative control over all AWS services",
      "type": "role",
      "is_privileged": true,
      "application_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "application_name": "AWS Production",
      "assigned_accounts_count": 4,
      "created_at": "2026-01-10T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  },
  "meta": {
    "request_id": "4b6ec610-d9c9-4673-95ad-e0d8b4492bf4"
  }
}
```

---

## 2. Get Entitlement Details by ID

- **Method**: `GET`
- **Path**: `/api/v1/entitlements/:id`

### Example Request (curl):
```bash
curl -i http://localhost:5001/api/v1/entitlements/77777777-7777-7777-7777-777777777777
```

### Response Body (200 OK):
```json
{
  "data": {
    "id": "77777777-7777-7777-7777-777777777777",
    "name": "AdministratorAccess",
    "external_id": "arn:aws:iam::aws:policy/AdministratorAccess",
    "description": "Full administrative control over all AWS services",
    "type": "role",
    "is_privileged": true,
    "application_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "application_name": "AWS Production",
    "assigned_accounts_count": 4,
    "created_at": "2026-01-10T10:00:00.000Z",
    "updated_at": "2026-01-10T10:00:00.000Z"
  },
  "meta": {
    "request_id": "893c5d6e-93ee-4be3-b09a-6cbe16ba99e1"
  }
}
```

---

## 3. Create Entitlement Definition

- **Method**: `POST`
- **Path**: `/api/v1/entitlements`
- **Headers**: `Content-Type: application/json`

### Example Request (curl):
```bash
curl -i -X POST http://localhost:5001/api/v1/entitlements \
  -H "Content-Type: application/json" \
  -d '{
    "application_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "name": "BillingFullAccess",
    "external_id": "arn:aws:iam::aws:policy/job-function/Billing",
    "description": "Access to view and modify AWS invoicing & payment methods",
    "type": "role",
    "is_privileged": true
  }'
```

### Response Body (201 Created):
```json
{
  "data": {
    "id": "88888888-8888-8888-8888-888888888888",
    "name": "BillingFullAccess",
    "external_id": "arn:aws:iam::aws:policy/job-function/Billing",
    "description": "Access to view and modify AWS invoicing & payment methods",
    "type": "role",
    "is_privileged": true,
    "application_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "created_at": "2026-10-18T14:58:00.000Z",
    "updated_at": "2026-10-18T14:58:00.000Z"
  },
  "meta": {
    "request_id": "7fa5c4d3-0eb1-4d98-b80c-e2f4f16da09a"
  }
}
```

---

## 4. Partially Update Entitlement

- **Method**: `PATCH`
- **Path**: `/api/v1/entitlements/:id`

### Example Request (curl):
```bash
curl -i -X PATCH http://localhost:5001/api/v1/entitlements/88888888-8888-8888-8888-888888888888 \
  -H "Content-Type: application/json" \
  -d '{
    "is_privileged": false
  }'
```

### Response Body (200 OK):
```json
{
  "data": {
    "id": "88888888-8888-8888-8888-888888888888",
    "name": "BillingFullAccess",
    "is_privileged": false,
    "updated_at": "2026-10-18T15:00:00.000Z"
  },
  "meta": {
    "request_id": "439bce8a-8532-4e67-8ce6-90eef538122c"
  }
}
```
