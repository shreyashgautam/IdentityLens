# IVIP Mini — Development Roadmap

## 1. Purpose

This document defines the implementation sequence, milestones, dependencies, and acceptance criteria for IVIP Mini.

The roadmap ensures that development proceeds incrementally, with each milestone verified before dependent work begins.

It must be followed alongside:

- `README.md`
- `docs/architecture.md`
- `docs/data-model.md`
- `docs/api-contract.md`
- `security/threat-model.md`
- `security/secure-development.md`
- `ai/agent-policy.md`
- `ai/ai-features.md`
- `design/design-system.md`
- `design/ux-flows.md`

The roadmap describes planned work. A milestone must not be marked complete merely because its files have been generated.

## 2. Project Goals

IVIP Mini aims to demonstrate a practical understanding of:

- Identity inventory and discovery
- Human and non-human identities
- Application accounts and access relationships
- Identity resolution and source-data reconciliation
- REST API design
- PostgreSQL data modeling
- Modular backend architecture
- Authentication and authorization
- Secure software development
- Deterministic risk detection
- Background processing
- Frontend dashboard development
- Automated testing and operational reliability
- Optional AI-assisted risk explanations

The project is an independent learning implementation inspired by publicly documented identity-security concepts. It must not assume access to proprietary implementation details.

## 3. Technology Stack

### Frontend

- React
- TypeScript
- Vite
- A consistent component and design system
- Responsive dashboard layouts

### Backend

- Node.js
- Express
- JavaScript initially
- Zod for validation
- Modular feature architecture

### Database

- PostgreSQL
- `pg` database client
- Versioned database migrations
- Database constraints and indexes

### Testing and quality

- Automated unit tests
- API integration tests
- Database integration tests
- Frontend tests where useful
- Linting and formatting
- Dependency and security checks

### Optional later capabilities

- Background task processing
- Authorized identity-source integrations
- AI-assisted explanations and summaries
- Production deployment and monitoring

Do not introduce additional infrastructure or dependencies unless a milestone genuinely requires them.

## 4. Development Rules

1. Complete milestones in dependency order.
2. Work on one focused feature at a time.
3. Inspect existing code before changing it.
4. Follow the documented module boundaries.
5. Use PostgreSQL as the source of truth for persisted application data.
6. Use synthetic records during initial development.
7. Implement and test security controls alongside sensitive features.
8. Avoid unnecessary microservices and abstractions.
9. Do not implement AI before the core inventory and risk logic are reliable.
10. Do not mark work complete without verification.
11. Update relevant documentation when the implementation changes an approved design.
12. Preserve existing working functionality when adding new features.

## 5. Milestone Overview

| Milestone | Focus | Completion outcome |
|---|---|---|
| M0 | Repository and documentation | Project rules and scope are established |
| M1 | Development environment | Frontend and backend run locally |
| M2 | Backend foundation | Modular Express API and error handling work |
| M3 | Database foundation | PostgreSQL migrations and constraints work |
| M4 | Core inventory APIs | Identities, applications, and accounts work |
| M5 | Entitlements | Account-access relationships work |
| M6 | Authentication and authorization | Protected routes and access policies work |
| M7 | Frontend foundation | Shared UI and dashboard shell work |
| M8 | Inventory dashboard | Inventory data can be explored through the UI |
| M9 | Identity discovery and reconciliation | Synthetic source records can be imported and reconciled |
| M10 | Deterministic risk engine | Explainable risk findings are generated |
| M11 | Background tasks and reliability | Long-running work is tracked safely |
| M12 | Security hardening | Security controls are verified |
| M13 | Optional AI capabilities | AI explains existing findings safely |
| M14 | Deployment and final review | The project is reproducible and documented |

Milestones may be split into smaller tasks. A dependent milestone must not be considered complete while its required dependencies remain unfinished.

## 6. M0 — Repository and Documentation

### Objectives

Establish the project scope, architecture, data model, API contract, and security expectations.

### Tasks

- Create the root project structure.
- Add and review `README.md`.
- Add `docs/architecture.md`.
- Add `docs/data-model.md`.
- Add `docs/api-contract.md`.
- Add `docs/roadmap.md`.
- Add `security/threat-model.md`.
- Add `security/secure-development.md`.
- Create the remaining AI and design documents according to the documentation plan.
- Add `AGENTS.md` and relevant agent rules when ready.

