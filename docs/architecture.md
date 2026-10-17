# IVIP Mini — System Architecture

## 1. Purpose

This document defines the high-level system architecture of IVIP Mini.

It describes the system's components, their responsibilities, communication paths, data flow, security boundaries, and architectural constraints.

Developers and AI coding agents must consult this document before introducing new components, dependencies, integrations, or architectural changes.

This architecture is a design specification for an independent learning project inspired by publicly documented identity visibility concepts. It is not a representation of Zluri's internal architecture.

## 2. Architectural Goals

The architecture must:

1. Remain understandable to a beginner learning full-stack engineering.
2. Separate the frontend, API, business logic, data access, and ingestion responsibilities.
3. Support identity records originating from multiple sources.
4. Preserve source identifiers and relevant provenance.
5. Avoid duplicate account creation during repeated imports.
6. Provide explainable, deterministic risk findings.
7. Enforce authentication and authorization on the server when protected features are introduced.
8. Support automated testing and incremental development.
9. Allow future AI-assisted features without making AI a critical dependency.
10. Avoid premature complexity and unnecessary infrastructure.

## 3. Architectural Style

IVIP Mini will begin as a modular monolith.

The frontend and backend are separate applications, but the backend initially runs as one deployable service.

The backend is divided into modules with clearly defined responsibilities rather than being split into microservices.

### Why a Modular Monolith?

- Easier to run and debug locally.
- Fewer deployment and networking concerns.
- Simpler transactions and data consistency.
- Easier for a beginner and an AI coding agent to understand.
- Allows future separation of components if real requirements justify it.

Do not introduce microservices, message brokers, graph databases, or orchestration platforms without a documented requirement and explicit approval.

## 4. Technology Stack

### Frontend

- React
- TypeScript
- Vite
- A reusable component and design system
- A typed API client for backend communication

### Backend

- Node.js
- Express
- JavaScript initially, with gradual TypeScript adoption considered later
- Zod for request validation
- The `pg` package for PostgreSQL connectivity

### Database

- PostgreSQL
- Versioned SQL migrations
- Foreign keys and uniqueness constraints
- Indexes for common query patterns

### Testing

- Unit tests for business logic
- API integration tests
- Database integration tests
- Frontend component tests as the UI grows

The implementation must use the actual installed dependencies and existing project conventions. Documentation alone does not imply that a library has already been installed.

## 5. System Context

IVIP Mini interacts with the following actors and external systems.

### Administrator

Uses the dashboard to inspect identities, applications, accounts, and risk findings.

### Identity Sources

Initially represented by synthetic data fixtures or mock connectors.

Future examples may include authorized integrations with identity providers, SaaS applications, or cloud platforms.

### IVIP Mini Application

Processes identity data, maintains application relationships, evaluates risk rules, and presents the resulting information.

### Optional AI Provider

May later assist with summarizing existing findings or explaining evidence.

AI is optional. The core system must continue to operate if an AI provider is unavailable.

## 6. High-Level Component Architecture

The system consists of the following components.

### 6.1 Frontend Application

Location: `frontend/`

Responsibilities:

- Render the dashboard.
- Display identity and application inventories.
- Provide search, filtering, sorting, and pagination.
- Display account relationships and risk findings.
- Show loading, empty, success, and error states.
- Submit user actions through the backend API.
- Present AI-generated explanations only when explicitly supported by the backend.

The frontend must not connect directly to PostgreSQL.

It must not contain database credentials, private API keys, or authorization rules that are enforced only in the browser.

### 6.2 API Layer

Location: `backend/src/routes/`

Responsibilities:

- Define HTTP endpoints.
- Parse and validate request data.
- Apply authentication and authorization middleware when protected routes are introduced.
- Call the appropriate service.
- Return consistent JSON responses and HTTP status codes.
- Avoid embedding complex business logic directly in route handlers.

Route handlers should remain small and understandable.

### 6.3 Service Layer

Location: `backend/src/services/`

Responsibilities:

