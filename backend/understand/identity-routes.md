# Identity Routes (`identity-routes.md`)

This document details all identity inventory endpoints defined in `docs/api-contract.md` Section 14.1 and scheduled for Milestone 4.

Canonical identities represent the single source of truth for employees, contractors, service accounts, and bots across the organization.

---

## 1. List Canonical Identities

Retrieves a paginated list of identities with optional filtering by status, identity type, department, and search query.

- **Method**: `GET`
- **Path**: `/api/v1/identities`
- **Query Parameters**:
  - `page` (integer, default: 1): Page number
  - `limit` (integer, default: 20, max: 100): Records per page
  - `status` (string, optional): `active` | `inactive` | `suspended`
  - `type` (string, optional): `human` | `service_account` | `bot`
  - `department` (string, optional): Filter by department (e.g. `Engineering`)
  - `search` (string, optional): Partial match on name or email

### Example Request (curl):
```bash
curl -i "http://localhost:5001/api/v1/identities?page=1&limit=2&status=active"
```

### Response Body (200 OK):
```json
{
  "data": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "first_name": "Sarah",
      "last_name": "Connor",
      "email": "sarah.connor@cyberdyne.io",
      "status": "active",
      "type": "human",
      "department": "Security Operations",
      "created_at": "2026-01-15T08:30:00.000Z",
      "updated_at": "2026-03-20T11:45:00.000Z"
    },
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "first_name": "Deploy",
      "last_name": "Bot",
      "email": "deploy-bot@cyberdyne.io",
      "status": "active",
      "type": "service_account",
      "department": "Infrastructure",
      "created_at": "2026-02-01T10:00:00.000Z",
      "updated_at": "2026-02-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 2,
    "total": 45,
    "total_pages": 23
  },
  "meta": {
    "request_id": "8f481c8e-3245-4e78-95a2-cbe8a8c238b1"
  }
}
```

---

## 2. Get Single Identity by ID

Retrieves full profile details for a specific canonical identity by UUID.

- **Method**: `GET`
- **Path**: `/api/v1/identities/:id`
- **Parameters**:
  - `id` (UUID, required): Canonical identity ID

### Example Request (curl):
```bash
curl -i http://localhost:5001/api/v1/identities/11111111-1111-1111-1111-111111111111
```

### Response Body (200 OK):
```json
{
  "data": {
    "id": "11111111-1111-1111-1111-111111111111",
    "first_name": "Sarah",
    "last_name": "Connor",
    "email": "sarah.connor@cyberdyne.io",
    "status": "active",
    "type": "human",
    "title": "Principal Security Engineer",
    "department": "Security Operations",
    "manager_id": null,
    "accounts_count": 5,
    "created_at": "2026-01-15T08:30:00.000Z",
    "updated_at": "2026-03-20T11:45:00.000Z"
  },
  "meta": {
    "request_id": "3b680798-2512-4217-9150-14e3049b4d58"
  }
}
```

### Response Body (404 Not Found):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Identity not found: 11111111-1111-1111-1111-999999999999",
    "request_id": "7622d9b6-8964-4e7d-b312-32b0d3663ab0"
  }
}
```

---

## 3. Create Identity

Creates a new canonical identity. Request body is strictly validated using Zod schemas.

- **Method**: `POST`
- **Path**: `/api/v1/identities`
- **Headers**: `Content-Type: application/json`

### Example Request (curl):
```bash
curl -i -X POST http://localhost:5001/api/v1/identities \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@company.com",
    "type": "human",
    "department": "Finance",
    "status": "active"
  }'
```

### Response Body (201 Created):
```json
{
  "data": {
    "id": "33333333-3333-3333-3333-333333333333",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@company.com",
    "status": "active",
    "type": "human",
    "department": "Finance",
    "created_at": "2026-10-18T14:45:00.000Z",
    "updated_at": "2026-10-18T14:45:00.000Z"
  },
  "meta": {
    "request_id": "421e8d91-62d4-4a46-8e12-c23f20a65660"
  }
}
```

### Validation Error Response (422 Unprocessable Entity):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "request_id": "a984405c-d3fa-4a6c-9c94-cb87e025d5d1",
    "details": [
      {
        "field": "email",
        "message": "Invalid email address format"
      }
    ]
  }
}
```

---

## 4. Partially Update Identity

Updates specific fields on an existing canonical identity (e.g. status transition, department move).

- **Method**: `PATCH`
- **Path**: `/api/v1/identities/:id`
- **Headers**: `Content-Type: application/json`

### Example Request (curl):
```bash
curl -i -X PATCH http://localhost:5001/api/v1/identities/33333333-3333-3333-3333-333333333333 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "inactive"
  }'
```

### Response Body (200 OK):
```json
{
  "data": {
    "id": "33333333-3333-3333-3333-333333333333",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@company.com",
    "status": "inactive",
    "type": "human",
    "department": "Finance",
    "created_at": "2026-10-18T14:45:00.000Z",
    "updated_at": "2026-10-18T14:50:00.000Z"
  },
  "meta": {
    "request_id": "787c80ab-8dbb-43ad-8d38-2d880bb6da82"
  }
}
```
*(Trigger notice: When an identity status transitions to `inactive`, the deterministic risk engine flags any associated accounts that remain active under Rule 2: `INACTIVE_USER_ACTIVE_ACCOUNT`).*