### Acceptance criteria

- All created documents agree on the technology stack.
- The architecture defines modular backend responsibilities.
- The data model and API contract do not contradict one another.
- Security requirements are documented.
- Planned versus implemented features are clearly distinguished.

## 7. M1 — Development Environment

### Objectives

Make the project easy to run and verify locally.

### Tasks

- Initialize the React TypeScript frontend using Vite.
- Initialize the Express backend.
- Configure ES modules consistently.
- Add environment-variable loading.
- Add development scripts.
- Configure linting and formatting where appropriate.
- Create `.gitignore`.
- Create a sanitized `.env.example`.
- Document frontend and backend startup commands.
- Verify the local development workflow.

### Acceptance criteria

- The frontend starts successfully.
- The backend starts successfully.
- The frontend and backend can run concurrently.
- Environment-specific configuration is not hardcoded.
- No real secrets are committed.
- Startup errors are understandable.

## 8. M2 — Backend Foundation

### Objectives

Build a modular Express application before adding substantial business functionality.

### Tasks

- Separate `server.js` and `app.js`.
- Establish the documented module structure.
- Add centralized error handling.
- Add request IDs and structured logging.
- Configure JSON parsing and request-size limits.
- Configure explicit CORS origins.
- Add appropriate security headers.
- Add global and endpoint-specific rate-limiting infrastructure.
- Add Zod-based validation middleware.
- Add the health endpoint.
- Add tests for middleware and error responses.

### Acceptance criteria

- The server starts using the documented command.
- `GET /health` returns the documented response.
- Invalid JSON is handled safely.
- Errors use the documented response structure.
- CORS behavior is tested.
- Rate limits are enforced on applicable endpoints.
- No internal stack traces are exposed to API clients.

## 9. M3 — Database Foundation

### Objectives

Establish PostgreSQL as the persistent source of truth.

### Tasks

- Configure the PostgreSQL connection.
- Create versioned database migrations.
- Implement the documented core schema.
- Add primary keys, foreign keys, unique constraints, and indexes.
- Add database connection error handling.
- Define transaction patterns for multi-record operations.
- Use parameterized SQL.
- Configure an appropriately restricted application database role where practical.
- Add database integration tests.

### Acceptance criteria

- Migrations can be applied to a clean development database.
- Tables and relationships match `docs/data-model.md`.
- Foreign-key constraints reject invalid references.
- Unique constraints prevent duplicate source-account records.
- The backend can execute a basic query.
- Database failures are handled without exposing credentials or raw SQL errors.

## 10. M4 — Core Inventory APIs

### Objectives

Implement the foundational inventory resources.

### Tasks

Implement the documented APIs for:

- Identities (M4 Part 1: Completed — `GET`, `GET /:id`, `POST`, `PATCH` implemented with Zod validation, parameterized SQL, recursive ownership cycle detection, allowlisted sorting, pagination, and 21 automated integration tests)
- Applications (M4 Part 2: Completed — `GET`, `GET /:id`, `POST`, `PATCH` implemented with Zod validation, parameterized SQL, unique key conflict handling, allowlisted sorting, pagination, and 21 automated integration tests)
- Accounts & Relationships (M4 Part 3: Completed — `GET`, `GET /:id`, `POST`, `PATCH /accounts`, `GET /identities/:id/accounts`, `GET /applications/:id/accounts` implemented with Zod validation, parameterized SQL, foreign key validation, composite uniqueness conflict handling, orphan account filtering, allowlisted sorting, pagination, and 35 automated integration tests. Milestone 4 is fully completed with 95 passing tests across 5 test suites)

For each module, implement the appropriate:

- Routes
- Controllers
- Services
- Models
- Validation schemas
- Repositories
- Unit and integration tests

Add pagination, filtering, sorting, and search where documented.

### Acceptance criteria

- Valid requests return the documented responses.
- Invalid requests are rejected.
- Missing resources return appropriate status codes.
- Database queries remain inside repositories.
- Business logic remains inside services.
- Duplicate source accounts do not create duplicate records.
- Protected data is not exposed without authorization.