- Implement identity-management operations.
- Normalize incoming identity records.
- Coordinate identity resolution.
- Manage account and application relationships.
- Evaluate deterministic risk rules.
- Coordinate ingestion workflows.

Services should contain business logic rather than HTTP-specific response handling.

### 6.4 Data Access Layer

Location: `backend/src/db/`

Responsibilities:

- Manage the PostgreSQL connection pool.
- Execute parameterized SQL queries.
- Provide database operations used by services.
- Apply versioned schema migrations.
- Handle transaction boundaries where multiple operations must succeed together.

SQL must not be constructed by directly concatenating untrusted input.

### 6.5 Ingestion Layer

Location: `backend/src/ingestion/`, to be added when ingestion is implemented.

Responsibilities:

- Read records from synthetic sources or authorized connectors.
- Validate and normalize source data.
- Preserve external identifiers and source provenance.
- Process repeated imports safely.
- Track synchronization status and errors.
- Support retry and recovery behavior.

Connector-specific logic must remain separate from general identity-management logic.

### 6.6 Risk Engine

Location: `backend/src/services/risk-service.js` initially, or an equivalent module following the project's established conventions.

Responsibilities:

- Evaluate deterministic risk rules.
- Generate findings with rule identifiers and supporting evidence.
- Associate findings with the relevant identity or account.
- Support repeatable evaluation and tests.
- Avoid presenting uncertain findings as confirmed security incidents.

Risk scoring must be documented and configurable where appropriate.

The first version will use simple rules rather than an ML model or LLM to determine risk.

### 6.7 Optional AI Service

Location: `backend/src/services/ai-service.js`, only when an AI feature is approved.

Responsibilities:

- Receive explicitly selected finding data from the backend.
- Generate explanations or summaries grounded in that data.
- Validate and constrain model output.
- Handle provider failures and timeouts.
- Avoid sending unnecessary sensitive information to an external provider.

The AI service must not directly execute SQL, modify access permissions, or perform autonomous remediation.

AI output must not be treated as verified evidence.

## 7. Request and Data Flow

### 7.1 Reading the Identity Inventory

1. An administrator opens the dashboard.
2. The frontend requests `GET /api/identities`.
3. Express validates the request and applies applicable access controls.
4. The route calls the identity service.
5. The identity service requests records through the data access layer.
6. PostgreSQL returns the matching records.
7. The backend returns a JSON response.
8. The frontend renders the identity inventory.

The frontend must handle loading states, empty results, errors, and pagination.

### 7.2 Importing Identity Records

1. An authorized user or scheduled process initiates an import.
2. The ingestion component reads synthetic source records or retrieves records from an approved connector.
3. Incoming data is validated.
4. Source-specific fields are mapped to a canonical representation.
5. Identity resolution determines whether records can safely be associated with existing identities.
6. Account records are inserted or updated using stable source identifiers.
7. Changes are committed using appropriate database transaction boundaries.
8. The synchronization outcome is recorded.
9. Relevant risk rules are evaluated.
10. The dashboard can retrieve the updated inventory and findings.

The first implementation will use synthetic data. External connectors and scheduled synchronization will be introduced incrementally.

### 7.3 Generating Risk Findings

1. The risk engine receives relevant identity, account, and entitlement data.
2. It evaluates the configured deterministic rules.
3. It creates or updates findings with rule identifiers, severity, descriptions, and evidence.
4. Findings are persisted in PostgreSQL.
5. The frontend retrieves and displays the results.

Repeated evaluation must not create unbounded duplicate findings for the same unresolved condition.

Resolved findings and historical changes must be handled consistently with the documented finding lifecycle.

### 7.4 Optional AI-Assisted Explanation

1. A user requests an explanation of an existing finding.
2. The backend retrieves the finding and its relevant evidence.
3. The AI service receives only the minimum necessary information.
4. The model produces a proposed explanation.
5. The backend validates the response and identifies it as AI-generated.
6. The frontend displays the explanation alongside the original evidence.

If the provider fails, the underlying finding remains available.

An AI-generated explanation cannot change a finding's evidence, approve access, or perform remediation.

## 8. Data Ownership and Source of Truth

