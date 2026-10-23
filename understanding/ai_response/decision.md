# IVIP Mini — Architectural Decisions Record (decision.md)

## 1. Overview & Purpose

This document logs all key architectural, technical, library, and design decisions taken for **IVIP Mini — Identity Discovery & Risk Explorer**. For each decision, we document:
- **Decision Taken**: The selected approach or technology.
- **Why It Is Needed**: The functional, security, or maintainability rationale.
- **Alternatives Considered**: Other candidate approaches and why they were rejected.
- **Accepted Trade-Offs**: Known limitations, costs, or complexity accepted as part of the choice.

---

## 2. Architecture Decisions Summary Table

| Category | Decision / Selected Tech | Key Alternatives Considered | Primary Rationale | Accepted Trade-Off |
|---|---|---|---|---|
| **System Architecture** | Modular Monolith | Microservices, Serverless / Lambdas | Simplicity, single deployable unit, local debugging, ACID transactions across modules | Scaled horizontally as a single unit rather than per-service |
| **Backend Runtime** | Node.js + Express (ES Modules) | Fastify, NestJS, Go, Python (FastAPI) | Ubiquitous ecosystem, minimal abstraction overhead, accessible for learning | Express lacks built-in DI or async route error propagation without modern wrappers |
| **Database** | PostgreSQL | MySQL, MongoDB, DynamoDB, Neo4j | Relational integrity, ACID compliance, native JSONB support for evidence/provenance, robust constraints | Graph traversals require relational joins rather than native graph queries |
| **Data Access Layer** | Raw `pg` client + Versioned SQL Migrations | Prisma, TypeORM, Drizzle, Sequelize | Full query transparency, parameterized security, zero ORM abstraction leakage, explicit indexes & constraints | Manual SQL writing, mapping relational rows to JavaScript domain objects |
| **Request Validation** | Zod | Joi, Yup, express-validator | TypeScript type inference, declarative schemas, reusable across validation layers | Additional runtime library dependency |
| **Frontend Framework** | React (v18+) + TypeScript + Vite | Next.js, Remix, Vue, Svelte | SPA architecture matches decoupled REST backend; fast Vite HMR; strict typing for API contracts | Client-side bundle size, requires client-side routing & API state management |
| **UI & Styling** | Vanilla CSS + CSS Custom Properties (Design Tokens) | Tailwind CSS, Material UI (MUI), Styled Components | Complete design system control, lightweight, zero build tool lock-in, pristine enterprise aesthetic | Writing CSS rules manually rather than using pre-built utility classes |
| **Authentication Strategy** | Token/Session with Secure HttpOnly Cookies & JWT options | Third-party Auth0/Clerk, Basic Auth | Full local independence, no paid SaaS dependencies, strict control over token lifetime and revocation | Implementing secure hashing (Argon2id/bcrypt), refresh rotation, and CSRF protection |
| **Identity Resolution** | Deterministic Multi-Field Rule Matching | Fuzzy probabilistic matching, AI/ML entity resolution | Explainability, zero false-positive merges, auditable evidence trail | Ambiguous matches remain unmerged until manual or explicit resolution |
| **Risk Detection Engine** | Deterministic Code Rules | ML anomaly detection, LLM prompt-based evaluation | Predictability, testability, explainable evidence, zero latency/token costs | Rules must be manually authored and maintained |
| **AI Integration Role** | Read-only Explanation & Evidence Summarization | Autonomous Remediation Agent, Text-to-SQL | Defense-in-depth, zero risk of hallucinated actions or SQL injection via prompt injection | AI cannot take autonomous action or alter permission states |

---

## 3. Deep-Dive Decisions

### Decision 1: Modular Monolith vs. Microservices

- **Decision**: Architect the backend as a single Express application structured into domain feature modules (`identities`, `applications`, `accounts`, `entitlements`, `risk`, `auth`, `ingestion`, `ai`).
- **Why It Is Needed**:
  - IVIP Mini is an identity and risk explorer designed for clear understanding and local development.
  - Avoids distributed system failure modes (network partitions, distributed transactions, distributed tracing complexity).
  - Guarantees immediate database consistency during ingestion and entitlement linking.
- **Alternatives Considered**:
  - *Microservices*: Rejected due to operational complexity, container orchestration overhead (Kubernetes), and cross-service transaction synchronization.
  - *Serverless Functions*: Rejected due to cold starts, local PostgreSQL connection pool exhaustion, and fragmented domain logic.
- **Accepted Trade-Off**: All modules share the same process memory and database connection pool. Scaling requires scaling the entire application rather than individual bottlenecks.

---

### Decision 2: PostgreSQL with Raw `pg` and Versioned Migrations vs. ORM

- **Decision**: Use the native `pg` client with explicit SQL queries inside repository classes, managed by ordered, versioned SQL migration files (`backend/src/database/migrations/`).
- **Why It Is Needed**:
  - Full transparency over generated SQL queries, locking behavior, and indexing.
  - Guarantees strict parameterized query usage (`$1, $2, ...`) to eliminate SQL injection.
  - Clean separation between database schema (PostgreSQL DDL) and JavaScript domain models.
  - Prevents the N+1 query problem and hidden join performance traps common in ORMs.