## 11. M5 — Entitlements and Access Relationships

### Objectives

Represent the access that application accounts have been assigned.

### Tasks

- Implement entitlement definitions.
- Implement account-entitlement assignments.
- Validate that accounts and entitlements belong to the same application.
- Prevent duplicate assignments.
- Use transactions for appropriate multi-step changes.
- Add listing and relationship-removal operations according to the API contract.
- Add tests for invalid relationships and permissions.

### Acceptance criteria

- Entitlements can be listed and created.
- An account can have multiple entitlements.
- An entitlement can be assigned to multiple accounts.
- Invalid cross-application assignments are rejected.
- Duplicate assignments are prevented.
- Relationship changes follow the documented authorization and audit requirements.

## 12. M6 — Authentication and Authorization

### Objectives

Protect the application before exposing sensitive inventory functionality.

### Tasks

- Select and document the authentication mechanism.
- Implement signup and login.
- Implement logout and token or session refresh as appropriate.
- Implement forgot-password and reset-password flows.
- Use secure password hashing.
- Add authentication middleware.
- Define ACL/RBAC policies.
- Protect administrative routes.
- Enforce resource-level authorization.
- Add authentication-specific rate limits.
- Add tests for account enumeration, expired tokens, IDOR, and privilege escalation.

### Acceptance criteria

- Protected routes reject unauthenticated requests.
- Standard users cannot invoke administrator-only operations.
- Users cannot access unauthorized resources by changing IDs.
- Users cannot grant themselves privileges.
- Password recovery uses expiring, single-use tokens.
- Authentication and recovery endpoints enforce their configured rate limits.
- Secrets are never exposed in API responses or logs.

Sensitive inventory routes must not be considered ready for external use before their required access controls are implemented and verified.

## 13. M7 — Frontend Foundation

### Objectives

Create a consistent, maintainable frontend structure.

### Tasks

- Establish the React application structure.
- Configure routing.
- Establish shared layout components.
- Implement the design system.
- Create reusable buttons, inputs, tables, badges, dialogs, and loading states.
- Implement error, empty, and loading states.
- Add light and dark themes if specified by the design document.
- Add responsive layouts.
- Establish the frontend API client and error handling.

### Acceptance criteria

- The application has a consistent layout.
- Components follow the design system.
- Loading, error, and empty states are implemented.
- The interface works on supported screen sizes.
- API errors are handled consistently.
- No server-side secrets appear in frontend code.

## 14. M8 — Inventory Dashboard

### Objectives

Connect the frontend to the core inventory APIs.

### Tasks

- Build the dashboard overview.
- Display identity counts and application inventory.
- Build identity and account tables.
- Add search, filtering, sorting, and pagination.
- Add identity and account detail views.
- Display linked applications and entitlements.
- Add appropriate loading and error states.
- Enforce frontend navigation rules while relying on backend authorization for actual security.

### Acceptance criteria

- Dashboard data comes from the backend.
- Tables support the documented query parameters.
- Detail views display the correct linked records.
- Empty datasets are handled gracefully.
- Failed requests produce understandable feedback.
- The frontend does not invent inventory data as if it came from PostgreSQL.

## 15. M9 — Identity Discovery and Reconciliation

### Objectives

Introduce synthetic source records and reconcile them with the canonical inventory.

### Tasks

- Define a synthetic source format.
- Validate imported records.
- Preserve source identifiers and provenance.
- Normalize supported fields.
- Match source accounts using documented rules.
- Prevent duplicate imports.
- Keep ambiguous identity matches unresolved.
- Track import failures and reconciliation results.
- Add repeat-import and conflicting-record tests.

### Acceptance criteria

- Synthetic records can be imported.
- Repeated imports do not create duplicate source accounts.
- Invalid records are rejected or safely quarantined.
- Identity matching is explainable.
- Similar display names alone do not cause automatic identity merging.
- Import failures are observable and do not corrupt unrelated records.

Real enterprise integrations must be planned and authorized separately.

## 16. M10 — Deterministic Risk Engine

### Objectives

Identify potentially risky identity and access conditions using explicit, testable rules.

### Tasks

