# Database Architecture & Connection Guide (`database.md`)

This document provides a comprehensive guide to the PostgreSQL database architecture, connection pool lifecycle, versioned migrations, and relational schema in IdentityLens (IVIP Mini).

Conforms strictly to:
- [docs/data-model.md](file:///Users/shreyashgautam/Desktop/IVIP/docs/data-model.md)
- [docs/architecture.md](file:///Users/shreyashgautam/Desktop/IVIP/docs/architecture.md)
- [security/secure-development.md](file:///Users/shreyashgautam/Desktop/IVIP/security/secure-development.md)

---

## 1. Architectural Overview

IdentityLens utilizes **PostgreSQL** as its persistent relational source of truth. All data access follows strict directional dependency:

$$\text{Routes} \longrightarrow \text{Controllers} \longrightarrow \text{Services} \longrightarrow \text{Repositories} \longrightarrow \text{Connection Pool} \longrightarrow \text{PostgreSQL}$$

```
React + Vite Frontend (Port 5173)
        │
        │ HTTP / JSON
        ▼
Express Backend API (Port 5001)
        │
        ▼
Services (Business logic, risk scoring, reconciliation)
        │
        ▼
Repositories (Parameterized SQL queries $1, $2)
        │
        ▼
backend/src/database/connection.js (pg.Pool singleton)
        │
        ▼
PostgreSQL Database ('identitylens' on port 5432)
```

---

## 2. PostgreSQL Connection Pool (`connection.js`)

Located at [backend/src/database/connection.js](file:///Users/shreyashgautam/Desktop/IVIP/backend/src/database/connection.js).

### 2.1 Configuration Parameters
The connection pool reads from validated environment variables in [backend/src/config/env.js](file:///Users/shreyashgautam/Desktop/IVIP/backend/src/config/env.js):

| Variable | Default Value | Description |
|---|---|---|
| `DATABASE_URL` | *(optional)* | Full connection URI (e.g. `postgres://user:pass@localhost:5432/identitylens`) |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `identitylens` | Application database name |
| `DB_USER` | Current OS User | Application role |
| `DB_PASSWORD` | `""` | Database password |
| `DB_SSL` | `false` | SSL mode (enabled in production) |
| `DB_POOL_MAX` | `10` | Maximum concurrent connections in pool |
| `DB_IDLE_TIMEOUT_MS` | `30000` (30s) | Inactive connection eviction timeout |
| `DB_CONNECTION_TIMEOUT_MS` | `2000` (2s) | Connection acquisition timeout |

### 2.2 Key Module Exports
- **`query(text, params)`**: Executes parameterized SQL queries with performance monitoring (logs warnings for queries exceeding 1000ms).
- **`getClient()`**: Checks out a dedicated client from the pool for multi-statement transactions (`BEGIN ... COMMIT / ROLLBACK`).
- **`checkDatabaseHealth()`**: Lightweight ping (`SELECT 1 AS alive`) used by `/health/ready` to verify connectivity without leaking database credentials.
- **`closePool()`**: Closes all active clients gracefully during server shutdown and automated test teardown.

---

## 3. Versioned Migration Engine (`migrator.js`)

Located at [backend/src/database/migrator.js](file:///Users/shreyashgautam/Desktop/IVIP/backend/src/database/migrator.js).

### 3.1 Migration Principles
1. **Deterministic Execution**: Files in [backend/src/database/migrations/](file:///Users/shreyashgautam/Desktop/IVIP/backend/src/database/migrations/) are applied in strict alphabetical order (e.g. `001_initial_schema.sql`).
2. **Distributed Advisory Locking**: Acquires a transactional 64-bit PostgreSQL advisory lock (`pg_advisory_lock(894382741)`) to prevent race conditions when multiple server instances boot simultaneously.
3. **Tracking Table**: Automatically maintains the `schema_migrations` table:
   ```sql
   CREATE TABLE schema_migrations (
     id SERIAL PRIMARY KEY,
     version VARCHAR(255) UNIQUE NOT NULL,
     name VARCHAR(255) NOT NULL,
     applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   ```
4. **Idempotency**: Previously applied migrations are skipped; re-running `npm run db:migrate` is always safe.
5. **Atomic Transactions**: Each migration runs inside `BEGIN ... COMMIT`. If any statement fails, the entire migration rolls back cleanly.

### 3.2 Migration Commands
```bash
# Run migrations from root workspace
npm run db:migrate

# Or run directly inside backend/
npm --prefix backend run db:migrate
```

---

## 4. Core Relational Schema (`001_initial_schema.sql`)

Defined in [backend/src/database/migrations/001_initial_schema.sql](file:///Users/shreyashgautam/Desktop/IVIP/backend/src/database/migrations/001_initial_schema.sql).

### 4.1 Schema Relationship Diagram (Mermaid)

```mermaid
erDiagram
    identities ||--o{ accounts : "owns / linked to"
    identities ||--o{ identities : "manages / owns"
    identities ||--o{ risk_findings : "subject of"
    applications ||--o{ accounts : "hosts"
    applications ||--o{ entitlements : "defines"
    accounts ||--o{ account_entitlements : "assigned"
    entitlements ||--o{ account_entitlements : "granted via"
    accounts ||--o{ risk_findings : "subject of"

    identities {
        uuid id PK
        string display_name
        string identity_type "human | service_account | bot | ai_agent"
        string email
        string status "active | inactive | suspended"
        uuid owner_id FK
        string department
        timestamp created_at
    }

    applications {
        uuid id PK
        string name
        string key UK
        string status "active | inactive | deprecated"
        string auth_type
        timestamp created_at
    }

    accounts {
        uuid id PK
        uuid application_id FK
        uuid identity_id FK
        string external_id
        string account_name
        string status "active | disabled | suspended"
        timestamp last_login_at
    }

    entitlements {
        uuid id PK
        uuid application_id FK
        string name
        string type "role | group | permission"
        boolean is_privileged
    }

    account_entitlements {
        uuid account_id PK,FK
        uuid entitlement_id PK,FK
        timestamp assigned_at
    }

    risk_findings {
        uuid id PK
        uuid identity_id FK
        uuid account_id FK
        string rule_code
        string severity "critical | high | medium | low"
        string status "open | acknowledged | resolved"
        jsonb evidence
    }
```

### 4.2 Enforced Database Constraints

| Table | Constraint Name | Type | Description |
|---|---|---|---|
| `identities` | `chk_identities_not_self_owner` | CHECK | Prevents self-ownership cycles (`owner_id <> id`). |
| `identities` | `identities_identity_type_check` | CHECK | Restricts values to `human`, `service_account`, `bot`, `ai_agent`. |
| `applications` | `applications_key_key` | UNIQUE | Enforces unique canonical application keys (e.g. `aws_prod`). |
| `accounts` | `uq_accounts_app_external_id` | UNIQUE | Prevents duplicate accounts within the same target application `(application_id, external_id)`. |
| `accounts` | `accounts_application_id_fkey` | FOREIGN KEY | Enforces valid application reference with `ON DELETE CASCADE`. |
| `accounts` | `accounts_identity_id_fkey` | FOREIGN KEY | Links account to identity with `ON DELETE SET NULL`. |
| `entitlements` | `uq_entitlements_app_name` | UNIQUE | Prevents duplicate entitlement names within an application `(application_id, name)`. |
| `account_entitlements` | Composite PK | PRIMARY KEY | Ensures idempotent entitlement assignment `(account_id, entitlement_id)`. |
| `risk_findings` | `chk_risk_findings_entity_ref` | CHECK | Guarantees finding links to at least one entity (`identity_id IS NOT NULL OR account_id IS NOT NULL`). |

---

## 5. Live Readiness Integration (`/health/ready`)

With Milestone 3 complete, `GET /health/ready` dynamically queries PostgreSQL:
- **Database Connected**: Returns `HTTP 200 OK` with latency and connection status.
  ```json
  {
    "status": "ok",
    "ready": true,
    "timestamp": "2026-10-18T09:50:54.268Z",
    "checks": {
      "http": "ready",
      "database": "connected"
    },
    "database_latency_ms": 12
  }
  ```
- **Database Disconnected**: Returns `HTTP 503 Service Unavailable` with safe diagnostic status:
  ```json
  {
    "status": "error",
    "ready": false,
    "timestamp": "2026-10-18T09:50:54.268Z",
    "checks": {
      "http": "ready",
      "database": "disconnected"
    },
    "error": "Database connection failed or timed out"
  }
  ```

---

## 6. Automated Testing Suite

Database integration tests in [backend/tests/database.test.js](file:///Users/shreyashgautam/Desktop/IVIP/backend/tests/database.test.js) run without external dependencies and cover:
1. Reusable connection pool query execution.
2. Lightweight connectivity check.
3. Existence of all 6 core tables and `schema_migrations`.
4. Constraint enforcement (self-ownership, unique keys, composite account uniqueness, entity reference).
5. Foreign key rejection for missing parents.
6. Graceful pool cleanup.

Run all tests via:
```bash
npm test
```

---

## 7. Synthetic Development Seed Dataset (Northstar Labs)

A realistic, idempotent seed dataset for fictional company **Northstar Labs** is provided in [backend/src/database/seed.js](file:///Users/shreyashgautam/Desktop/IVIP/backend/src/database/seed.js).

### 7.1 Dataset Scope & Distribution
- **8 Canonical Identities**: 6 humans (Dr. Alice Morgan, Ben Carter, Nina Patel, David Kim, Elena Rostova, Marcus Vance), 1 CI/CD service account, and 1 SecOps scanner bot.
- **5 Applications**: AWS Cloud Infrastructure, GitHub Enterprise, Google Workspace, Slack Enterprise, and Jira Software.
- **14 Application Accounts**: Linking users to multiple target applications with varied lifecycle statuses (`active`, `disabled`, `suspended`). Includes one simulated orphaned AWS account (`identity_id: null`).
- **10 Entitlements**: Roles, groups, and permissions partitioned strictly by target application (e.g. `AdministratorAccess`, `OrganizationOwner`, `SuperAdmin`).
- **18 Account-Entitlement Assignments**: Every single assignment connects an account to an entitlement belonging to the **exact same application** (zero cross-application boundary leaks).
- **6 Synthetic Risk Findings**: Explicitly labeled `[Synthetic]` detection records covering orphaned accounts, inactive employees with active admin accounts, bot privilege excess, and stale credentials.

### 7.2 Running the Seed Script
```bash
# Run seed from root workspace
npm run db:seed

# Or directly in backend/
npm --prefix backend run db:seed
```

### 7.3 Idempotency & Safety Guards
- Uses fixed deterministic UUIDs (`a000...`, `b000...`, `c000...`, `d000...`, `e000...`) with `ON CONFLICT (id) DO UPDATE / DO NOTHING`.
- Re-running `npm run db:seed` is safe and idempotent (never creates duplicate records).
- Rejects execution if `NODE_ENV === 'production'` or target database is not a recognized development/test database.
