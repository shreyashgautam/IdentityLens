# IVIP Mini — Secure Development Standards

## 1. Purpose

This document defines the security requirements for designing, implementing, testing, reviewing, and deploying IVIP Mini.

It translates the risks identified in `security/threat-model.md` into actionable engineering standards.

These requirements apply to:

- Frontend code
- Backend routes, controllers, services, and repositories
- Authentication and authorization
- PostgreSQL schemas and migrations
- External integrations
- Background jobs
- Logging and monitoring
- Optional AI features
- Development and production configuration
- AI-generated code

The document is a mandatory engineering specification. A requirement must not be considered implemented until the corresponding code and verification evidence exist.

## 2. Security Principles

All development must follow these principles:

1. Secure defaults: deny access unless permission is explicitly granted.
2. Least privilege: grant users, services, and database connections only the permissions they require.
3. Defense in depth: do not rely on a single security control.
4. Explicit trust boundaries: treat browser input, imported records, external responses, and AI output as untrusted.
5. Data minimization: collect, return, log, and transmit only necessary data.
6. Fail safely: unexpected errors must not expose sensitive information or grant additional access.
7. Traceability: security-relevant actions must be auditable.
8. Testability: important security requirements must have automated verification where practical.
9. Incremental implementation: build and verify security controls alongside features.
10. No false assurance: never claim a control works without appropriate evidence.

## 3. Secure Development Workflow

Before implementing a feature, the developer or coding agent must:

1. Read the relevant architecture, data model, API contract, and security documents.
2. Inspect the existing implementation.
3. Identify affected assets and trust boundaries.
4. Identify relevant threats and required controls.
5. Propose a small implementation plan.
6. Identify files to create or modify.
7. Define tests and verification commands.
8. Implement only the approved scope.
9. Run relevant tests and inspect the resulting changes.
10. Update documentation when behavior or architecture changes.

Do not weaken an existing security control merely to make a test pass or speed up development.

Destructive operations, credential changes, production migrations, and security-policy changes require explicit review.

## 4. Secrets and Environment Configuration

### 4.1 Secret handling

Never commit:

- Database passwords
- Production API keys
- Authentication signing keys
- Session secrets
- Password-reset tokens
- Private keys
- External integration credentials
- Cloud credentials

Requirements:

- Keep `.env` files out of version control.
- Maintain a sanitized `.env.example`.
- Never place server-side secrets in frontend environment variables or browser bundles.
- Use a managed secret store for production when available.
- Rotate credentials if exposure is suspected.
- Do not print secrets in logs or error messages.
- Avoid placing secrets in URLs, screenshots, issue reports, or test fixtures.

### 4.2 Configuration validation

Validate required environment variables during application startup.

The application must fail safely if essential production security configuration is missing or invalid.

Do not silently fall back to insecure production settings.

Development-only exceptions must be explicit and must not be enabled automatically in production.

## 5. Authentication Security

### 5.1 Password storage

- Never store plaintext passwords.
- Use an established password-hashing algorithm such as Argon2id or an appropriately configured alternative.
- Use library-supported parameters rather than inventing a custom hashing scheme.
- Never implement custom cryptography.
- Never log submitted passwords or password hashes.

### 5.2 Login

- Validate credentials on the backend.
- Apply strict rate limits.
- Use generic failure messages to reduce account enumeration.
- Validate session or token expiration.
- Prevent invalid or tampered tokens from authenticating.
- Consider additional protections for repeated failed attempts.
- Require MFA for administrative accounts where feasible.

### 5.3 Session and token management

The project must select and document its authentication mechanism before implementation.

For cookie-based sessions:

- Use `HttpOnly` cookies.
- Use `Secure` cookies in production.
- Configure an appropriate `SameSite` policy.
- Implement CSRF protection when required by the chosen design.
- Invalidate sessions on logout.

For token-based authentication:

- Validate signatures, expiry, issuer, and audience where applicable.
- Keep access tokens short-lived.
- Protect refresh tokens.
- Consider rotation and revocation.
- Do not place bearer tokens in URLs.
- Do not assume a JWT is revocable unless the implementation supports revocation or an equivalent control.