- **Alternatives Considered**:
  - *Prisma*: Highly ergonomic, but adds an engine binary, schema DSL abstraction, and can complicate complex multi-table joins or custom composite unique constraints.
  - *TypeORM / Sequelize*: Heavy active-record/data-mapper abstractions with historically complex migration tracking and leaky abstractions.
  - *Graph Database (Neo4j)*: Natural fit for identity graphs, but introduces heavy non-relational infrastructure, unfamiliar query languages (Cypher), and lacks native relational transaction guarantees needed for core user records.
- **Accepted Trade-Off**: Developers write and maintain raw SQL queries and repository mapping functions manually.

---

### Decision 3: Zod for Backend & Frontend Validation

- **Decision**: Use `Zod` as the sole schema definition and validation library.
- **Why It Is Needed**:
  - Validates request bodies, query strings, URL parameters, and imported synthetic JSON.
  - Automatically infers TypeScript types for the frontend client and backend models.
  - Provides detailed, structured validation errors (`details: [{ field, message }]`) compliant with `docs/api-contract.md`.
- **Alternatives Considered**:
  - *Joi*: Robust for Express, but lacks native TypeScript type inference.
  - *Yup*: Widely used, but TypeScript inference is clunkier than Zod and schema composability is less strict.
- **Accepted Trade-Off**: Adds a runtime validation dependency, but minimizes runtime bugs and eliminates invalid data entering the service layer.

---

### Decision 4: React + TypeScript + Vite for Frontend

- **Decision**: Build a Single Page Application (SPA) using React 18+, TypeScript, and Vite.
- **Why It Is Needed**:
  - Decouples the frontend presentation layer completely from the Express backend API.
  - Vite provides sub-second HMR and instant local development starts without webpack overhead.
  - TypeScript enforces strict data models corresponding to API contracts.
- **Alternatives Considered**:
  - *Next.js (App Router / SSR)*: Introduces full-stack framework overlap with Express, complex SSR caching, server actions, and deployment constraints.
  - *Vanilla JS*: Lacks component reusability, state management, and type safety for complex multi-view tabular data.
- **Accepted Trade-Off**: Client-side rendering requires handling initial loading states and client-side route protection.

---

### Decision 5: CSS Design Tokens & Semantic System vs. TailwindCSS

- **Decision**: Implement a curated CSS design token system with CSS Custom Properties (`--bg-primary`, `--surface`, `--text-primary`, `--color-risk-high`, etc.) and reusable components.
- **Why It Is Needed**:
  - Full control over light/dark theme switching via a single data-theme attribute on `<html>`.
  - Avoids class clutter and maintains strict enterprise-grade visual hierarchy specified in `design/design-system.md`.
  - Adheres to workspace guidelines prohibiting utility-class bloat unless specifically requested.
- **Alternatives Considered**:
  - *TailwindCSS*: Rapid prototyping, but clutters JSX templates and requires strict configuration to enforce enterprise-grade theme tokens.
  - *MUI / Ant Design*: Heavy external dependencies with pre-baked aesthetics that look generic and are difficult to deeply customize for high-density identity tables.
- **Accepted Trade-Off**: Requires writing and maintaining dedicated component stylesheets.

---

### Decision 6: Conservative Deterministic Identity Resolution

