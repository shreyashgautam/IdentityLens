# Phase 7 — Inventory API Regression Testing Report
**Date:** 2026-11-01  
**Project:** IVIP Mini — Identity Discovery & Risk Explorer (IdentityLens)  
**Auditor:** Antigravity Senior QA & Application Security Tester  

---

## 1. Executive Summary

This Phase 7 Audit examines the full inventory API surface (`identities`, `applications`, `accounts`, `entitlements`, and relationships), verifying input validation, error envelope compliance, authentication gating, pagination, filtering, sorting, graph traversal constraints, and transaction boundaries.

### Summary of Results:
- **Identities API:** **100% PASS** (21/21 tests passing). Cycle-detection prevents circular manager/owner loops.
- **Applications API:** **100% PASS** (21/21 tests passing). Uniqueness on `app_code` strictly enforced.
- **Accounts API:** **100% PASS** (35/35 tests passing). Orphan filtering, linking/unlinking, and sub-resource lookups operational.
- **Entitlements API:** **100% PASS** (34/34 tests passing). Strict application boundary enforced (`account.application_id === entitlement.application_id`); duplicate grants rejected with `409 Conflict`.
- **Health & Probes:** **100% PASS** (10/10 tests passing).
- **Authentication Protection:** **100% PASS**. All inventory endpoints reject unauthenticated or unverified requests while keeping health endpoints public.

---

## 2. API Surface Verification Matrix

| Module | HTTP Method & Route | Authentication & Email Policy | Validation (Zod) | Success Envelope | Error Codes Verified | Status |
|---|---|---|---|---|---|---|
| **Identities** | `GET /api/v1/identities` | `authenticate` + `requireVerifiedEmail` | Pagination, filter, sort, search | `{ data, pagination, meta }` | `401`, `422` | **PASSED** |
| | `GET /api/v1/identities/:id` | `authenticate` + `requireVerifiedEmail` | UUID path param | `{ data, meta }` | `401`, `404`, `422` | **PASSED** |
| | `POST /api/v1/identities` | `authenticate` + `requireVerifiedEmail` | Strict schema, required fields | `201 Created` `{ data, meta }`| `401`, `422` | **PASSED** |
| | `PATCH /api/v1/identities/:id` | `authenticate` + `requireVerifiedEmail` | Non-empty body, cycle check | `200 OK` `{ data, meta }` | `400`, `401`, `404`, `409`, `422` | **PASSED** |
| | `GET /api/v1/identities/:id/accounts` | `authenticate` + `requireVerifiedEmail` | UUID path param | `{ data, meta }` | `401`, `404`, `422` | **PASSED** |
| **Applications** | `GET /api/v1/applications` | `authenticate` + `requireVerifiedEmail` | Pagination, filter, sort | `{ data, pagination, meta }` | `401`, `422` | **PASSED** |
| | `GET /api/v1/applications/:id` | `authenticate` + `requireVerifiedEmail` | UUID path param | `{ data, meta }` | `401`, `404`, `422` | **PASSED** |
| | `POST /api/v1/applications` | `authenticate` + `requireVerifiedEmail` | Strict schema, app_code | `201 Created` `{ data, meta }`| `401`, `409`, `422` | **PASSED** |
| | `PATCH /api/v1/applications/:id` | `authenticate` + `requireVerifiedEmail` | Non-empty body | `200 OK` `{ data, meta }` | `400`, `401`, `404`, `409`, `422` | **PASSED** |
| | `GET /api/v1/applications/:id/accounts` | `authenticate` + `requireVerifiedEmail` | UUID path param | `{ data, meta }` | `401`, `404`, `422` | **PASSED** |
| **Accounts** | `GET /api/v1/accounts` | `authenticate` + `requireVerifiedEmail` | Filter (`is_orphan`), sort | `{ data, pagination, meta }` | `401`, `422` | **PASSED** |
| | `GET /api/v1/accounts/:id` | `authenticate` + `requireVerifiedEmail` | UUID path param | `{ data, meta }` | `401`, `404`, `422` | **PASSED** |
| | `POST /api/v1/accounts` | `authenticate` + `requireVerifiedEmail` | Strict schema | `201 Created` `{ data, meta }`| `401`, `409`, `422` | **PASSED** |
| | `PATCH /api/v1/accounts/:id` | `authenticate` + `requireVerifiedEmail` | Linking/unlinking | `200 OK` `{ data, meta }` | `400`, `401`, `404`, `409`, `422` | **PASSED** |
| **Entitlements** | `GET /api/v1/entitlements` | `authenticate` + `requireVerifiedEmail` | Pagination, filter, search | `{ data, pagination, meta }` | `401`, `422` | **PASSED** |
| | `GET /api/v1/entitlements/:id` | `authenticate` + `requireVerifiedEmail` | UUID path param | `{ data, meta }` | `401`, `404`, `422` | **PASSED** |
| | `POST /api/v1/entitlements` | `authenticate` + `requireVerifiedEmail` | Unique `(app_id, name)` | `201 Created` `{ data, meta }`| `401`, `409`, `422` | **PASSED** |
| | `PATCH /api/v1/entitlements/:id` | `authenticate` + `requireVerifiedEmail` | Non-empty body | `200 OK` `{ data, meta }` | `400`, `401`, `404`, `409`, `422` | **PASSED** |
| | `GET /api/v1/accounts/:id/entitlements` | `authenticate` + `requireVerifiedEmail` | Account UUID param | `{ data, meta }` | `401`, `404`, `422` | **PASSED** |
| | `POST /api/v1/accounts/:id/entitlements` | `authenticate` + `requireVerifiedEmail` | Boundary check (`FOR SHARE`)| `201 Created` `{ data, meta }`| `401`, `404`, `409`, `422` | **PASSED** |
| | `DELETE /api/v1/accounts/:id/entitlements/:entId`| `authenticate` + `requireVerifiedEmail`| Join table delete | `204 No Content` | `401`, `404`, `422` | **PASSED** |
| **Health** | `GET /health` | Public probe | None | `200 OK` system info | *None* | **PASSED** |
| | `GET /health/live` | Public probe | None | `200 OK` liveness | *None* | **PASSED** |
| | `GET /health/ready` | Public probe | None | `200 OK` DB readiness | `503` if DB down | **PASSED** |
| | `GET /docs` & `/docs/openapi.json` | Public docs | None | `200 OK` Swagger UI / JSON | *None* | **PASSED** |

---

## 3. Key Design Preservations Verified

1. **No Destructive Account Deletion (`DELETE /accounts/:id`):**
   - Intentionally omitted. Target accounts are offboarded by setting `status = 'disabled'` or `'suspended'`. Deleting account records would cascade into deleting compliance history and audit trails.
2. **Strict Application Boundary Enforcement:**
   - Attempting to grant an AWS entitlement to a GitHub account returns `422 VALIDATION_ERROR` (`Entitlement does not belong to the same application as the account`).
3. **Preservation of Entitlement and Account on Grant Removal:**
   - Calling `DELETE /accounts/:id/entitlements/:id` deletes exclusively the join record in `account_entitlements`. Tests verify that both the account and entitlement definition persist intact.