Do not combine incompatible cookie and bearer-token assumptions. Document the selected design and apply the corresponding protections.

### 5.4 Signup

- Validate input on the backend.
- Prevent unauthorized assignment of administrative roles.
- Enforce documented account-creation rules.
- Rate-limit registration.
- Avoid exposing sensitive account information.
- Require email verification when configured by the authentication design.

### 5.5 Forgot password and reset password

- Generate cryptographically secure, short-lived, single-use reset tokens.
- Never return reset tokens in API responses.
- Never log reset tokens.
- Store only a protected representation of reset tokens where practical.
- Invalidate a token after successful use.
- Apply rate limits and generic responses.
- Invalidate appropriate existing sessions after a password reset.
- Ensure password changes cannot be performed using expired or consumed tokens.

## 6. Authorization and ACL/RBAC

Authentication alone does not grant access to a resource.

Every protected API must enforce authorization on the backend.

Requirements:

- Deny access by default.
- Define the required permissions for each endpoint.
- Enforce resource-level authorization.
- Validate ownership and tenant boundaries where applicable.
- Prevent insecure direct object reference vulnerabilities.
- Do not trust role values supplied by a client.
- Protect administrator routes and operations.
- Prevent users from granting themselves additional privileges.
- Apply authorization to background tasks and their results.
- Review authorization whenever a route is added or changed.

Frontend route guards improve usability but are not a security boundary.

Tests must verify that unauthorized users cannot read or modify protected resources.

## 7. Input Validation and Output Safety

Use Zod for backend request validation.

Validate:

- Request bodies
- Path parameters
- Query parameters
- UUIDs
- Enum values
- String lengths
- Pagination limits
- Sorting and filtering fields
- Request body sizes
- Supported update fields

Additional requirements:

- Reject malformed JSON.
- Reject unsupported content types where applicable.
- Allowlist sort fields and other query options.
- Treat imported data as untrusted.
- Avoid mass assignment of arbitrary request properties.
- Return only fields approved by the response schema.
- Safely render untrusted text in the frontend.
- Avoid rendering untrusted HTML without an appropriate sanitization strategy.

Validation must occur on the server even when the frontend performs the same checks.

## 8. SQL and Database Security

### 8.1 SQL injection prevention

- Use parameterized SQL queries through `pg`.
- Never interpolate untrusted input directly into SQL.
- Allowlist identifiers that cannot be parameterized, such as sort column names.
- Keep database access inside repositories or approved data-access modules.
- Do not put SQL queries in controllers.
- Avoid exposing raw SQL errors to API clients.

### 8.2 Database permissions

- Use a dedicated application database role.
- Do not use a PostgreSQL superuser for routine application operations.
- Restrict permissions to the required tables and operations.
- Separate migration privileges from runtime privileges where practical.
- Protect database credentials.
- Restrict network access to the database in deployed environments.

### 8.3 Data integrity

Use appropriate:

- Primary keys
- Foreign keys
- Unique constraints
- Check constraints
- Transactions
- Indexes

Application-level validation does not replace database constraints.

### 8.4 Migrations

- Use versioned database migrations.
- Review schema changes before applying them.
- Test migrations against a local or isolated test database.
- Avoid destructive changes without explicit review and a recovery plan.
- Do not maintain conflicting copies of the schema.
- Use backups and tested restoration procedures when handling important data.

## 9. API Security

All endpoints must follow `docs/api-contract.md`.

### 9.1 HTTP and URL conventions

- Use resource-oriented nouns.
- Use consistent plural resource names.
- Use hyphens for multiword URL paths.
- Use nested resources where appropriate.
- Use standard HTTP methods.
- Keep request and response schemas documented.

### 9.2 Rate limiting and throttling

Every API must be covered by an appropriate rate-limiting policy.

Apply stricter policies to:

- Login
- Signup
- Password recovery
- Password reset
- Expensive searches
- Risk evaluations
- Bulk operations

Also apply suitable request-size limits, concurrency limits, database timeouts, and background-job limits.

Use a shared rate-limit store in multi-instance production deployments when required for consistent enforcement.

