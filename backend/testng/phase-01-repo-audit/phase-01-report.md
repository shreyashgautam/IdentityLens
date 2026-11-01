# Phase 1 — Repository and Requirements Audit Report
**Date:** 2026-11-01  
**Project:** IVIP Mini — Identity Discovery & Risk Explorer (IdentityLens)  
**Auditor:** Antigravity Senior QA & Application Security Tester  

---

## 1. Executive Summary

This Phase 1 Audit inspects the actual repository structure, Git commit history, code architecture, database schemas, and documentation artifacts to establish a strict requirements traceability baseline before conducting active testing.

### Key Audit Findings:
1. **Working Tree Cleanliness:** The working tree is clean on branch `main` at commit `3f3a296`.
2. **Current Implementation Scope:**
   - **Milestones 1–3 (Core Foundation & Seed Data):** Fully implemented and operational.
   - **Milestone 4 (Identity, Application, and Account Inventory APIs):** Fully implemented with comprehensive integration coverage.
   - **Milestone 5 (Entitlement Catalog & Transactional Assignments):** Fully implemented with strict application boundary enforcement and row-level locking.
   - **Milestone 6 (Authentication Foundation — Stages A, B, C):** Fully implemented. Includes database migration `002`, Firebase ID token exchange, `authenticate` and `requireVerifiedEmail` middleware, single-use refresh token rotation with SHA-256 hashing and zero-grace replay defense, session revocation (`/logout`), and atomic user-wide revocation (`/revoke-all`).
   - **Milestone 6 (Stage D & Advanced Auth):** Currently **NOT IMPLEMENTED**. Endpoints such as `POST /auth/password-reset/complete`, `GET /auth/me`, `GET /auth/sessions`, `DELETE /auth/sessions/:id`, and `bootstrap-admin.js` do not exist.
   - **Risk Engine (Milestone 10):** `risk_findings` table exists in PostgreSQL with 6 seed rows, but routes in `backend/src/routes/index.js` remain commented out (`// v1Router.use('/risk-findings', riskRoutes)`).
   - **Frontend (Milestones 7–8):** The frontend in `frontend/` is a minimal Vite+React stub. It has no authentication client, token storage, or inventory tables.

---

## 2. Git & Working Tree State

- **Branch:** `main`
- **Current HEAD Commit:** `3f3a296 feat(auth): implement Stage C session security, refresh rotation, and protected APIs`
- **Preceding Commits:**
  - `0b5a5d6 feat(auth): implement M6 Phase 1 Stage A & B authentication foundation`
  - `f8d7f09 feat(m5): implement entitlement catalog and transactional account assignments`
- **Working Tree:** Clean (0 unstaged changes, 0 staged changes).

---

## 3. Database Migration State & Seed Data Baseline

Verified against local PostgreSQL instance `identitylens` (version: PostgreSQL 14+):
- **Applied Migrations:**
  - `001_initial_schema.sql` (Recorded in `schema_migrations`)
  - `002_authentication_schema.sql` (Recorded in `schema_migrations`)
- **Inventory Seed Record Verification:**
  - `identities`: **10** rows (Northstar Labs seed)
  - `applications`: **6** rows (AWS, GitHub, Google Workspace, Salesforce, Okta, Jira)
  - `accounts`: **14** rows (human and service accounts)
  - `entitlements`: **10** rows (roles, permissions, groups)
  - `account_entitlements`: **18** rows (relationship assignments)
  - `risk_findings`: **6** rows (initial risk findings)
- **Authentication State Baseline:**
  - `users`: **0** rows
  - `user_sessions`: **0** rows
  - `consumed_refresh_tokens`: **0** rows
  - `auth_audit_log`: **0** rows

---

## 4. Requirements Traceability Matrix