- Define the initial risk rules.
- Document each rule's purpose, inputs, and evidence.
- Implement rule evaluation in the risk module.
- Generate and update risk findings.
- Define severity and lifecycle behavior.
- Make repeated evaluations idempotent.
- Add finding filters and detail views.
- Add tests for both positive and negative cases.

Potential initial rules include:

- Active application account linked to an inactive identity.
- Account without a verified identity link.
- Duplicate or conflicting source-account records.
- Potentially excessive access based on explicitly configured privilege classifications.
- Stale accounts when reliable last-activity data is available.

### Acceptance criteria

- Rules are deterministic and documented.
- Findings include evidence explaining why they were generated.
- Repeated evaluations do not create duplicate open findings for the same issue.
- Unsupported assumptions are not presented as facts.
- Severity is assigned by documented logic.
- Risk evaluation does not automatically disable accounts or revoke access.

## 17. M11 — Background Tasks and Reliability

### Objectives

Support long-running operations without unnecessarily blocking HTTP requests.

### Tasks

- Define the background-task model.
- Implement task creation and status retrieval.
- Add a reliable execution mechanism when required.
- Add task ownership and authorization checks.
- Add execution limits and concurrency controls.
- Implement idempotency for selected repeatable task submissions.
- Record safe progress and failure information.
- Add tests for retries, duplicate submissions, and worker failures.

### Acceptance criteria

- Accepted asynchronous operations return `202 Accepted`.
- Each accepted task has a stable task ID.
- Status polling does not restart the task.
- Repeated submissions with the same supported idempotency key do not create duplicate jobs.
- Unauthorized callers cannot view other users' task results.
- Failed tasks do not expose internal stack traces.
- Resource limits prevent unbounded work.

Do not introduce a queue or worker infrastructure prematurely. Select the simplest reliable mechanism that meets the actual requirements.

## 18. M12 — Security Hardening

### Objectives

Verify the security requirements across the integrated application.

### Tasks

- Review the threat model against the actual implementation.
- Verify ACL/RBAC enforcement.
- Test resource-level authorization.
- Verify rate limiting, throttling, and IP denylisting where implemented.
- Verify CORS and production TLS configuration.
- Review input validation and SQL safety.
- Check dependency vulnerabilities.
- Verify secret handling.
- Review audit logging.
- Test database constraints and migrations.
- Document remaining risks and remediation tasks.

### Acceptance criteria

- High-risk security issues have been remediated or explicitly documented for resolution.
- Relevant security tests pass.
- No real credentials are committed.
- Protected endpoints enforce authorization.
- API errors do not disclose internal details.
- Security controls are verified through tests or appropriate deployment checks.
- Remaining limitations are clearly documented.

## 19. M13 — Optional AI Capabilities

### Objectives

Add AI only after the core inventory and deterministic risk engine are functional and testable.

### Potential features

- Natural-language explanations of existing findings.
- Summaries of risk evidence.
- Plain-language descriptions of identity and access relationships.
- Read-only assistance for understanding inventory data.

### Tasks

- Define permitted AI inputs and outputs.
- Minimize sensitive data sent to the provider.
- Implement a service boundary for AI calls.
- Validate AI output.
- Apply authorization before retrieving data for AI requests.
- Handle provider failures and timeouts.
- Add usage limits and cost controls.
- Test prompt injection and unsafe-output scenarios.
- Follow `ai/agent-policy.md` and `ai/ai-features.md`.

### Acceptance criteria

- Core risk decisions remain deterministic.
- AI does not directly execute SQL.
- AI cannot bypass authorization.
- AI does not independently grant or revoke access.
- Untrusted records cannot instruct the AI to perform privileged actions.
- AI failures do not break core inventory functionality.
- Sensitive data handling is documented.

AI features are optional and must not block completion of the core project.

## 20. M14 — Deployment and Final Review

### Objectives

Make the project reproducible, demonstrable, and ready for its intended deployment environment.

### Tasks

- Document local setup from a clean checkout.
- Validate production configuration.
- Configure HTTPS and TLS.
- Configure production CORS.
- Review database permissions and network exposure.
- Configure secrets management.
- Apply migrations through a controlled process.
- Configure health checks and operational logging.
- Establish backups and recovery procedures when appropriate.
- Run frontend, backend, database, and security tests.
- Document known limitations.
- Update the README with verified setup and feature instructions.