PostgreSQL is the source of truth for IVIP Mini's persisted application state.

External applications remain authoritative for the records they originally own.

For example:

- A source application's account identifier is preserved as an external identifier.
- An imported email is source data, not unquestionable proof that two records represent the same person.
- A calculated risk score is derived data.
- An AI explanation is supplementary output, not authoritative identity data.

The system must distinguish source data, normalized data, derived findings, and AI-generated explanations.

## 9. Identity Resolution and Deduplication

Identity resolution must be conservative.

The system must:

- Preserve stable source identifiers.
- Enforce uniqueness for an external account within its source application.
- Normalize comparable fields without discarding original source information.
- Use documented matching rules.
- Avoid merging identities solely because they share a display name.
- Avoid automatic merging when the available evidence is ambiguous.
- Record the basis for important matching decisions where practical.

An account can belong to an identity, but an account must not automatically be treated as the identity itself.

The matching process must be testable and independent of the frontend.

## 10. Security Boundaries

The architecture contains several trust boundaries.

### Browser to Backend

All request data is untrusted.

The backend must validate input, enforce authorization, and avoid exposing sensitive internal details in error responses.

### Backend to Database

The database must be accessed through a controlled connection layer.

Use parameterized SQL, least-privilege database credentials, and appropriate transaction handling.

### Backend to External Connector

External responses are untrusted.

Validate schemas, apply timeouts, handle rate limits, and avoid logging tokens or sensitive response data.

### Backend to AI Provider

Treat model inputs and outputs as untrusted.

Minimize transmitted data, handle provider failures, and prevent model output from bypassing authorization or business rules.

Detailed security requirements belong in `security/threat-model.md` and `security/secure-development.md`.

## 11. Error Handling and Observability

The application should provide:

- Consistent HTTP error responses.
- Structured server-side logs.
- Request correlation identifiers where appropriate.
- Safe error messages for clients.
- Detailed internal diagnostics without exposing secrets.
- Import and synchronization status.
- Retry tracking for recoverable failures.
- Tests for important failure scenarios.

The application must not silently treat partial ingestion as a complete successful import.

## 12. Performance and Reliability

Initial implementation priorities:

- Add indexes for common identity, account, and finding queries.
- Use database connection pooling.
- Implement pagination rather than returning unbounded datasets.
- Use explicit query limits.
- Apply request and external-call timeouts where appropriate.
- Make repeated imports idempotent.
- Use transactions for related database writes.
- Keep expensive processing out of HTTP request handlers when asynchronous execution becomes necessary.

Background queues or separate workers may be introduced later if measured workload or reliability requirements justify them.

## 13. AI Coding Agent Constraints

Before changing architecture or implementing a significant feature, the coding agent must:

1. Read this document and all relevant module documentation.
2. Inspect the existing repository and current Git changes.
3. Identify conflicts between the specification and the implementation.
4. Propose a plan with the expected files and tests.
5. Avoid unnecessary dependencies and architectural complexity.
6. Request approval for significant architecture changes.
7. Preserve existing working behavior unless the change is explicitly approved.
8. Run available tests and report actual results.
9. Update documentation when the architecture changes.

The agent must not claim that a connector, test, security control, or integration works without verification.

## 14. Initial Implementation Sequence

### Milestone 1: Application Foundation

- Establish the React and Express applications.
- Verify the local PostgreSQL environment.
- Configure the database connection.
- Introduce versioned SQL migrations.
- Implement a health endpoint.
- Implement the first identities API.
- Display persisted identities in the frontend.

### Milestone 2: Identity Inventory

- Implement identity listing, filtering, and pagination.
- Add identity details.
- Add application inventory.
- Create sample data and API tests.

### Milestone 3: Accounts and Entitlements

- Add account relationships.
- Add entitlement assignments.
- Display identity-to-application relationships.
- Add integrity constraints and tests.

### Milestone 4: Ingestion

- Add synthetic identity sources.
- Implement normalization and safe upserts.
- Track synchronization status.
- Test duplicate records and partial failures.

