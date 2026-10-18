# Risk Intelligence & Evaluation Routes (`risk-routes.md`)

This document details all deterministic risk detection, finding triage, and evaluation endpoints defined in `docs/api-contract.md` Section 14.5–14.7 and scheduled for Milestone 10 & Milestone 11.

IdentityLens detects identity security risks using transparent, explainable rules (e.g. orphaned accounts, inactive users holding active accounts, privileged roles).

---

## 1. List Risk Findings

Retrieves security risk findings with filtering by severity, finding status, rule code, or target entity.

- **Method**: `GET`
- **Path**: `/api/v1/risk-findings`
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
  - `severity` (string, optional): `critical` | `high` | `medium` | `low`
  - `status` (string, optional): `open` | `resolved` | `suppressed`
  - `rule_code` (string, optional): `ORPHAN_ACCOUNT` | `INACTIVE_USER_ACTIVE_ACCOUNT` | `PRIVILEGED_ENTITLEMENT` | `STALE_ACCOUNT`

### Example Request (curl):
```bash
curl -i "http://localhost:5001/api/v1/risk-findings?severity=high&status=open"
```

### Response Body (200 OK):
```json
{
  "data": [
    {
      "id": "99999999-9999-9999-9999-999999999999",
      "rule_code": "ORPHAN_ACCOUNT",
      "severity": "high",
      "status": "open",
      "title": "Active application account without linked identity",
      "description": "Account legacy-dev-admin in AWS Production is active but has no associated canonical employee identity.",
      "account_id": "55555555-5555-5555-5555-555555555555",
      "identity_id": null,
      "application_name": "AWS Production",
      "evidence": {
        "external_id": "usr-aws-root-legacy",
        "last_login_at": "2026-02-10T19:22:00.000Z",
        "days_since_activity": 250
      },
      "first_detected_at": "2026-10-15T08:00:00.000Z",
      "last_detected_at": "2026-10-18T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  },
  "meta": {
    "request_id": "1894d0cf-829b-449e-ba78-2c3f878f4410"
  }
}
```

---

## 2. Get Risk Finding Details by ID

- **Method**: `GET`
- **Path**: `/api/v1/risk-findings/:id`

### Example Request (curl):
```bash
curl -i http://localhost:5001/api/v1/risk-findings/99999999-9999-9999-9999-999999999999
```

### Response Body (200 OK):
```json
{
  "data": {
    "id": "99999999-9999-9999-9999-999999999999",
    "rule_code": "ORPHAN_ACCOUNT",
    "severity": "high",
    "status": "open",
    "title": "Active application account without linked identity",
    "description": "Account legacy-dev-admin in AWS Production is active but has no associated canonical employee identity.",
    "account_id": "55555555-5555-5555-5555-555555555555",
    "identity_id": null,
    "application_name": "AWS Production",
    "evidence": {
      "external_id": "usr-aws-root-legacy",
      "last_login_at": "2026-02-10T19:22:00.000Z",
      "days_since_activity": 250
    },
    "remediation_guidance": "Verify if this account is legitimate. Link it to an existing canonical identity or deactivate the account in AWS Production.",
    "first_detected_at": "2026-10-15T08:00:00.000Z",
    "last_detected_at": "2026-10-18T12:00:00.000Z"
  },
  "meta": {
    "request_id": "3587b1c4-2a62-43bb-a320-c9f518e98661"
  }
}
```

---

## 3. Triage / Suppress Finding

Allows security operators to suppress a finding (e.g. approved break-glass account) or mark it resolved.

- **Method**: `PATCH`
- **Path**: `/api/v1/risk-findings/:id`
- **Headers**: `Content-Type: application/json`

### Example Request (curl):
```bash
curl -i -X PATCH http://localhost:5001/api/v1/risk-findings/99999999-9999-9999-9999-999999999999 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "suppressed",
    "justification": "Approved break-glass account for disaster recovery protocol #SEC-890"
  }'
```

### Response Body (200 OK):
```json
{
  "data": {
    "id": "99999999-9999-9999-9999-999999999999",
    "status": "suppressed",
    "justification": "Approved break-glass account for disaster recovery protocol #SEC-890",
    "suppressed_by": "admin@company.com",
    "updated_at": "2026-10-18T15:02:00.000Z"
  },
  "meta": {
    "request_id": "50e417a8-6f62-4bda-a841-f761bbcb8ca3"
  }
}
```

---

## 4. Trigger Asynchronous Risk Evaluation

Initiates an inventory-wide or application-scoped deterministic risk assessment. As per `docs/api-contract.md` Section 14.6, long-running evaluations execute as background tasks.

- **Method**: `POST`
- **Path**: `/api/v1/risk-evaluations`
- **Headers**: `Content-Type: application/json`

### Example Request (curl):
```bash
curl -i -X POST http://localhost:5001/api/v1/risk-evaluations \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "all"
  }'
```

### Response Body (202 Accepted):
```json
{
  "data": {
    "task_id": "task-eval-20261018-001",
    "status": "pending",
    "message": "Risk evaluation job submitted successfully",
    "poll_url": "/api/v1/background-tasks/task-eval-20261018-001"
  },
  "meta": {
    "request_id": "78abec11-42cb-4bc1-901d-53aa7a0ec324"
  }
}
```

---

## 5. Poll Background Task Status

Retrieves the execution status and summary of an asynchronous evaluation or import task.

- **Method**: `GET`
- **Path**: `/api/v1/background-tasks/:taskId`

### Example Request (curl):
```bash
curl -i http://localhost:5001/api/v1/background-tasks/task-eval-20261018-001
```

### Response Body (200 OK):
```json
{
  "data": {
    "task_id": "task-eval-20261018-001",
    "task_type": "risk_evaluation",
    "status": "completed",
    "progress_percent": 100,
    "result": {
      "rules_evaluated": 4,
      "identities_analyzed": 105,
      "accounts_analyzed": 224,
      "new_findings_created": 3,
      "existing_findings_updated": 8,
      "resolved_findings": 1
    },
    "started_at": "2026-10-18T15:02:10.000Z",
    "completed_at": "2026-10-18T15:02:14.000Z"
  },
  "meta": {
    "request_id": "89ec07c8-356a-4d74-b5a8-4bb9ebae3732"
  }
}
```
