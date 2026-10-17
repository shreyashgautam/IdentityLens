# IVIP Mini — Code Execution & Architectural Data Flow (flow.md)

## 1. High-Level System Architecture Diagram

```
+---------------------------------------------------------------------------------------+
|                                    REACT FRONTEND                                     |
|  [Browser] -> main.tsx -> App.tsx -> AppLayout (Sidebar + TopBar + ThemeContext)      |
|                    |                                                                  |
|       Pages: Overview / Identities / Applications / Accounts / Entitlements / Risk    |
|                    |                                                                  |
|                    v (Typed API Client: api/client.ts)                                |
+---------------------------------------------------------------------------------------+
                                     | HTTP/JSON (REST /api/v1)
                                     v
+---------------------------------------------------------------------------------------+
|                                   EXPRESS BACKEND                                     |
|                                                                                       |
|  [1. Entry Point: server.js]                                                          |
|       └─> Loads config, initializes DB connection pool, runs migrations, starts app   |
|                                                                                       |
|  [2. Express App: app.js]                                                             |
|       └─> Global Middleware Chain:                                                    |
|           requestId -> helmet -> cors -> rateLimiter -> express.json()                |
|                                                                                       |
|  [3. Central Router: routes/index.js]                                                 |
|       ├─> /auth            ──> auth.routes.js                                         |
|       ├─> /identities      ──> identity.routes.js                                     |
|       ├─> /applications    ──> application.routes.js                                  |
|       ├─> /accounts        ──> account.routes.js                                      |
|       ├─> /entitlements    ──> entitlement.routes.js                                  |
|       ├─> /risk-findings   ──> risk.routes.js                                         |
|       ├─> /background-tasks──> task.routes.js                                         |
|       └─> /ai              ──> ai.routes.js                                           |
+---------------------------------------------------------------------------------------+
                                     |
                                     v (Per-Module Architecture)
+---------------------------------------------------------------------------------------+
|                       FEATURE MODULE (e.g., modules/identities/)                      |
|                                                                                       |
|  [Route]        identity.routes.js                                                    |
|                   │ (Applies authMiddleware, rbacMiddleware, validate(schema))        |
|                   ▼                                                                   |
|  [Validation]   identity.validation.js (Zod Schema)                                   |
|                   │ (Rejects malformed query params, bodies, or path UUIDs)           |
|                   ▼                                                                   |
|  [Controller]   identity.controller.js                                                |
|                   │ (Unpacks validated input, extracts user context, invokes service) |
|                   ▼                                                                   |
|  [Service]      identity.service.js                                                   |
|                   │ (Encapsulates business logic, resolution, domain calculations)    |
|                   ▼                                                                   |
|  [Repository]   identity.repository.js                                                |
|                   │ (Builds parameterized SQL queries: $1, $2, maps DB rows)          |
|                   ▼                                                                   |
|  [Database]     database/connection.js (pg.Pool) -> PostgreSQL Database               |
+---------------------------------------------------------------------------------------+
```

---

## 2. Backend Bootstrapping & Lifecycle Flow

### Step 1: Process Startup (`backend/src/server.js`)
- **File**: `backend/src/server.js`
- **Execution Flow**:
  1. `server.js` imports `config/env.js` and validates all required environment variables (`PORT`, `DATABASE_URL`, `JWT_SECRET`, etc.) using Zod. If any required variable is missing, the process exits immediately with a descriptive error.
  2. Calls `database/connection.js:verifyConnection()` to test the PostgreSQL connection pool.
  3. Calls `database/migrations/index.js:runMigrations()` to ensure all pending SQL schema migrations are applied in sequential order.
  4. Starts the HTTP listener by calling `app.listen(PORT, callback)` from `app.js`.
  5. Registers process signal listeners (`SIGTERM`, `SIGINT`) for graceful shutdown: stops receiving new requests, drains active HTTP connections, and closes the `pg.Pool`.

---

## 3. Global HTTP Request Middleware Pipeline (`backend/src/app.js`)

When an HTTP request enters Express, it flows through the following middleware sequence:

1. **`requestId.middleware.js`**:
   - Generates a UUID `req.id` (or preserves an incoming `X-Request-ID`).
   - Attaches `req.id` to the response headers (`X-Request-ID`).
2. **`helmet()`**:
   - Applies security headers (HSTS, X-Content-Type-Options, Frameguard, etc.).
3. **`cors.middleware.js`**:
   - Checks `req.headers.origin` against the allowed origins configured in environment variables.
   - Rejects unapproved origins and handles HTTP `OPTIONS` preflight requests.
4. **`rateLimiter.middleware.js`**:
   - Checks request counters based on client IP or authenticated client.
   - Returns `429 Too Many Requests` with a `Retry-After` header if limits are exceeded.
5. **`express.json({ limit: '100kb' })`**:
   - Parses the JSON body; returns `400 Bad Request` or `413 Payload Too Large` if malformed or oversized.
6. **Route Dispatcher (`routes/index.js`)**:
   - Routes requests under the versioned prefix `/api/v1/...`.