### Milestone 5: Risk Engine

- Implement deterministic risk rules.
- Store findings and evidence.
- Display finding details.
- Test repeat evaluation and finding lifecycle behavior.

### Milestone 6: Hardening and Optional AI

- Improve authentication and authorization.
- Strengthen audit logging and reliability.
- Add optional evidence-grounded AI explanations.
- Verify provider failure behavior and privacy boundaries.

## 15. Architectural Decision Process

When a proposed change affects the system architecture, the developer or AI agent must document:

- The problem being solved.
- The proposed change.
- Alternative approaches considered.
- Benefits and trade-offs.
- Security and operational implications.
- Testing and migration requirements.

Significant decisions should be recorded as Architecture Decision Records under `docs/decisions/`.

## 16. Completion Criteria

The architecture is being followed when:

- Components have clear responsibilities.
- Frontend and backend communicate through documented APIs.
- Business logic is not unnecessarily embedded in route handlers.
- Database access is controlled and parameterized.
- Imported identities retain source provenance.
- Identity matching is conservative and testable.
- Risk findings have identifiable rules and supporting evidence.
- AI is optional and cannot bypass core application controls.
- Architectural changes are reviewed, tested, and documented.

## 7. Backend Modularity and Code Organization

### 7.1 Architectural Principle

The backend must be highly modular, feature-oriented, and organized by clear responsibilities.

The backend will use a modular monolith architecture. Each feature must have a defined boundary, and its HTTP handling, business logic, validation, data access, and domain representation must remain appropriately separated.

Avoid placing application logic directly inside `server.js`, Express route definitions, or database query handlers.

### 7.2 Backend Directory Structure

The intended structure is:

backend/
- src/
  - server.js
  - app.js
  - config/
  - routes/
  - middlewares/
  - modules/
    - identities/
    - applications/
    - accounts/
    - entitlements/
    - ingestion/
    - risk/
    - audit/
    - ai/
  - helpers/
  - database/
    - connection.js
    - migrations/
  - jobs/
- tests/

The actual repository may initially contain fewer modules. Create feature folders incrementally when the corresponding functionality is implemented.

Do not create empty folders or placeholder modules without a clear implementation purpose.

### 7.3 Server Responsibilities

`server.js` is responsible only for starting the HTTP server, handling startup and shutdown, and coordinating application lifecycle operations.

`app.js` is responsible for creating the Express application and registering middleware, API routes, and centralized error handling.

Neither file should contain feature-specific business logic or SQL queries.

The application must be structured so that routes and services can be tested without unnecessarily starting the production HTTP listener.

### 7.4 Routes

Each feature must define its own routes when it exposes HTTP endpoints.

Examples:

- `modules/identities/identity.routes.js`
- `modules/applications/application.routes.js`
- `modules/accounts/account.routes.js`
- `modules/risk/risk.routes.js`

Routes must map HTTP methods and paths to the appropriate middleware and controller functions.

Routes must not contain SQL queries or complex business logic.

A central route registry may mount feature routers under a versioned prefix such as `/api/v1`.

### 7.5 Controllers

Controllers translate HTTP requests into application operations and translate results into HTTP responses.

Controllers may:

- Read validated request parameters and bodies.
- Obtain authenticated-user context.
- Call service functions.
- Set HTTP status codes.
- Return consistent JSON responses.
- Forward errors to centralized error handling.

Controllers must not directly execute database queries or implement complex identity matching and risk calculations.

### 7.6 Services

Services contain the business logic of the application.

Examples include:

- Creating and retrieving identities.
- Coordinating account relationships.
- Normalizing imported records.
- Resolving identities using documented matching rules.
- Coordinating ingestion workflows.
- Evaluating risk rules.
- Managing risk-finding lifecycle operations.

Services must not depend unnecessarily on Express request and response objects.

Business logic should be testable independently of the HTTP layer.

### 7.7 Models and Domain Entities

Models represent the domain concepts and data shapes used by the application.

Examples include:

- Identity
- Application
- Account
- Entitlement
- RiskFinding