Return `429 Too Many Requests` when a request limit is exceeded.

### 9.3 IP denylisting

- Support blocking confirmed abusive sources where appropriate.
- Restrict changes to the denylist to authorized operators.
- Record administrative changes.
- Use trusted proxy configuration before interpreting forwarded client IP headers.
- Do not trust arbitrary client-supplied IP headers.
- Review false positives and use temporary blocks when appropriate.

IP blocking complements, but does not replace, rate limiting and authentication.

### 9.4 CORS

- Configure explicit allowed origins.
- Use environment-specific configuration.
- Allow only required methods and headers.
- Configure credential support only when needed.
- Never use an unrestricted wildcard origin with credentialed requests.
- Handle preflight requests correctly.

CORS is not authentication or authorization.

### 9.5 TLS and security headers

- Require HTTPS with supported TLS in production.
- Redirect HTTP to HTTPS where applicable.
- Use suitable security headers, such as those provided by Helmet.
- Configure HSTS after the production HTTPS setup is verified.
- Protect cookies and tokens in transit.
- Avoid sending sensitive information in URLs.

### 9.6 Error handling

- Use centralized error middleware.
- Return documented HTTP status codes.
- Use stable public error codes.
- Provide useful but safe messages.
- Include a request ID where appropriate.
- Never return stack traces, internal controller details, raw SQL errors, secrets, or internal filesystem paths.
- Log diagnostics securely on the server.

### 9.7 Idempotency

- `GET` must not modify state.
- `PUT` should be idempotent.
- `DELETE` must have an idempotent intended effect.
- Design `PATCH` operations to avoid unintended repeated side effects.
- Do not assume `POST` is inherently idempotent.
- Use database constraints and documented duplicate-handling rules.
- Use idempotency keys for selected retryable POST operations where duplicate execution would be harmful.

For ingestion, repeated imports of the same source account must not create duplicate records.

For background jobs, repeated requests using the same supported idempotency key must not start duplicate work.

### 9.8 Long-running operations

- Use asynchronous processing when an operation may take too long for a normal request.
- Return `202 Accepted` only after the task has been accepted for reliable processing.
- Provide a task ID and a status endpoint.
- Return safe progress and estimated completion information when available.
- Check authorization before returning task status or results.
- Do not restart a task merely because its status endpoint is polled again.

## 10. Logging, Auditing, and Monitoring

Use structured logs and request correlation IDs.

Record relevant operational and security events, including:

- Authentication failures
- Authorization failures
- Rate-limit events
- Administrative actions
- Sensitive permission changes
- Risk finding status changes
- Background task outcomes
- Unexpected application errors

Where appropriate, audit records should include:

- Actor
- Action
- Target resource
- Timestamp
- Outcome
- Request or correlation ID

Never log passwords, reset tokens, bearer tokens, database credentials, or unnecessary personal information.

Restrict access to audit logs and define retention policies according to data sensitivity.

Monitoring should detect repeated failures, unusual traffic, service errors, and background task exhaustion.

## 11. Frontend Security

The React frontend must:

- Avoid embedding server secrets in browser code.
- Use the documented authentication mechanism.
- Handle expired sessions safely.
- Avoid exposing access tokens through URLs or logs.
- Avoid trusting client-side role checks.
- Render untrusted text safely.
- Validate user input for usability without treating frontend validation as a security control.
- Avoid requesting or storing unnecessary sensitive information.
- Display safe, understandable error messages.

## 12. Dependency and Supply-Chain Security

- Minimize unnecessary dependencies.
- Review dependency changes.
- Commit and maintain lockfiles.
- Run appropriate dependency vulnerability checks.
- Update vulnerable packages using reviewed changes.
- Avoid installing untrusted packages automatically.
- Review package lifecycle scripts when introducing unfamiliar dependencies.
- Never commit credentials used by build tools or deployment workflows.

AI-generated dependency additions require the same review as manually introduced dependencies.

## 13. AI Coding Agent Rules

Antigravity and other coding agents must:

1. Read the relevant project documentation before implementing a feature.
2. Inspect existing code before modifying it.
3. Identify security implications before changing authentication, authorization, database access, or configuration.
4. Avoid inventing new security architectures without documenting the rationale.
5. Never hardcode real credentials.
6. Never disable security middleware to make an implementation work.
7. Never weaken tests to hide a failure.
8. Avoid destructive database operations without approval.
9. Add or update tests for security-sensitive behavior.
10. Report exactly which checks were run and which passed or failed.
11. Never claim a security control is effective without appropriate evidence.
12. Update the threat model and API contract when approved design changes affect them.

AI-generated code must be reviewed and tested before it is trusted.

## 14. Security Testing

The test suite should cover relevant cases such as:

- Invalid credentials and expired tokens
- Password-reset token reuse
- Unauthorized resource access
- Privilege escalation attempts
- SQL injection inputs
- Invalid request bodies
- Unsupported sorting fields
- Rate-limit enforcement
- CORS configuration
- Duplicate account imports
- Idempotent task initiation
- Cross-application entitlement assignment
- Safe error responses
- Missing environment configuration
- Unauthorized background-task access

Use an isolated test database and synthetic test data.

Do not run destructive tests against production systems.

Security tests should verify observable behavior, not just the presence of a middleware function.

## 15. Secure Deployment Requirements

Before deploying outside local development:

- Configure HTTPS and TLS.
- Restrict CORS to approved frontend origins.
- Configure production secrets securely.
- Disable development-only behavior.
- Enforce authentication and authorization on protected endpoints.
- Configure rate limiting and abuse protections.
- Restrict database network access and permissions.
- Apply security headers.
- Configure safe error handling.
- Verify logging does not expose secrets.
- Review dependencies and runtime versions.
- Apply migrations through a controlled process.
- Establish backup and recovery procedures where required.
- Verify health checks, monitoring, and alerting.
- Perform security and integration tests.
- Document rollback and incident-response procedures.

A deployment must not be considered secure merely because it starts successfully.

## 16. Vulnerability and Incident Handling

When a vulnerability or suspected exposure is identified:

1. Assess the affected assets and potential impact.
2. Contain the issue where necessary.
3. Revoke or rotate compromised credentials.
4. Preserve relevant evidence.
5. Fix the root cause.
6. Add regression tests.
7. Review related code for similar weaknesses.
8. Document the remediation and remaining risk.

Critical and high-risk issues must be prioritized before introducing additional features that depend on the affected component.

## 17. Security Review Checklist

Before marking a feature complete, review the applicable controls.

### Code and architecture

- [ ] Follows the documented module boundaries.
- [ ] Keeps business logic in services.
- [ ] Keeps SQL in repositories.
- [ ] Uses validation schemas.
- [ ] Does not introduce unnecessary dependencies.

### Authentication and access control

- [ ] Authentication is enforced where required.
- [ ] ACL/RBAC authorization is enforced on the backend.
- [ ] Resource ownership and access are checked.
- [ ] Sensitive actions are appropriately audited.

### API and database

- [ ] Requests and responses follow the API contract.
- [ ] Rate limiting and appropriate abuse controls are applied.
- [ ] SQL queries are parameterized.
- [ ] Error responses do not expose internals.
- [ ] Idempotency and duplicate behavior are documented.
- [ ] Database constraints and transactions are used where needed.

### Configuration and deployment

- [ ] Secrets are not committed.
- [ ] CORS uses approved origins.
- [ ] Production traffic uses HTTPS and supported TLS.
- [ ] Security headers are configured appropriately.
- [ ] Production settings are validated.
- [ ] Logs do not expose secrets.

### Testing and verification

- [ ] Relevant tests have been run.
- [ ] Security-sensitive failure cases are tested.
- [ ] Documentation is updated.
- [ ] Verification results are recorded accurately.

## 18. Definition of Done

A feature is ready only when its requirements are clear, its implementation follows the documented architecture, applicable security controls are implemented, relevant tests pass, and the results are reported honestly.

Any security exception must have a documented reason, an accountable owner, and a plan for review or remediation.

This document must evolve with the application. It defines the minimum expected development practices, not a guarantee that the system is invulnerable.
