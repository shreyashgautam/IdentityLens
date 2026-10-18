# Application Routes (`application-routes.md`)

This document details all application inventory endpoints defined in `docs/api-contract.md` Section 14.2 and scheduled for Milestone 4.

Applications represent target platforms (e.g. AWS, Salesforce, GitHub, Google Workspace, Okta) whose user accounts and entitlements are ingested and analyzed by IdentityLens.

---

## 1. List Applications

Retrieves a paginated list of registered target applications.

- **Method**: `GET`
- **Path**: `/api/v1/applications`
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
  - `search` (string, optional): Partial match on application name or key

### Example Request (curl):
```bash
curl -i "http://localhost:5001/api/v1/applications?page=1&limit=10"
```

### Response Body (200 OK):
```json
{
  "data": [
    {
      "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "name": "AWS Production",
      "key": "aws_prod",
      "description": "Production Cloud Infrastructure",
      "auth_type": "iam",
      "accounts_count": 84,
      "created_at": "2026-01-10T10:00:00.000Z",
      "updated_at": "2026-02-15T12:00:00.000Z"
    },
    {
      "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      "name": "Salesforce CRM",
      "key": "salesforce_crm",
      "description": "Enterprise CRM & Pipeline Management",
      "auth_type": "saml",
      "accounts_count": 140,
      "created_at": "2026-01-12T14:30:00.000Z",
      "updated_at": "2026-01-12T14:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "total_pages": 1
  },
  "meta": {
    "request_id": "c1384067-15ef-4573-8cb4-0545f479bb30"
  }
}
```

---

## 2. Get Application Details by ID

Retrieves application metadata, configuration details, and total linked accounts.

- **Method**: `GET`
- **Path**: `/api/v1/applications/:id`
- **Parameters**:
  - `id` (UUID, required): Application ID

### Example Request (curl):
```bash
curl -i http://localhost:5001/api/v1/applications/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
```

### Response Body (200 OK):
```json
{
  "data": {
    "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "name": "AWS Production",
    "key": "aws_prod",
    "description": "Production Cloud Infrastructure",
    "auth_type": "iam",
    "is_active": true,
    "accounts_count": 84,
    "entitlements_count": 18,
    "created_at": "2026-01-10T10:00:00.000Z",
    "updated_at": "2026-02-15T12:00:00.000Z"
  },
  "meta": {
    "request_id": "e9cf6764-a698-4663-9ee7-a4b518b5774a"
  }
}
```

---

## 3. Register New Application

Registers a target application into the system inventory.

- **Method**: `POST`
- **Path**: `/api/v1/applications`
- **Headers**: `Content-Type: application/json`

### Example Request (curl):
```bash
curl -i -X POST http://localhost:5001/api/v1/applications \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GitHub Enterprise",
    "key": "github_enterprise",
    "description": "Source Code Hosting & CI/CD",
    "auth_type": "oauth2"
  }'
```

### Response Body (201 Created):
```json
{
  "data": {
    "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "name": "GitHub Enterprise",
    "key": "github_enterprise",
    "description": "Source Code Hosting & CI/CD",
    "auth_type": "oauth2",
    "is_active": true,
    "created_at": "2026-10-18T14:52:00.000Z",
    "updated_at": "2026-10-18T14:52:00.000Z"
  },
  "meta": {
    "request_id": "76ecba71-6fa1-4ee6-8575-cf6226cb6b3f"
  }
}
```

---

## 4. Partially Update Application

- **Method**: `PATCH`
- **Path**: `/api/v1/applications/:id`

### Example Request (curl):
```bash
curl -i -X PATCH http://localhost:5001/api/v1/applications/cccccccc-cccc-cccc-cccc-cccccccccccc \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Core Source Code & Secrets Repository"
  }'
```

### Response Body (200 OK):
```json
{
  "data": {
    "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "name": "GitHub Enterprise",
    "key": "github_enterprise",
    "description": "Core Source Code & Secrets Repository",
    "auth_type": "oauth2",
    "is_active": true,
    "created_at": "2026-10-18T14:52:00.000Z",
    "updated_at": "2026-10-18T14:55:00.000Z"
  },
  "meta": {
    "request_id": "5cb8c1dc-b118-47bc-ad3a-7ef0885e3328"
  }
}
```