Because the project uses PostgreSQL and the `pg` library, models are not automatically ORM schemas.

Use explicit SQL migrations to define database tables, constraints, indexes, and relationships.

Domain entities may be represented using plain JavaScript objects and validation schemas. Do not introduce an ORM unless a documented requirement justifies the change.

### 7.8 Repositories and Data Access

Repositories encapsulate database access for individual features.

Examples:

- `identity.repository.js`
- `application.repository.js`
- `account.repository.js`
- `risk.repository.js`

Repositories must:

- Use parameterized SQL queries.
- Map database results to the expected application data shapes.
- Keep SQL separate from HTTP controllers.
- Support transaction-aware operations where necessary.
- Avoid exposing database connection details to unrelated modules.

A repository should not duplicate business rules that belong in a service.

### 7.9 Validation

Each feature should define request validation schemas where appropriate.

Examples:

- `identity.validation.js`
- `account.validation.js`
- `risk.validation.js`

Validate path parameters, query parameters, request bodies, and imported external data.

Validation schemas must enforce documented types, allowed values, and reasonable input limits.

Request validation does not replace authentication, authorization, or database constraints.

### 7.10 Middleware

Shared Express middleware belongs in `src/middlewares/`.

Examples include:

- Authentication middleware.
- Authorization middleware.
- Request validation middleware.
- Request correlation identifiers.
- Rate limiting where appropriate.
- Centralized error handling.

Middleware must remain focused on cross-cutting HTTP concerns rather than implementing feature-specific business workflows.

### 7.11 Helpers and Utilities

Shared helpers belong in `src/helpers/` only when they are genuinely reusable across multiple modules.

Examples include:

- Common formatting functions.
- Safe serialization utilities.
- Small reusable data transformations.

Feature-specific logic must remain within the relevant feature module.

Do not use a generic helpers folder as a dumping ground for business logic.

### 7.12 Feature Module Template

A typical feature module may use:

modules/<feature>/
- <feature>.routes.js
- <feature>.controller.js
- <feature>.service.js
- <feature>.model.js
- <feature>.validation.js
- <feature>.repository.js
- <feature>.constants.js
- index.js

Only create files that have a meaningful responsibility.

Small modules may omit unnecessary layers. Larger modules may introduce subdirectories such as `rules/`, `connectors/`, or `mappers/` when complexity justifies them.

The goal is clear separation of concerns, not maximizing the number of files.

### 7.13 Dependency Direction

The normal dependency flow is:

Routes → Controllers → Services → Repositories → Database

Validation schemas and shared domain definitions may be used by the appropriate layers.

The service layer must not depend on Express controllers. Repositories must not depend on HTTP request or response objects.

Feature modules should avoid importing each other's internal implementation files. Expose intentional public interfaces where cross-module communication is needed.

Avoid circular dependencies.

### 7.14 Error Handling

Use a centralized error-handling strategy for HTTP errors.

Services should report meaningful application errors without constructing Express responses.

Controllers and middleware should translate those errors into consistent HTTP status codes and response formats.

Database errors must not expose raw SQL, credentials, connection strings, or sensitive internal details to clients.

### 7.15 Testing Requirements

- Unit-test service logic independently.
- Test validation schemas for accepted and rejected input.
- Test repositories against an appropriate test database.
- Test HTTP routes and controllers using API integration tests.
- Test cross-module workflows where behavior spans several features.
- Test authorization boundaries and failure handling.

New feature modules must include appropriate tests for their complexity and risk.

### 7.16 AI Coding Agent Requirements

Before implementing a backend feature, the coding agent must:

1. Identify the relevant feature module.
2. Inspect the existing conventions and neighboring modules.
3. Assign responsibilities to routes, controllers, services, models, validation, and repositories.
4. Avoid placing SQL or business logic in controllers.
5. Avoid unnecessary layers and empty placeholder files.
6. Preserve existing working functionality.
7. Add or update relevant tests.
8. Update documentation when a module's responsibilities or public interfaces change.

Any deviation from this architecture must be justified by a concrete requirement and documented before significant implementation changes.