7. **Central Error Handler (`errorHandler.middleware.js`)**:
   - Catches any error forwarded via `next(err)`.
   - Maps errors to standard JSON structure:
     ```json
     {
       "error": {
         "code": "VALIDATION_ERROR | NOT_FOUND | UNAUTHENTICATED | FORBIDDEN | INTERNAL_ERROR",
         "message": "Human-readable safe message",
         "details": [],
         "request_id": "req_12345"
       }
     }
     ```
   - Logs full error stack traces on the server while hiding internal details from the client.

---

## 4. Feature Request Call Flow: Identities Example

Below is the concrete execution trace for `GET /api/v1/identities?page=1&limit=20&status=active`:

```
1. Client HTTP GET /api/v1/identities?page=1&limit=20&status=active
   │
2. backend/src/app.js
   │  └─> routes/index.js mounts /api/v1/identities
   │
3. backend/src/modules/identities/identity.routes.js
   │  ├─> Middleware 1: auth.middleware.js:verifyToken()
   │  │     └─ Checks Bearer token or HttpOnly cookie, sets req.user
   │  ├─> Middleware 2: rbac.middleware.js:requireRole(['admin', 'analyst'])
   │  │     └─ Verifies req.user.role has read permissions
   │  ├─> Middleware 3: validate(getIdentitiesSchema) from identity.validation.js
   │  │     └─ Validates { page: 1, limit: 20, status: 'active' }
   │  └─> Calls identity.controller.js:getIdentities(req, res, next)
   │
4. backend/src/modules/identities/identity.controller.js
   │  └─ Extracts query: const { page, limit, status, search } = req.validatedQuery;
   │  └─ Calls identity.service.js:listIdentities({ page, limit, status, search })
   │
5. backend/src/modules/identities/identity.service.js
   │  └─ Formats offset: const offset = (page - 1) * limit;
   │  └─ Calls identity.repository.js:findAndCountAll({ limit, offset, status, search })
   │
6. backend/src/modules/identities/identity.repository.js
   │  └─ Constructs parameterized SQL:
   │       SELECT id, display_name, identity_type, email, status, owner_id, created_at, updated_at
   │       FROM identities WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;
   │  └─ Executes: pool.query(queryText, [status, limit, offset])
   │  └─ Returns rows & total count to service
   │
7. backend/src/modules/identities/identity.service.js
   │  └─ Packages domain models into standardized response structure
   │
8. backend/src/modules/identities/identity.controller.js
   │  └─ Returns res.status(200).json({ data: [...], pagination: { page, limit, total, total_pages }, meta: { request_id } })
```

---

## 5. Ingestion & Reconciliation Flow (Milestone 9)

How synthetic identity records enter the system, normalize, match, and prevent duplicate account creation:

```
1. Trigger: Admin initiates import via POST /api/v1/ingestion/sync OR fixture loader
   │
2. modules/ingestion/ingestion.controller.js:triggerSync(req, res, next)
   │  └─ Calls ingestion.service.js:processSourcePayload(sourceRecords)
   │
3. modules/ingestion/ingestion.service.js
   │  ├─ Step A: Normalization
   │  │    └─ Cleans emails (lowercase, trimmed), strips whitespaces, validates schema.
   │  │
   │  ├─ Step B: Database Transaction Begins (pool.connect() -> client.query('BEGIN'))
   │  │
   │  ├─ Step C: Identity Resolution (modules/identities/identity.service.js:resolveIdentity)
   │  │    ├─ Check 1: Does an account exist with (application_id, external_id)?
   │  │    │    └─ If yes: Use its existing identity_id.
   │  │    ├─ Check 2: Does an identity exist with an exact matching corporate email?
   │  │    │    └─ If yes: Link account to that canonical identity_id.
   │  │    └─ Check 3: If ambiguous or no match:
   │  │         └─ Leave account.identity_id = NULL (surfaced as an Unresolved Finding).
   │  │
   │  ├─ Step D: Account Upsert (modules/accounts/account.repository.js:upsertAccount)
   │  │    └─ Executes parameterized ON CONFLICT (application_id, external_id) DO UPDATE:
   │  │         Updates email, username, status, last_login_at, updated_at.
   │  │         Guarantees zero duplicate accounts created on repeated imports!
   │  │
   │  ├─ Step E: Entitlement Assignment (modules/entitlements/entitlement.repository.js)
   │  │    └─ Inserts account_entitlements record (enforces account & entitlement belong to same application).
   │  │
   │  ├─ Step F: Commit Transaction (client.query('COMMIT'))
   │  │
   │  └─ Step G: Trigger Risk Engine
   │       └─ Calls modules/risk/risk.service.js:evaluateAccounts(affectedAccountIds)
```

---

## 6. Deterministic Risk Evaluation Flow (Milestone 10)

How risk rules evaluate identities and accounts to generate explainable findings:

```
1. Trigger: Called post-ingestion OR via POST /api/v1/risk-evaluations
   │
2. modules/risk/risk.service.js:evaluateAll(scope)
   │  └─ Queries identities, accounts, and entitlements via respective repositories.
   │
3. Iterates over registered rule evaluators in modules/risk/rules/:
   │
   ├─ Rule 1: OrphanedAccountRule (rule_code: 'ORPHAN_ACCOUNT')
   │    └─ Check: account.status == 'active' && account.identity_id IS NULL
   │    └─ Finding: Severity = 'high', Evidence: { account_id, external_id, application_name }
   │
   ├─ Rule 2: InactiveIdentityActiveAccountRule (rule_code: 'INACTIVE_USER_ACTIVE_ACCOUNT')
   │    └─ Check: identity.status == 'inactive' && account.status == 'active'
   │    └─ Finding: Severity = 'critical', Evidence: { identity_id, identity_status, account_id }
   │
   ├─ Rule 3: PrivilegedAccessRule (rule_code: 'PRIVILEGED_ENTITLEMENT')
   │    └─ Check: entitlement.name contains ('Admin', 'SuperUser', 'Owner')
   │    └─ Finding: Severity = 'medium', Evidence: { entitlement_name, assigned_at }
   │
   └─ Rule 4: StaleAccountRule (rule_code: 'STALE_ACCOUNT')
        └─ Check: last_login_at > 90 days ago && account.status == 'active'
        └─ Finding: Severity = 'low', Evidence: { last_login_at, days_inactive }
   │
4. modules/risk/risk.repository.js:upsertFindings(findings)
   │  └─ Compares with existing open findings using (rule_code, account_id, identity_id).
   │  └─ If already open: updates last_detected_at and evidence.
   │  └─ If new: inserts new finding with status='open'.
   │  └─ Idempotent: repeated runs do NOT create duplicate open rows!
```

---

## 7. Frontend Application & Data Flow (Milestones 7 & 8)

```
1. Entry Point: frontend/index.html -> frontend/src/main.tsx
   │
2. frontend/src/App.tsx
   │  ├─ Wraps in ThemeProvider (reads localStorage or prefers-color-scheme)
   │  ├─ Wraps in AuthProvider (tracks login state, user tokens, permissions)
   │  └─ BrowserRouter mounts routes inside AppLayout:
   │       ├─ /                  ──> OverviewPage
   │       ├─ /identities        ──> IdentitiesPage
   │       ├─ /identities/:id    ──> IdentityDetailPage
   │       ├─ /applications      ──> ApplicationsPage
   │       ├─ /accounts          ──> AccountsPage
   │       ├─ /entitlements      ──> EntitlementsPage
   │       └─ /risk-findings     ──> RiskFindingsPage
   │
3. AppLayout Component (frontend/src/components/layout/AppLayout.tsx)
   │  ├─ Sidebar: Collapsible navigation with active route highlights & icons
   │  ├─ TopBar: Breadcrumbs, Light/Dark theme toggle button, User profile badge
   │  └─ Main Content Area with responsive container
   │
4. Data Fetching Lifecycle (e.g., IdentitiesPage.tsx):
   │  ├─ User changes search query or pagination page
   │  ├─ Invokes custom hook useIdentities({ page, limit, search, status })
   │  ├─ Hook calls api/client.ts:getIdentities(params)
   │  │    └─ fetch('http://localhost:5000/api/v1/identities?...', { credentials: 'include' })
   │  ├─ Renders Loading Skeleton while promise is pending
   │  ├─ On Success: DataTable renders rows, badges for identity_type, status, linked account count
   │  ├─ On Empty: EmptyState component with "No identities match your filter"
   │  └─ On Error: ErrorState component with user-friendly retry button
```

---

## 8. Optional AI Explanation Flow (Milestone 13)

How the user requests an AI-assisted explanation without compromising security:

```
1. User clicks "Explain Finding" button on a Risk Finding detail card.
   │
2. Frontend sends: POST /api/v1/risk-findings/:id/explanations
   │
3. modules/ai/ai.routes.js -> calls modules/ai/ai.controller.js:explainFinding()
   │
4. modules/ai/ai.service.js:generateExplanation(findingId, req.user)
   │  ├─ Step 1: Authorization check: Can req.user access this finding and its linked identity?
   │  ├─ Step 2: Retrieve finding record and deterministic evidence from risk.repository.js.
   │  ├─ Step 3: Minimal Context Construction:
   │  │    Filters out passwords, tokens, full DB dumps, and unrelated users.
   │  │    Constructs structured prompt using ai.prompts.js.
   │  ├─ Step 4: Calls ai.provider.js (adapter for Grok / selected LLM) with a strict timeout (e.g., 8s).
   │  ├─ Step 5: Output Validation using Zod schema (ai.schemas.js):
   │  │    Ensures response matches { summary, evidence_used, reasoning, uncertainties, suggested_next_steps, disclaimer }
   │  └─ Step 6: Returns validated explanation object to controller.
   │
5. Frontend renders AI Explanation card:
   │  ├─ Displays "AI-Generated Analysis" badge with disclaimer
   │  ├─ Shows clear reasoning linked to exact evidence fields
   │  └─ AI has ZERO write access to the database and cannot alter finding severity or account status!
```