### Acceptance criteria

- A developer can follow the setup instructions successfully.
- The application starts with documented configuration.
- Database migrations work on a clean database.
- Tests run using the documented commands.
- Production security settings are verified for the chosen environment.
- The README accurately describes implemented functionality.
- Known risks and unfinished features are documented.

## 21. Definition of Done for Every Task

Every implementation task must include:

1. A clear objective.
2. A defined scope.
3. The expected files or modules to change.
4. Relevant architecture and security considerations.
5. Acceptance criteria.
6. Appropriate automated tests.
7. Verification results.
8. Documentation updates when needed.

A task is not complete because code was generated. It is complete when the behavior has been verified.

## 22. Progress Tracking

Maintain milestone status using the following values:

- `NOT_STARTED`
- `IN_PROGRESS`
- `BLOCKED`
- `IN_REVIEW`
- `DONE`

For each milestone, record:

- Status
- Completed tasks
- Remaining tasks
- Dependencies
- Tests run
- Test results
- Known issues
- Next recommended task

Never mark a milestone `DONE` while required acceptance criteria remain unmet.

### Current Milestone Progress Table

| Milestone | Status | Completed Highlights | Remaining Tasks | Next Recommended Task |
|---|---|---|---|---|
| **M0: Repository & Documentation** | `DONE` | All 14 Markdown specs established, root `AGENTS.md` formalized, canonical path `security/threat-model.md` normalized, root workspace scripts added. | None. Phase 0 acceptance gates satisfied. | Proceed to M1 & M2 verification. |
| **M1: Development Environment** | `IN_PROGRESS` | React TS Vite 6 frontend & Express backend scaffolded, dev servers running, root `npm run dev:*` scripts operational. | Verify local PostgreSQL environment & credentials. | Configure PostgreSQL local connection. |
| **M2: Backend Foundation** | `DONE` | Decoupled `server.js` and `app.js`, Zod env validation, kebab-case middlewares (`request-id`, `cors`, `security-headers`, `not-found`, `error-handler`, `validate`), multi-probe health API (`/health`, `/health/live`, `/health/ready`), native Node test suite (8/8 tests pass). | None. M2 acceptance criteria satisfied. | Proceed to M3 Database Foundation. |
| **M3: Database Foundation** | `DONE` | PostgreSQL `identitylens` database created, `pg.Pool` singleton connection module with bounded limits, advisory locked migration runner, all 6 core tables & indexes migrated, `/health/ready` probe verifies live DB latency, 18 automated integration tests passing (100% pass). | None. M3 acceptance criteria satisfied. | Proceed to M4 Core Inventory APIs. |
| **M4–M14** | `NOT_STARTED` | Documented in architecture & API contracts. | Dependent on preceding milestones. | Follow dependency order. |

The roadmap is a living document. Update it when approved design changes alter task dependencies or project scope.

## 23. Working Agreement for Antigravity

Before starting a milestone:

1. Read this roadmap and the relevant project documents.
2. Identify the smallest next task.
3. Inspect the existing implementation.
4. Explain the proposed change and affected files.
5. Implement only the agreed scope.
6. Run relevant checks.
7. Report changed files, commands run, results, and remaining issues.
8. Update progress only when the evidence supports the new status.

Do not build multiple unrelated milestones in one large change.

Do not add features merely because they appear in a later milestone.

Preserve working functionality and ask for clarification when a security-sensitive or architecture-level decision is not documented.

## 24. Final Project Success Criteria

IVIP Mini is successful when it demonstrates a working, maintainable, and testable identity inventory system with:

- A documented modular architecture.
- A consistent PostgreSQL data model.
- A validated and documented REST API.
- Secure authentication and authorization.
- Identity, application, account, and entitlement management.
- Synthetic identity discovery and reconciliation.
- Deterministic and explainable risk findings.
- A functional dashboard.
- Appropriate security and reliability controls.
- Automated tests and reproducible setup instructions.
- Optional AI features that respect the system's security boundaries.

The priority is correctness, clarity, security, and demonstrable understanding—not the number of features or the complexity of the technology stack.