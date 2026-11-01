# Phase 3 — Database and Data-Integrity Testing Report
**Date:** 2026-11-01  
**Project:** IVIP Mini — Identity Discovery & Risk Explorer (IdentityLens)  
**Auditor:** Antigravity Senior QA & Application Security Tester  

---

## 1. Executive Summary

This Phase 3 Audit evaluates the PostgreSQL database schema, migration mechanics, table constraints, foreign-key cascade behaviors, transaction boundaries, SQL injection resilience, and exact data-integrity preservation.

### Summary of Results:
- **Migration Tracking (`schema_migrations`):** **VERIFIED**. Migrations `001` and `002` are properly recorded.
- **Authentication Schema Integrity:** **VERIFIED**. All 4 authentication tables exist with appropriate indexes, foreign keys, and defaults.
- **SQL Parameterization:** **VERIFIED**. 100% of repository queries use parameterized placeholders (`$1, $2, ...`). Zero raw user concatenation was found.
- **Sort Allowlist Security:** **VERIFIED**. Sort columns are rigorously verified against strict in-code allowlists before being injected into `ORDER BY` clauses.
- **Transaction Rollback Testing:** **VERIFIED**. Tests confirm atomic rollback when multi-step operations (e.g. user creation + session creation) fail.
- **Inventory Seed Count Preservation:** **VERIFIED**. All 6 core tables retain exact Northstar Labs baseline counts before and after test execution.

---

## 2. Detailed Schema & Constraint Inspection

### A. Core Authentication Tables (`002_authentication_schema.sql`)

| Table Name | Primary Key | Foreign Keys & Actions | Unique Constraints | Indexes |
|---|---|---|---|---|
| `users` | `id UUID` (`gen_random_uuid()`) | *None* | `UNIQUE (firebase_uid)`, `UNIQUE (email)` | Implicit B-tree indexes from unique constraints |
| `user_sessions` | `id UUID` (`gen_random_uuid()`) | `user_id -> users(id) ON DELETE CASCADE` | *None* | `idx_user_sessions_user_id`, `idx_user_sessions_lookup (id, is_revoked, expires_at)` |
| `consumed_refresh_tokens` | `id UUID` (`gen_random_uuid()`) | `session_id -> user_sessions(id) ON DELETE CASCADE` | *None* | `idx_consumed_tokens_lookup (session_id, token_hash)`, `idx_consumed_tokens_cleanup (consumed_at)` |
| `auth_audit_log` | `id UUID` (`gen_random_uuid()`) | `user_id -> users(id) ON DELETE SET NULL` | *None* | `idx_auth_audit_log_user_id`, `idx_auth_audit_log_action` |

### B. Foreign Key & Deletion Behavior Verification
- When a `user` record is deleted:
  - Cascades to delete all corresponding `user_sessions` automatically.
  - Cascades to delete all `consumed_refresh_tokens` for those sessions automatically.
  - Sets `user_id = NULL` on `auth_audit_log` to preserve an immutable compliance record while maintaining referential integrity.

---

## 3. Data Integrity & Boundary Findings

### Finding 1: Email Normalization & Case-Insensitive Uniqueness Boundary (P2 — Architectural Gap)
- **Observation:** `users.email` is defined as `VARCHAR(255) NOT NULL UNIQUE`.
- **Application Layer Behavior:** In `backend/src/modules/auth/auth.service.js`, the service enforces `const normalizedEmail = email.trim().toLowerCase();` before performing lookups or inserts.
- **Database Layer Gap:** The database unique constraint `users_email_key` is case-sensitive B-tree indexing. If an administrative script, out-of-band migration, or direct SQL query inserts `User@example.com`, PostgreSQL would permit it alongside `user@example.com`.
- **Risk:** Potential case-variant duplicate records if inserted outside the Express API application layer.
- **Recommended Action (requires migration approval):** In a future migration, consider migrating `users.email` to `citext` or creating a unique expression index:
  ```sql
  CREATE UNIQUE INDEX idx_users_email_lower ON users (LOWER(email));
  ```
  *(Per audit guidelines, no schema migration is executed without user approval).*

### Finding 2: Missing Unique Constraint on `consumed_refresh_tokens (session_id, token_hash)` (P3 — Inconsistency)
- **Observation:** In `consumed_refresh_tokens`, lookup performance is optimized by `idx_consumed_tokens_lookup ON consumed_refresh_tokens (session_id, token_hash)`.
- **Gap:** The index is a non-unique index (`CREATE INDEX`) rather than a `UNIQUE` constraint. Replay attempts currently insert a duplicate row if multiple replay attacks occur with the same hash.
- **Impact:** Low; does not break replay defense, but allows redundant consumed token rows for the same replayed hash.

---

## 4. Northstar Labs Baseline Seed Counts

Verified before and after test executions:

| Table | Expected Count | Actual Count Before | Actual Count After | Status |
|---|---|---|---|---|
| `identities` | 10 | 10 | 10 | **Preserved (100%)** |
| `applications` | 6 | 6 | 6 | **Preserved (100%)** |
| `accounts` | 14 | 14 | 14 | **Preserved (100%)** |
| `entitlements` | 10 | 10 | 10 | **Preserved (100%)** |
| `account_entitlements` | 18 | 18 | 18 | **Preserved (100%)** |
| `risk_findings` | 6 | 6 | 6 | **Preserved (100%)** |
| `users` | 0 | 0 | 0 | **Clean (0 test residuals)** |
| `user_sessions` | 0 | 0 | 0 | **Clean (0 test residuals)** |
| `consumed_refresh_tokens` | 0 | 0 | 0 | **Clean (0 test residuals)** |
| `auth_audit_log` | 0 | 0 | 0 | **Clean (0 test residuals)** |