| Requirement Identifier | Specification Source | Implementation Location | Existing Test Suite / Location | Initial Verified Result | Status |
|---|---|---|---|---|---|
| **REQ-FND-01: Health & Readiness Probes** | `docs/api-contract.md` §14.8 | `backend/src/modules/health/` | `backend/tests/health.test.js` | 200 OK with uptime, memory, timestamp | **Implemented & Verified** |
| **REQ-FND-02: OpenAPI / Swagger Docs** | `docs/api-contract.md` §14 | `backend/src/config/swagger.js` | `backend/tests/health.test.js` | OpenAPI 3.0 JSON specification returned | **Implemented & Verified** |
| **REQ-DB-01: Migration Runner & Pool** | `docs/data-model.md` | `backend/src/database/migrator.js` | `backend/tests/database.test.js` | Advisory locks prevent race conditions | **Implemented & Verified** |
| **REQ-IDN-01: Identity CRUD & Filtering** | `docs/api-contract.md` §14.1 | `backend/src/modules/identities/` | `backend/tests/identities.test.js` | 21/21 passing tests | **Implemented & Verified** |
| **REQ-IDN-02: Circular Ownership Detection** | `docs/architecture.md` | `backend/src/modules/identities/` | `backend/tests/identities.test.js` | Graph cycle check rejects self/multi-hop loops with 409 | **Implemented & Verified** |
| **REQ-APP-01: Application CRUD & Uniqueness** | `docs/api-contract.md` §14.2 | `backend/src/modules/applications/` | `backend/tests/applications.test.js` | 21/21 passing tests; unique app_code | **Implemented & Verified** |
| **REQ-ACC-01: Account CRUD & Orphan Filter** | `docs/api-contract.md` §14.3 | `backend/src/modules/accounts/` | `backend/tests/accounts.test.js` | 35/35 passing tests; is_orphan filter | **Implemented & Verified** |
| **REQ-ACC-02: Identity-Account Linking** | `docs/api-contract.md` §14.3 | `backend/src/modules/accounts/` | `backend/tests/accounts.test.js` | Linking and unlinking via PATCH verified | **Implemented & Verified** |
| **REQ-ENT-01: Entitlement Catalog CRUD** | `docs/api-contract.md` §14.4 | `backend/src/modules/entitlements/` | `backend/tests/entitlements.test.js` | 34/34 passing tests | **Implemented & Verified** |
| **REQ-ENT-02: Transactional Assignment** | `docs/api-contract.md` §14.4 | `backend/src/modules/entitlements/` | `backend/tests/entitlements.test.js` | Row lock FOR SHARE; 422 on cross-app mismatch | **Implemented & Verified** |
| **REQ-AUTH-01: Auth Database Schema** | `docs/data-model.md` | `migrations/002_*.sql` | `backend/tests/database.test.js` | 4 auth tables created with foreign keys | **Implemented & Verified** |
| **REQ-AUTH-02: Firebase Token Exchange** | `docs/api-contract.md` §7 | `backend/src/modules/auth/` | `backend/tests/auth.test.js` | Exchanges ID token, enforces Zero Auto-Merge | **Implemented & Verified** |
| **REQ-AUTH-03: Access JWT Validation** | `docs/api-contract.md` §7.8 | `backend/src/middlewares/auth.js` | `backend/tests/auth.test.js` | Verifies HS256 signature, claims, and DB state | **Implemented & Verified** |
| **REQ-AUTH-04: Provider Email Policy** | `security/threat-model.md` | `backend/src/middlewares/auth.js` | `backend/tests/auth.test.js` | Password requires verified email; Google/GitHub admitted | **Implemented & Verified** |
| **REQ-AUTH-05: Inventory Route Protection** | `docs/roadmap.md` M6 | `backend/src/routes/index.js` | `backend/tests/auth.test.js` | Unauthenticated requests rejected with 401 | **Implemented & Verified** |
| **REQ-AUTH-06: Refresh Token Rotation** | `docs/api-contract.md` §7.3 | `backend/src/modules/auth/` | `backend/tests/auth.test.js` | HttpOnly cookie, SHA-256 hashing, row-level locks | **Implemented & Verified** |
| **REQ-AUTH-07: Replay Defense & Revocation**| `security/threat-model.md` | `backend/src/modules/auth/` | `backend/tests/auth.test.js` | Replay revokes session family, logs audit event | **Implemented & Verified** |
| **REQ-AUTH-08: Session Logout** | `docs/api-contract.md` §7.4 | `backend/src/modules/auth/` | `backend/tests/auth.test.js` | Revokes single session, clears cookie | **Implemented & Verified** |
| **REQ-AUTH-09: User-Wide Revoke-All** | `security/threat-model.md` | `backend/src/modules/auth/` | `backend/tests/auth.test.js` | Increments token_version, revokes all sessions | **Implemented & Verified** |
| **REQ-AUTH-10: Password Reset Sync** | `docs/roadmap.md` Stage D | *None* | *None* | Pending Stage D implementation | **Not Implemented** |
| **REQ-AUTH-11: Current User & Session List**| `docs/roadmap.md` Stage D | *None* | *None* | Pending Stage D implementation | **Not Implemented** |
| **REQ-AUTH-12: Admin Bootstrap CLI** | `docs/roadmap.md` Stage D | *None* | *None* | Pending Stage D implementation | **Not Implemented** |
| **REQ-AUTH-13: Dedicated Auth Rate Limits**| `docs/api-contract.md` §9 | `backend/src/app.js` (global only)| *None* | Global rate limit (100/15m) only; auth rate limit (10/15m) missing | **Partially Implemented** |
| **REQ-RBAC-01: Route-Level RBAC Enforcement**| `docs/api-contract.md` §8 | `backend/src/middlewares/` | *None* | Role claim present in JWT, but no `authorizeRoles` middleware mounted | **Partially Implemented** |
| **REQ-RSK-01: Risk Findings API** | `docs/api-contract.md` §14.5 | *None* | *None* | Routes commented out; Milestone 10 | **Not Implemented** |
| **REQ-UI-01: Frontend Auth & Dashboard** | `docs/roadmap.md` M7–M8 | `frontend/src/` | *None* | Minimal placeholder app; Milestone 7 | **Not Implemented** |

---

## 5. Inconsistencies & Architecture Gaps Discovered

1. **`docs/api-contract.md` vs. Actual Authentication Architecture:**
   - Section 7 of `docs/api-contract.md` originally specified traditional email/password endpoints (`POST /api/v1/auth/signup` and `POST /api/v1/auth/login`).
   - However, the approved architectural specification in Milestone 6 migrated authentication to **Firebase ID Token Exchange** (`POST /api/v1/auth/firebase/exchange`).
   - *Recommendation:* Update Section 7 of `docs/api-contract.md` to document `/api/v1/auth/firebase/exchange` as the authoritative primary authentication endpoint.
2. **Missing Auth-Specific Rate Limiting:**
   - `docs/api-contract.md` §9 and `security/threat-model.md` mandate strict rate limiting for authentication endpoints (e.g. 10 requests / 15 minutes).
   - Currently, `backend/src/app.js` only mounts a coarse global limiter (`100 requests / 15 minutes`). The `/api/v1/auth/*` endpoints lack dedicated brute-force rate limiters.
3. **RBAC Middleware Gap:**
   - While the user schema and JWT payload include the `role` field (`admin`, `analyst`, `viewer`), there is currently no `authorizeRole(['admin'])` middleware guarding privileged inventory operations. All authenticated users currently possess equal read/write access to inventory endpoints.
4. **Unimplemented Risk Findings Route:**
   - `v1Router.get('/')` lists `'/risk-findings'` in its available endpoints list, but the route itself is commented out in `backend/src/routes/index.js`, returning `404 Not Found` if called.

