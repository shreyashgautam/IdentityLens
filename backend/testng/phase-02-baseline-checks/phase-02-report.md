# Phase 2 — Baseline and Static Quality Checks Report
**Date:** 2026-11-01  
**Project:** IVIP Mini — Identity Discovery & Risk Explorer (IdentityLens)  
**Auditor:** Antigravity Senior QA & Application Security Tester  

---

## 1. Executive Summary

This Phase 2 Audit establishes the empirical baseline across all automated test suites, syntax checks, typecheck/build checks, linting, git formatting, and dependency vulnerability audits.

### Summary of Results:
- **Backend Test Runner (`npm --prefix backend test`):** **PASSED** (159 passed, 0 failed, 7 suites, duration: ~2.38s).
- **Backend Source Syntax Check (`node --check`):** **PASSED** (100% of source and test JS files pass without syntax errors).
- **Frontend Typecheck & Production Build (`tsc -b && vite build`):** **PASSED** (30 modules transformed, 0 TypeScript errors, bundle size: 227.44 kB).
- **Frontend Linting (`oxlint`):** **FAILED** (`Cannot find native binding @oxlint/binding-darwin-arm64`).
- **Whitespace / Git Diff Check (`git diff --check`):** **PASSED** (0 trailing whitespace or formatting warnings).
- **Dependency Security Audit (`npm audit`):** **10 Vulnerabilities Found** (8 Moderate, 2 High).

---

## 2. Test Execution Details

### A. Backend Test Suite Breakdown
Command: `npm --prefix backend test` (`node --test tests/`)

| Test Suite File | Feature Scope | Tests Count | Passed | Failed | Duration |
|---|---|---|---|---|---|
| `tests/health.test.js` | Probes, system info, OpenAPI schema | 10 | 10 | 0 | 249ms |
| `tests/database.test.js` | Migrations, advisory lock, connection | 4 | 4 | 0 | 212ms |
| `tests/identities.test.js` | Identity CRUD, pagination, cycle detection | 21 | 21 | 0 | 1436ms |
| `tests/applications.test.js`| Application CRUD, uniqueness on app_code | 21 | 21 | 0 | 360ms |
| `tests/accounts.test.js` | Account CRUD, orphan filter, identity linking | 35 | 35 | 0 | 257ms |
| `tests/entitlements.test.js`| Entitlement CRUD, transactional assignments | 34 | 34 | 0 | 1608ms |
| `tests/auth.test.js` | Firebase exchange, JWTs, refresh rotation | 30 | 30 | 0 | 1850ms |
| **Total** | | **159** | **159** | **0** | **~2.4s** |

### B. Static Syntax Checks
Command: `find backend/src backend/tests -name "*.js" -exec node --check {} +`
- **Result:** Exit code `0`. All 28 JavaScript files across `src/` and `tests/` pass V8 parsing without syntax errors or invalid imports.

### C. Frontend Typecheck & Build
Command: `npm --prefix frontend run build` (`tsc -b && vite build`)
- **Result:** Exit code `0`.
- **Output:**
  - `dist/index.html`: 0.59 kB (gzip: 0.35 kB)
  - `dist/assets/index-DlzpKfqj.css`: 4.00 kB (gzip: 1.40 kB)
  - `dist/assets/index-DIgAty-1.js`: 227.44 kB (gzip: 70.69 kB)
- **Status:** Clean production build with zero TypeScript compiler diagnostics.

### D. Frontend Linter Check
Command: `npm --prefix frontend run lint` (`oxlint`)
- **Result:** Exit code `1`.
- **Failure Cause:** Missing optional binary package `@oxlint/binding-darwin-arm64` in `frontend/node_modules`.
- **Finding ID:** `DEF-LINT-01`
- **Impact:** Local static code analysis on frontend cannot run via `npm run lint`. Does not block runtime compilation or production build.

### E. Dependency Security Vulnerabilities (`npm audit`)
Command: `npm audit --prefix backend`
- **Result:** 10 vulnerabilities detected (8 Moderate, 2 High).

| Package | Severity | Advisory / CVE | Vulnerability Description | Dependency Chain |
|---|---|---|---|---|
| `body-parser` | **HIGH** | GHSA-27r3-jxmh-p828 | Denial of Service via trailing bytes after compressed request body | `express` -> `body-parser` (<1.20.9) |
| `zod` | **HIGH** | GHSA-mrhx-c7xc-m3w5 | Memory exhaustion while validating oversized constrained collections | Direct dependency `zod@^3.24.2` (<4.6.6) |
| `uuid` | **MODERATE**| GHSA-w5hq-g745-h8pq | Missing buffer bounds check in v3/v5/v6 when buffer is provided | `firebase-admin` -> `gaxios` / `google-gax` -> `uuid` (<11.1.1) |

---

## 3. Baseline Verdict

The core backend and database integration test baseline is solid with **159/159 tests passing**. However, two concrete quality issues were surfaced:
1. `oxlint` package binding issue in frontend.
2. High-severity dependencies in `body-parser` (DoS vector) and `zod` (memory exhaustion vector) that require security evaluation in Phase 8.