- **Decision**: Identity reconciliation links source accounts to canonical identities using strictly documented deterministic rules (e.g., exact normalized corporate email match, verified employee ID). Accounts with partial or ambiguous matches (e.g., matching display name only) remain in an unmerged `unresolved` state.
- **Why It Is Needed**:
  - In security and identity governance, false-positive merging (attributing one person's account or privileges to another) is a critical security flaw.
  - Unresolved accounts must be surfaced to security analysts for review rather than guessed.
- **Alternatives Considered**:
  - *Fuzzy String Matching / Levenshtein Distance*: Auto-linking accounts based on name similarity causes catastrophic false merges across common names.
  - *AI / LLM-Based Merging*: Non-deterministic, unexplainable, and vulnerable to prompt injection or hallucination.
- **Accepted Trade-Off**: Certain accounts require manual intervention or explicit secondary import rules to achieve canonical linkage.

---

### Decision 7: Deterministic Risk Engine with Explainable Evidence

- **Decision**: Implement all risk detection rules (`orphan_account`, `inactive_user_active_account`, `excessive_privilege`, `stale_account`) as deterministic pure functions that inspect application state and emit structured evidence JSON.
- **Why It Is Needed**:
  - Security audits require mathematical explainability: "Rule R-101 fired because Account A has `status=active` but linked Identity I has `status=inactive`".
  - Repeated evaluations must be idempotent: they update existing open findings rather than spamming duplicate findings.
- **Alternatives Considered**:
  - *Machine Learning / Anomaly Detection*: High rate of false positives, opaque reasoning, requires vast amounts of training data not available in synthetic environments.
  - *LLM Evaluator*: Highly non-deterministic, cost-prohibitive per inventory scan, prone to hallucinated severity scores.
- **Accepted Trade-Off**: Only pre-programmed conditions are detected; novel emergent risks require adding new rule definitions.

---

### Decision 8: AI Layer Confined to Read-Only Explanations (Out-of-Band)

- **Decision**: The AI module (`backend/src/modules/ai/`) operates solely on retrieved, pre-authorized finding evidence, producing natural-language explanations with strict schema validation. It possesses zero write permissions to the database and zero tool-calling capabilities.
- **Why It Is Needed**:
  - Protects against Prompt Injection and unauthorized privilege modification.
  - Respects least-privilege: even if an attacker injects malicious text into a synthetic account's username or metadata, the AI cannot execute SQL or change roles.
- **Alternatives Considered**:
  - *Agentic Remediation (AI auto-revokes accounts)*: High risk of denial of service or unauthorized revocation based on model error.
  - *Text-to-SQL (AI generates queries to answer user questions)*: Susceptible to SQL injection, bypassing ACL/RBAC, and data exfiltration.
- **Accepted Trade-Off**: AI does not automatically fix security vulnerabilities; human approval is required for all remedial actions.

---

### Decision 9: Backend Port Selection (Port 5001 vs. Default Port 5000)

- **Decision**: Configure default backend listening port to `5001` with fallback via `PORT` environment variable.
- **Why It Is Needed**:
  - On macOS Monterey and later, Apple's AirPlay Receiver / ControlCenter service binds to port `5000` (`commplex-main`), causing `listen EADDRINUSE: address already in use :::5000` crashes on startup.
- **Alternatives Considered**:
  - *Disabling AirPlay Receiver in macOS System Settings*: Disrupts user system configuration outside the workspace boundary.
  - *Using high arbitrary port (e.g. 8080 or 3001)*: Port 5001 is the standard convention when 5000 is reserved.
- **Accepted Trade-Off**: Frontend API calls and CORS origins must explicitly reference `http://localhost:5001`.

---

### Decision 10: Vite 6 LTS over Experimental Vite 8 for Frontend

- **Decision**: Pin Vite to `vite@^6.2.0` and `@vitejs/plugin-react@^4.3.4`.
- **Why It Is Needed**:
  - The local development environment uses Node `v20.17.0`.
  - Bleeding-edge `create-vite` scaffolds experimental Vite 8 using `rolldown`, which demands Node `>=20.19.0` and triggers optional native binding missing errors (`@rolldown/binding-darwin-arm64`).
  - Vite 6 LTS provides stable, battle-tested HMR and fast 500ms production builds across all Node 20 LTS releases.
- **Alternatives Considered**:
  - *Upgrading Node globally*: Requires administrative privileges and may break other local tools.
  - *Webpack*: Far slower local development cycles and excessive configuration overhead.
- **Accepted Trade-Off**: Does not yet use the experimental Rolldown rust-bundler; uses standard Rollup under the hood.

---

### Decision 11: Decoupled `server.js` and `app.js`

- **Decision**: Separate Express configuration (`src/app.js`) from HTTP server binding and lifecycle management (`src/server.js`).
- **Why It Is Needed**:
  - Enables fast, port-free unit and integration testing via `supertest` or native fetch against `app` without binding network ports.
  - Isolates process signal handling (`SIGTERM`, `SIGINT` graceful shutdown) into `server.js`.
- **Alternatives Considered**:
  - *Single `server.js` file*: Couples Express middleware and route mounting to active port binding.
- **Accepted Trade-Off**: Requires two files instead of one at the backend root.

---

### Decision 12: Health Check Route (`GET /health`)

- **Decision**: Expose `GET /health` at root level (outside `/api/v1` prefix), returning `{ status: "ok", timestamp, service, version }`.
- **Why It Is Needed**:
  - Complies strictly with `docs/api-contract.md` section 14.8 and `docs/architecture.md`.
  - Enables load balancers, container orchestrators, and the frontend to verify liveness without authentication overhead.
- **Alternatives Considered**:
  - *Versioned health endpoint (`/api/v1/health`)*: Rejected because infrastructure health probes generally check unversioned service availability.
- **Accepted Trade-Off**: Unauthenticated public endpoint; returns only minimal service metadata without sensitive database credentials.

---

### Decision 13: Root Workspace Script Delegation via `npm --prefix`

- **Decision**: Orchestrate backend and frontend commands from the root repository using a lightweight root `package.json` with `npm --prefix backend` and `npm --prefix frontend` delegations.
- **Why It Is Needed**:
  - Provides standard unified commands (`npm run dev:backend`, `npm run dev:frontend`, `npm test`) for developers and coding agents without navigating into subfolders.
  - Avoids introducing heavy monorepo build tools (Turborepo, Nx, Lerna) that add unnecessary configuration files, caching daemons, and dependency complexities.
- **Alternatives Considered**:
  - *Turborepo / Nx*: Overkill for a two-service modular monolith; adds cache lockfile management overhead.
  - *No root package.json*: Requires developers and agents to constantly `cd backend && npm ...` which increases friction and error rates.
- **Accepted Trade-Off**: Root package does not hoist shared dependencies; backend and frontend maintain their own independent `node_modules` and `package-lock.json` files.

---

### Decision 14: Backend Modular Layer Segmentation

- **Decision**: Strictly segment the backend into dedicated directories (`src/middlewares/`, `src/helpers/`, `src/routes/`, and `src/modules/<feature>/`) instead of inlining logic into `app.js`.
- **Why It Is Needed**:
  - Implements the exact specifications in `docs/api-contract.md` Section 15 and `docs/architecture.md` Section 7.
  - Ensures clean separation of concerns:
    - `src/helpers/response.helper.js` guarantees that every endpoint adheres to the standard response envelope (`{ data, pagination, meta }`) and error envelope (`{ error: { code, message, details, request_id } }`).
    - `src/middlewares/` encapsulates cross-cutting concerns (Request-ID, CORS, Zod validation, 404, centralized error handling).
    - `src/routes/index.js` acts as the central router, mounting public liveness (`/health`) and versioned resources (`/api/v1`).
    - `src/modules/health/` establishes the standard feature module pattern: `<feature>.routes.js` $\rightarrow$ `<feature>.controller.js` $\rightarrow$ `<feature>.service.js`.
- **Alternatives Considered**:
  - *Inlining middlewares & handlers in `app.js`*: Faster for initial prototyping, but leads to monolithic file bloat, poor testability, and violates modular monolith principles.
- **Accepted Trade-Off**: More files created upfront, but provides crystal-clear boundaries and zero tech debt as subsequent feature modules are introduced.

---

### Decision 15: Kebab-Case Middleware Conventions, Defense-in-Depth Security Headers, and Health Probe Architecture

- **Decision**:
  1. Standardize middleware filenames to kebab-case matching standard industry conventions and user repository schema (`src/middlewares/error-handler.js`, `not-found.js`, `request-id.js`, `cors.js`, `validate.js`, `security-headers.js`).
  2. Implement native defense-in-depth security headers middleware setting `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 0`, and `Referrer-Policy: strict-origin-when-cross-origin` (with HSTS conditional on production).
  3. Decompose health endpoints into three explicit probes conforming to `docs/api-contract.md` Section 14.8 and M2 requirements:
     - `GET /health`: General system metadata, timestamp, version, and process uptime.
     - `GET /health/live`: Liveness probe indicating process vitality (`{ checks: { process: 'up' } }`).
     - `GET /health/ready`: Readiness probe indicating HTTP listener readiness, explicitly decoupled from M3 PostgreSQL connectivity (`{ ready: true, checks: { http: 'ready', database: 'pending_m3' } }`).
  4. Migrate test directory from `backend/test/` to `backend/tests/` matching standard test convention, and execute via native `node --test tests/`.
- **Why It Is Needed**:
  - Adheres strictly to the user's required directory schema and file naming requirements.
  - Guarantees container orchestration platforms (Kubernetes, Docker Swarm, ECS) can monitor process liveness and readiness independently without false-positive readiness reporting.
  - Enforces baseline security headers on every response before adding business endpoints.
- **Alternatives Considered**:
  - *Single `/health` endpoint*: Fails to distinguish container liveness from application readiness.
  - *Mocking database connection in M2*: Violates rule against premature database layer introduction before Milestone 3.
- **Accepted Trade-Off**: Readiness probe explicitly reports database status as `pending_m3` until PostgreSQL connection pool and migrations are completed in M3.

---

### Decision 16: OpenAPI 3.0 Documentation via Native Swagger UI (`/docs`) and Domain Route Documentation (`backend/understand/`)

- **Decision**:
  1. Add `swagger-ui-express` to serve interactive OpenAPI 3.0 documentation directly from the backend at `GET /docs` and the raw specification at `GET /docs/openapi.json`.
  2. Create a dedicated documentation suite in `backend/understand/` with individual markdown guides for each functional group:
     - `basic-routes.md`: Operational gateways, health probes (`/health`, `/health/live`, `/health/ready`), Swagger routes, and error handling.
     - `identity-routes.md`: Canonical identity inventory (`GET/POST /api/v1/identities`, `GET/PATCH /api/v1/identities/:id`).
     - `application-routes.md`: Target applications (`GET/POST /api/v1/applications`, `GET/PATCH /api/v1/applications/:id`).
     - `account-routes.md`: Application accounts and entitlement assignments (`GET/POST /api/v1/accounts`, `GET/POST/DELETE /accounts/:id/entitlements`).
     - `entitlement-routes.md`: Defined permissions and roles (`GET/POST /api/v1/entitlements`, `GET/PATCH /api/v1/entitlements/:id`).
     - `risk-routes.md`: Deterministic risk findings and background evaluation tasks (`GET/PATCH /api/v1/risk-findings`, `POST /risk-evaluations`, `GET /tasks/:id`).
- **Why It Is Needed**:
  - Provides instant, interactive browser exploration and automated contract verification via Swagger UI without requiring external tools.
  - Gives developers and AI coding agents explicit, copy-pasteable `curl` commands, request payloads, and response envelopes for every single backend route.
- **Alternatives Considered**:
  - *Postman Collection only*: Requires external desktop software and drifts easily from source code.
  - *External CDN Swagger*: Fails in offline development environments; `swagger-ui-express` bundles assets locally.
- **Accepted Trade-Off**: Added lightweight `swagger-ui-express` dependency to serve offline assets cleanly.

---

### Decision 17: PostgreSQL Singleton Connection Pool, Advisory Locked Migration Runner, and Core Relational Schema

- **Decision**:
  1. Implement a centralized `pg.Pool` singleton in `backend/src/database/connection.js` configured via Zod environment validation (`backend/src/config/env.js`) with bounded pool size (`DB_POOL_MAX: 10`), idle timeout (30s), and connection timeout (2s).
  2. Implement an idempotent, transaction-safe migration runner in `backend/src/database/migrator.js` that tracks applied files in `schema_migrations` and protects against concurrent runner execution using PostgreSQL advisory locks (`pg_advisory_lock(894382741)`).
  3. Create initial schema migration `001_initial_schema.sql` defining all six core domain entities (`identities`, `applications`, `accounts`, `entitlements`, `account_entitlements`, `risk_findings`) matching `docs/data-model.md` with strict foreign keys, unique constraints, and check constraints (e.g. self-ownership prevention, entity reference validation).
  4. Dynamically connect `/health/ready` to `checkDatabaseHealth()`, reporting real connectivity (`database: 'connected'`) and query latency while safely withholding credentials.
  5. Strictly preserve `.env` without modifying it; document all database parameters with placeholders exclusively in `.env.example`.
- **Why It Is Needed**:
  - Establishes PostgreSQL as the durable, transactional source of truth for all subsequent milestones (M4–M12).
  - Guarantees zero schema drift between developers, environments, and automated CI pipelines.
  - Advisory locks prevent split-brain schema corruptions during multi-container deployments.
- **Alternatives Considered**:
  - *Prisma / TypeORM*: Rejected as per `docs/architecture.md` Section 2.1 to avoid ORM abstraction leaks, heavy generated client packages, and un-optimized queries. Native `pg` gives total control over parameterized SQL.
  - *Flyway / Liquibase / Umzug*: Adds Java dependencies or external CLI requirements; a custom ~80-line native Node.js runner handles SQL files natively with zero third-party migration dependencies.
- **Accepted Trade-Off**: Requires writing clean, pure SQL migrations by hand, which guarantees transparency, predictable indexing, and direct alignment with PostgreSQL relational standards.

---

### Decision 18: Deterministic Development Seed Engine (Northstar Labs) and Idempotent Upsert Strategy

- **Decision**:
  1. Create a dedicated development seed script in `backend/src/database/seed.js` executable via `npm run db:seed` that generates a complete, connected synthetic dataset for fictional organization **Northstar Labs** (8 identities, 5 applications, 14 accounts, 10 entitlements, 18 assignments, 6 risk findings).
  2. Implement strict environment safety guardrails rejecting execution if `NODE_ENV === 'production'` or if the target database name is not recognized as a development or test database.
  3. Assign fixed deterministic UUID constants (`a000...`, `b000...`, `c000...`, `d000...`, `e000...`) combined with `ON CONFLICT (id) DO UPDATE / DO NOTHING`.
  4. Enforce strict application boundary isolation: every account entitlement assignment only connects accounts and entitlements belonging to the exact same application.
  5. Explicitly prefix and describe all risk findings with `[Synthetic]` to clearly communicate that they represent development fixtures rather than outputs of a real discovery engine.
- **Why It Is Needed**:
  - Provides instant, realistic relational data for developers and coding agents to test and verify query relationships across identities, application accounts, entitlements, and security findings.
  - Deterministic IDs and transactional upserts guarantee 100% idempotency: running `npm run db:seed` repeatedly never creates duplicate records or disrupts existing development data.
- **Alternatives Considered**:
  - *Hardcoded SQL dump (`seed.sql`)*: Fragile to execute cross-platform and lacks programmatic safety assertions against `NODE_ENV`.
  - *Randomly generated Faker UUIDs*: Creates duplicate records on every run, destroys relational consistency, and makes manual `curl` or `psql` verification unpredictable.
- **Accepted Trade-Off**: Maintaining deterministic seed fixtures in JavaScript requires upfront schema mapping, but provides rock-solid, repeatable test data across all development environments.

---

### Decision 19: Identity API Architecture, Ownership Hierarchy Integrity, and Deletion Policy

- **Decision**:
  1. Implement canonical identity endpoints under `/api/v1/identities` strictly adhering to the 4 operations approved in `docs/api-contract.md` Section 14.1:
     - `GET /api/v1/identities`: Collection retrieval with Zod-validated pagination (`page >= 1`, `limit <= 100`), exact filters (`status`, `identity_type`, `department`), case-insensitive multi-column search (`display_name`, `email`, `title`, `department`), and allowlisted sorting with stable secondary tie-breaker (`id ASC`).
     - `GET /api/v1/identities/:identityId`: Single resource lookup returning 200 or 404 standard envelopes.
     - `POST /api/v1/identities`: Creates canonical identity with 201 Created and Zod `.strict()` schema rejecting forbidden/unknown fields.
     - `PATCH /api/v1/identities/:identityId`: Partial update requiring non-empty body (rejects `{}` with 400 Bad Request) and touching `updated_at = NOW()`.
  2. **Exclusion of Hard Deletion (`DELETE`)**: Deliberately exclude `DELETE /identities/:id` from initial scope. In accordance with `docs/data-model.md` Section 10, identities represent immutable audit anchors; hard deletion cascades risk findings (destroying security evidence) and orphans accounts (`ON DELETE SET NULL`). Deactivation is achieved via `PATCH` with `status: 'inactive'`.
  3. **Multi-Hop Ownership Cycle Detection**: Enforce ownership hierarchy integrity at the service layer using a recursive Common Table Expression (CTE) query bounded to 25 hops (`depth < 25`). If assigning candidate owner $B$ to identity $A$ finds $A$ in the ancestry chain of $B$, the update is rejected with `409 Conflict` (`RESOURCE_CONFLICT` / `OWNERSHIP_CYCLE`).
  4. **Strict Schema Strictness & Isolation**: Use Zod `.strict()` to reject arbitrary property injection and isolate test records using `@test.identitylens.local` domains, ensuring 100% preservation of Northstar Labs seed data.
- **Why It Is Needed**:
  - Establishes a hardened, reusable module pattern (`.routes.js`, `.controller.js`, `.service.js`, `.repository.js`, `.validation.js`) for subsequent inventory modules (Applications, Accounts).
  - Eliminates SQL injection via strict parameterized queries (`$1, $2`) and identifier allowlists.
  - Prevents circular management graph anomalies.
- **Alternatives Considered**:
  - *Hard Deletion with Cascase*: Rejected because deleting historical identities destroys audit trails and invalidates past risk findings.
  - *In-memory Graph Cycle Traversal*: Rejected because fetching entire identity graphs into application memory creates N+1 database roundtrips and scales poorly. PostgreSQL Recursive CTEs perform cycle detection in a single database roundtrip.
- **Accepted Trade-Off**: Hard deletion is deferred until an organizational retention, data-masking, and tombstoning policy is documented.

---

### Decision 20: Application Inventory API Architecture, Key Uniqueness, and Cascading Deletion Prevention

- **Decision**:
  1. Implement target application endpoints under `/api/v1/applications` strictly adhering to `docs/api-contract.md` Section 14.2:
     - `GET /api/v1/applications`: Collection retrieval with Zod-validated pagination (`page >= 1`, `limit <= 100`), exact filters (`status`, `auth_type`), multi-field case-insensitive search (`name`, `key`, `description`), and allowlisted sorting (`name`, `key`, `status`, `auth_type`, `created_at`, `updated_at`) with stable secondary tie-breaker (`id ASC`).
     - `GET /api/v1/applications/:applicationId`: Single application lookup by UUID returning 200 or 404 standard envelopes.
     - `POST /api/v1/applications`: Creates target application with 201 Created and Zod `.strict()` schema rejecting forbidden/unknown fields.
     - `PATCH /api/v1/applications/:applicationId`: Partial update requiring non-empty body (rejects `{}` with 400 Bad Request) and touching `updated_at = NOW()`.
  2. **Exclusion of Hard Deletion (`DELETE`)**: Deliberately exclude `DELETE /applications/:id`. In PostgreSQL schema, `accounts` and `entitlements` both reference `applications(id) ON DELETE CASCADE`. Hard deletion would catastrophically delete all child accounts, entitlements, and many-to-many entitlement assignments. Applications are retired via `PATCH` with `status: 'inactive'` or `status: 'deprecated'`.
  3. **Unique Key Normalization & Collision Handling**: Application keys must be unique strings matching `/^[a-z0-9_-]+$/`. Pre-validation checks and database unique constraints return `409 Conflict` (`code: 'RESOURCE_CONFLICT'`) if an application key collision is detected on `POST` or `PATCH`.
  4. **Test Fixture Isolation**: All automated tests in `backend/tests/applications.test.js` strictly use keys prefixed with `test_` and clean up via `DELETE FROM applications WHERE key LIKE 'test_%'`, leaving all 5 Northstar Labs seed applications intact.
- **Why It Is Needed**:
  - Establishes durable application namespaces required for M4 Part 3 (Accounts) and M5 (Entitlements).
  - Protects against accidental cascading deletion of organizational account inventories.
- **Alternatives Considered**:
  - *Hard Deletion with Unlinking*: Rejected because accounts and entitlements intrinsically belong to a specific application and cannot exist without a parent application ID (`application_id UUID NOT NULL`).
---

### Decision 21: Account APIs, Composite Uniqueness, Relationship Endpoints, and Exact-ID Isolation

- **Decision**:
  1. Implement Account endpoints under `/api/v1/accounts` adhering strictly to `docs/api-contract.md` Section 14.3:
     - `GET /api/v1/accounts`: Collection retrieval with Zod-validated pagination (`page >= 1`, `limit <= 100`), exact filters (`application_id`, `identity_id`, `status`), orphan account filtering (`is_orphan=true/false` checking `identity_id IS NULL / IS NOT NULL`), multi-column case-insensitive ILIKE search (`external_id`, `account_name`, `email`), and allowlisted sorting with stable secondary sort (`id ASC`).
     - `GET /api/v1/accounts/:accountId`: Single account lookup returning normalized flat representation.
     - `POST /api/v1/accounts`: Account creation verifying foreign keys (`application_id` and optional `identity_id`), enforcing composite uniqueness, and returning 201 Created.
     - `PATCH /api/v1/accounts/:accountId`: Partial update supporting linking/unlinking (`identity_id: null`), updating status, rejecting empty body with 400 Bad Request, and touching `updated_at = NOW()`.
  2. **Nested Relationship Endpoints**:
     - `GET /api/v1/identities/:identityId/accounts`: Enforces parent identity existence (returns 404 `IDENTITY_NOT_FOUND` if missing), then queries accounts linked to that identity.
     - `GET /api/v1/applications/:applicationId/accounts`: Enforces parent application existence (returns 404 `APPLICATION_NOT_FOUND` if missing), then queries accounts provisioned in that application.
  3. **Composite Uniqueness Enforcement (`(application_id, external_id)`)**:
     - Pre-checks collisions in service layer, and handles concurrent race conditions by catching PostgreSQL unique violation error code `23505` on `uq_accounts_app_external_id`, translating it to `409 Conflict` (`RESOURCE_CONFLICT`).
  4. **Exclusion of Hard Deletion (`DELETE`)**:
     - Deliberately exclude `DELETE /accounts/:id`. Accounts have cascading dependencies on `account_entitlements` and `risk_findings`. Deleting an account wipes out historical entitlement grants and risk findings. Offboarding is executed via `PATCH` with `status: 'disabled'` or `'suspended'`.
  5. **Exact-ID Test Cleanup Strategy**:
     - Tests in `backend/tests/accounts.test.js` track exact created UUIDs in a `Set` and clean up strictly using `DELETE FROM accounts WHERE id = ANY($1::uuid[])`. Pattern-based deletions (`LIKE`) are strictly avoided, ensuring 100% preservation of Northstar Labs seed accounts.
- **Why It Is Needed**:
  - Unifies the core inventory model: canonical identities, target applications, and provisioned target accounts.
  - Enables deterministic detection of orphaned accounts and inactive user active accounts.
  - Prevents collateral cascading deletions in child tables during automated test execution.
- **Alternatives Considered**:
  - *Embedded Nested Response Objects*: Proposing embedded `application: { ... }` and `identity: { ... }` inside account responses was rejected in favor of a normalized flat shape (Option A) to preserve contract uniformity across all M4 endpoints without breaking schema changes.
---

### Decision 22: Entitlement APIs, ACID Transactional Assignments with Row-Level Shared Locking, Error Preservation, and Independent Teardown Guarantees

- **Decision**:
  1. **Implement the Seven Approved M5 Endpoints**:
     - `GET /api/v1/entitlements`: Collection retrieval with Zod-validated pagination (`page >= 1`, `limit <= 100`), exact filters (`application_id`, `type`, `is_privileged`), multi-column case-insensitive ILIKE search (`name`, `description`), and allowlisted sorting (`name`, `type`, `created_at`, `updated_at`) with stable secondary sort (`id ASC`).
     - `GET /api/v1/entitlements/:entitlementId`: Single entitlement lookup returning 200 with metadata envelope or 404 `ENTITLEMENT_NOT_FOUND`.
     - `POST /api/v1/entitlements`: Entitlement definition creation verifying `application_id`, enforcing `(application_id, name)` uniqueness, rejecting forbidden fields with Zod `.strict()`, and returning 201 Created.
     - `PATCH /api/v1/entitlements/:entitlementId`: Partial update requiring a non-empty JSON body (rejecting `{}` with 400 Bad Request), enforcing `(application_id, name)` uniqueness on rename, and touching `updated_at = NOW()`.
     - `GET /api/v1/accounts/:accountId/entitlements`: List entitlements assigned to a target account, validating parent account existence (returning 404 `ACCOUNT_NOT_FOUND` if missing), with filtering (`type`, `is_privileged`) and pagination.
     - `POST /api/v1/accounts/:accountId/entitlements`: Assign an entitlement to an account within an ACID transaction.
     - `DELETE /api/v1/accounts/:accountId/entitlements/:entitlementId`: Remove assignment from join table `account_entitlements`, returning `204 No Content` on success and `404 ASSIGNMENT_NOT_FOUND` if the assignment relationship does not exist.
  2. **ACID Transaction Handling & Concurrency Safeguards**:
     - `POST /api/v1/accounts/:accountId/entitlements` acquires a dedicated pool client and opens an explicit transaction (`BEGIN`).
     - **Row-Level Shared Locks (`SELECT ... FOR SHARE`)**: Both the account and entitlement records are queried with `FOR SHARE` locks to ensure concurrent transactions cannot alter application ownership or delete records while the application boundary rule (`account.application_id === entitlement.application_id`) is validated.
     - **Rollback Error Preservation**: In the `catch (originalError)` block, `ROLLBACK` is executed inside a nested `try/catch` block. Any failure during rollback is logged to `stderr` and never allowed to mask or overwrite the original exception.
     - **Constraint Mapping**: PostgreSQL unique violation (`code: '23505'`) on `account_entitlements` composite primary key `(account_id, entitlement_id)` is caught and mapped to `409 Conflict` (`RESOURCE_CONFLICT`).
  3. **Strict Scope Control & Exclusions**:
     - Hard deletion of entitlement definitions (`DELETE /entitlements/:id`) is strictly excluded; entitlement definitions are permanent audit anchors for historic access trails.
     - Unapproved nested route `GET /applications/:applicationId/entitlements` is strictly excluded.
     - No schema migrations: Existing `entitlements` and `account_entitlements` tables are 100% sufficient.
  4. **Independent Test Teardown Guarantee**:
     - Integration tests in `backend/tests/entitlements.test.js` separately track created assignment keys and created entitlement UUIDs.
     - Teardown cleans up assignments and entitlement definitions in **independent `try/catch` blocks**, ensuring an error in one cleanup step does not halt the other.
     - Test server and PostgreSQL pool are always closed in `finally`. Cleanup failures are reported and fail the test run. Zero seed records from Northstar Labs are deleted or modified.
- **Why It Is Needed**:
  - Completes the core identity inventory domain (Identities $\to$ Accounts $\to$ Entitlements).
  - Guarantees strict transactional integrity against cross-tenant or cross-application privilege pollution.
  - Ensures robust automated CI execution without database corruption or test cross-contamination.
### Decision 23: Stage C — Session Security, Single-Use Refresh Rotation with Row-Level Locking, Replay Defense, and Protected Inventory APIs

- **Decision**:
  1. **Authentication Middleware (`authenticate`)**:
     - Verifies access JWT signature (`HS256`), algorithm, and expiration.
     - Enforces presence of required identity claims: `sub` (user UUID), `sid` (session UUID), and `utv` (user token version integer).
     - Queries PostgreSQL directly joining `users` and `user_sessions` to validate user active status (`is_active: true`), session existence, session revocation (`is_revoked: false`), session expiry (`expires_at > NOW()`), and user token version match (`decoded.utv === sessionRecord.token_version`).
     - Fails closed with standardized, sanitized errors (`MISSING_TOKEN`, `MALFORMED_TOKEN`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `SESSION_NOT_FOUND`, `SESSION_REVOKED`, `SESSION_EXPIRED`, `TOKEN_REVOKED`, `USER_INACTIVE`).
  2. **Email Verification Policy Middleware (`requireVerifiedEmail`)**:
     - Enforces provider-specific verification rules:
       - `password` provider accounts require authentic `email_verified: true` before granting access to inventory resources (rejecting unverified accounts with `403 EMAIL_NOT_VERIFIED`).
       - Federated OAuth providers (`google.com`, `github.com`) are admitted without secondary verification in accordance with approved policy.
  3. **Strict Route Protection**:
     - Mounts `authenticate` and `requireVerifiedEmail` directly on all core inventory routes (`/api/v1/identities`, `/api/v1/applications`, `/api/v1/accounts`, `/api/v1/entitlements`).
     - Public endpoints (`/health`, `/health/live`, `/health/ready`, `/docs`, `/api/v1`) remain open for operational probes.
  4. **Single-Use Refresh Token Rotation (`POST /api/v1/auth/refresh`)**:
     - Refresh tokens are transmitted exclusively via secure `HttpOnly; SameSite=Lax; Path=/api/v1/auth` cookies.
     - Tokens are formatted as `${sessionId}.${secret}` allowing $O(1)$ row-level locking (`SELECT ... FROM user_sessions WHERE id = $1 FOR UPDATE`) within an ACID transaction.
     - Incoming tokens are hashed with SHA-256 before database comparison.
     - Zero grace period: Old token hash is transactionally recorded in `consumed_refresh_tokens`, and `user_sessions.current_refresh_token_hash` is atomically replaced with the new hash.
     - **Replay Detection & Family Revocation**: Replaying an already-consumed token immediately triggers revocation of the entire affected session (`is_revoked = TRUE`), creates an audit log entry (`REFRESH_TOKEN_REPLAY_ATTACK`), clears the cookie, and returns `401 SESSION_REVOKED_REPLAY`.
     - Concurrent refresh requests on the same session serialize safely via row-level locks; one request succeeds, and the other is caught by replay defense.
  5. **Session Revocation & Logout Endpoints**:
     - `POST /api/v1/auth/logout`: Revokes the active session in `user_sessions`, logs audit (`USER_LOGOUT`), and clears the refresh cookie with `Max-Age=0`. Other sessions for the user remain active.
     - `POST /api/v1/auth/revoke-all`: Atomically acquires an exclusive row lock on the user record (`SELECT ... FROM users WHERE id = $1 FOR UPDATE`), revokes all active sessions for that user (`UPDATE user_sessions SET is_revoked = TRUE`), increments `users.token_version = token_version + 1`, logs audit (`USER_SESSIONS_REVOKED_ALL`), and clears the refresh cookie. All prior access tokens are immediately invalidated (`401 TOKEN_REVOKED` / `SESSION_REVOKED`).
  6. **CSRF & Origin Verification**:
     - `POST /api/v1/auth/refresh`, `logout`, and `revoke-all` are protected by `verifyCsrfOrigin` checking both `Origin` against `CORS_ORIGIN` and `Sec-Fetch-Site !== 'cross-site'`.
- **Why It Is Needed**:
  - Closes the attack surface on inventory data by ensuring every inventory request is cryptographically and statefully authenticated.
  - Mitigates token theft through single-use refresh rotation and family revocation.
  - Ensures instant user-wide revocation across horizontal backend instances via PostgreSQL state checks.
- **Alternatives Considered**:
  - *Stateless JWT-Only Validation*: Rejected because pure JWTs cannot be revoked without expiration, leaving window for compromised tokens.
  - *Grace Period for Refresh Rotation*: Rejected to enforce strict zero-trust replay detection as required by the security threat model.


