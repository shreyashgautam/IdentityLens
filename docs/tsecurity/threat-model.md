# IVIP Mini — Security Threat Model

## 1. Purpose

This document identifies potential security threats to IVIP Mini, evaluates their possible impact, and defines the controls and tests needed to reduce those risks.

It is a design and risk-management document. Listing a control here does not mean the control has already been implemented or verified.

This threat model must remain consistent with:

- `README.md`
- `docs/architecture.md`
- `docs/data-model.md`
- `docs/api-contract.md`
- `security/secure-development.md`
- `ai/agent-policy.md`
- `ai/ai-features.md`

## 2. Project Scope

IVIP Mini is an independent learning project for exploring identity inventory, application accounts, access relationships, and deterministic risk detection.

The initial system consists of:

- React and TypeScript frontend
- Node.js and Express backend
- PostgreSQL database
- REST API with request validation
- Authentication and authorization
- Identity and account management
- Entitlement assignments
- Deterministic risk evaluation
- Background processing as required
- Optional AI-assisted explanations in a later phase

Synthetic data is used during initial development.

The system must not connect to real enterprise identity sources or process real organizational identity data without an explicitly reviewed security design.

The project is not an implementation of any company's proprietary internal architecture.

## 3. Security Objectives

The primary security objectives are:

1. Confidentiality: prevent unauthorized access to identity, account, permission, and risk data.
2. Integrity: prevent unauthorized changes to records, identity relationships, entitlements, and risk findings.
3. Availability: keep the API and database usable during failures and abusive traffic.
4. Authentication: verify the identity of users and service clients.
5. Authorization: ensure callers can perform only permitted actions on permitted resources.
6. Accountability: record important security-relevant actions.
7. Privacy: minimize unnecessary collection, retention, and exposure of personal information.
8. Recoverability: restore service and data after a failure or security incident.
9. Explainability: preserve evidence supporting deterministic risk findings.
10. Safe AI usage: prevent AI features from bypassing authorization or independently performing sensitive operations.

## 4. Assets to Protect

| Asset | Security importance |
|---|---|
| User credentials | Account takeover prevention |
| Access tokens and sessions | Prevent impersonation |
| Password-reset tokens | Prevent unauthorized password changes |
| Identity records | Protect identity information and ownership |
| Application accounts | Protect account inventory and account relationships |
| Entitlements | Prevent unauthorized access changes |
| Risk findings | Protect investigation information and finding integrity |
| PostgreSQL database | Protect confidentiality and integrity of stored records |
| Database credentials | Prevent unauthorized database access |
| API configuration and secrets | Prevent service compromise |
| Audit logs | Preserve accountability and investigation evidence |
| Background tasks | Prevent duplicate, unauthorized, or resource-exhausting work |
| AI prompts and responses | Prevent data leakage and unsafe actions |
| Source data and import records | Preserve provenance and prevent malicious or incorrect imports |
| Backups | Prevent data loss and unauthorized disclosure |

Credentials, reset tokens, database secrets, and other authentication material must never be exposed in ordinary API responses or logs.

## 5. Threat Actors

The following actors are considered during threat analysis.

### 5.1 Unauthenticated external user

An individual who can reach a publicly exposed endpoint without having an account.

Potential actions include:

- Repeated login attempts
- Password-reset abuse
- Automated signup attempts
- Resource enumeration
- Request flooding
- Input manipulation

### 5.2 Authenticated standard user

A legitimate user who attempts to access information or operations beyond their permissions.

Potential actions include:

- Changing resource IDs in API requests
- Accessing other users' records
- Attempting to reach admin endpoints
- Manipulating request bodies
- Repeating sensitive operations

### 5.3 Compromised account

An attacker using a legitimate user's stolen credentials, session, or token.

Potential actions include unauthorized reads, modifications, and privilege-escalation attempts.

### 5.4 Malicious or compromised administrator

An administrator whose credentials or account have been compromised, or an authorized administrator who misuses privileges.

Administrative access must not eliminate the need for audit logging, least privilege, and sensitive-operation safeguards.

### 5.5 Malicious or incorrect data source

An external integration or import source that supplies malformed, misleading, duplicate, or hostile data.

The system must validate imported data even when the source is normally trusted.

### 5.6 Accidental internal error

A developer, operator, or automated agent may accidentally expose secrets, remove important data, introduce a vulnerable dependency, or weaken authorization.

The threat model must account for both malicious attacks and accidental failures.

## 6. System Architecture and Trust Boundaries

The application contains the following logical components:

1. Frontend: React and TypeScript.
2. Backend: Express routes, middleware, controllers, services, and repositories.
3. Database: PostgreSQL.
4. Background processing: task execution and status tracking, when implemented.
5. External integrations: future identity sources and other approved services.
6. Optional AI service: future explanation and summarization capabilities.

### Trust boundaries

**Boundary A — Browser to API**

All incoming requests must be treated as untrusted, even if they originate from the application's own frontend.

**Boundary B — API to database**

The backend must validate inputs, enforce authorization, and use parameterized SQL.

The frontend must never connect directly to PostgreSQL.

**Boundary C — Application to external services**

Future integrations must use approved credentials, secure connections, limited permissions, and validated responses.

**Boundary D — User to administrative functionality**

Admin-only functionality must be protected by backend authorization checks, not just frontend navigation rules.

**Boundary E — AI service boundary**

AI providers must receive only the minimum necessary information. AI-generated output must not be trusted as executable instructions or authorization decisions.

## 7. Threat Identification Method

IVIP Mini uses STRIDE as the initial technical threat-identification framework.

STRIDE covers:

- Spoofing
- Tampering
- Repudiation
- Information disclosure
- Denial of service
- Elevation of privilege

Each threat must be associated with:

- A unique threat ID
- Affected component or asset
- Threat scenario
- Potential impact
- Initial risk rating
- Required mitigations
- Verification tests
- Current implementation status

The threat model must be reviewed whenever a new trust boundary, sensitive feature, integration, or authorization mechanism is introduced.

## 8. Risk Assessment Method

Use a simple qualitative risk matrix during initial development.

### Likelihood

| Rating | Meaning |
|---|---|
| Low | Requires unusual conditions or has limited exposure |
| Medium | Plausible under normal usage or through a realistic attack path |
| High | Easily attempted, exposed, or likely to occur without additional controls |

### Impact

| Rating | Meaning |
|---|---|
| Low | Limited and recoverable effect |
| Medium | Meaningful disruption or exposure of a limited amount of information |
| High | Significant data exposure, unauthorized access, service disruption, or integrity loss |

### Risk levels

| Likelihood | Impact | Risk |
|---|---|---|
| Low | Low | Low |
| Low | Medium | Low |
| Medium | Medium | Medium |
| High | Medium | High |
| Medium | High | High |
| High | High | Critical |

Use engineering judgment for combinations not explicitly listed.

Risk ratings are provisional design assessments, not measured probabilities. Reassess them after implementation and testing.

A critical or high risk must not be silently accepted. It requires mitigation or an explicitly documented decision by the responsible project owner.

## 9. Threat Register

The following threats are relevant to the planned architecture. Their ratings represent initial design priorities and must be revisited as the implementation develops.

### T-01: Account takeover

**Affected assets:** User accounts, sessions, identity data.

**Scenario:** An attacker steals credentials, guesses a password, or abuses an authentication weakness.

**Initial risk:** Critical.

**Required controls:**

- Secure password hashing.
- Strong password-reset token generation.
- Short-lived, single-use reset tokens.
- Rate limiting for login and password recovery.
- Secure session or token handling.
- Session revocation after sensitive account changes where appropriate.
- MFA for administrative accounts where feasible.
- Generic authentication error messages.

**Verification:**

- Invalid credentials do not authenticate.
- Expired or revoked tokens are rejected.
- Password-reset tokens cannot be reused.
- Authentication endpoints enforce rate limits.

### T-02: Broken access control and IDOR

**Affected assets:** Identities, accounts, applications, entitlements, risk findings.

**Scenario:** A user changes a resource ID and reads or modifies a resource they are not authorized to access.

**Initial risk:** Critical.

**Required controls:**

- Backend authorization on every protected endpoint.
- ACL/RBAC policies.
- Resource-level permission checks.
- Deny-by-default authorization.
- Tenant and ownership checks where applicable.
- No reliance on frontend visibility or route protection.

**Verification:**

- A standard user cannot access admin-only routes.
- A user cannot access restricted resources by changing an ID.
- Unauthorized update and delete attempts fail safely.

### T-03: Privilege escalation

**Affected assets:** Administrative operations, user roles, access policies.

**Scenario:** A user changes a role field, tampers with a token, or invokes an administrative endpoint directly.

**Initial risk:** Critical.

**Required controls:**

- Server-controlled role assignment.
- Strict token validation.
- Separate authorization policies for administrative actions.
- Explicit approval for privileged account creation or promotion.
- Security tests for role manipulation.

**Verification:**

- Request-body role changes cannot grant privileges.
- Invalid or tampered tokens are rejected.
- Standard users cannot invoke protected administrative operations.

### T-04: SQL injection

**Affected assets:** PostgreSQL data and database availability.

**Scenario:** Malicious input changes the meaning of a database query.

**Initial risk:** High.

**Required controls:**

- Parameterized SQL through `pg`.
- No direct interpolation of untrusted values into SQL.
- Allowlisted sorting columns.
- Validation of filters and query parameters.
- Restricted database privileges.

**Verification:**

- Injection-style test inputs are treated as data.
- Sorting and filtering reject unsupported fields.
- Database access follows the repository architecture.

### T-05: Sensitive data exposure

**Affected assets:** Identity records, account data, risk evidence.

**Scenario:** An API returns records, fields, or error details that the caller should not receive.

**Initial risk:** High.

**Required controls:**

- Response schemas that expose only approved fields.
- Authorization checks before retrieving protected data.
- No secrets in ordinary API responses.
- Safe error messages.
- Data minimization.
- HTTPS with TLS in deployed environments.

**Verification:**

- Responses do not contain passwords, reset tokens, or database secrets.
- Unauthorized users cannot retrieve restricted identity data.
- Error responses do not contain stack traces or SQL details.

### T-06: Cross-origin abuse and insecure transport

**Affected assets:** User sessions and API traffic.

**Scenario:** An overly permissive CORS configuration or insecure connection exposes the application to avoidable risks.

**Initial risk:** High.

**Required controls:**

- Explicit allowed-origin configuration.
- Appropriate credentials and preflight settings.
- HTTPS and supported TLS configurations in production.
- Secure cookies where cookie-based authentication is used.
- Suitable security headers.
- CSRF protection when required by the chosen cookie-based authentication design.

**Verification:**

- Unapproved origins are not granted the configured CORS permissions.
- Production traffic uses HTTPS.
- Cookie and CSRF controls match the authentication mechanism.

CORS is not a replacement for authentication or authorization.

### T-07: Denial of service and resource exhaustion

**Affected assets:** API availability, database, background workers.

**Scenario:** An attacker sends excessive requests, expensive queries, oversized bodies, or many concurrent jobs.

**Initial risk:** High.

**Required controls:**

- Rate limiting for every API.
- Stricter limits for authentication and expensive operations.
- Throttling and concurrency limits.
- Request-size limits.
- Database query timeouts.
- Bounded background queues.
- IP denylisting where justified.
- Monitoring and alerting.

**Verification:**

- Requests exceeding configured limits receive `429 Too Many Requests`.
- Oversized bodies are rejected.
- Expensive operations have defined execution limits.
- IP blocking does not trust arbitrary forwarding headers.

### T-08: Brute force and password-recovery abuse

**Affected assets:** User accounts and recovery workflows.

**Scenario:** An attacker repeatedly attempts logins or floods password-reset requests.

**Initial risk:** High.

**Required controls:**

- Endpoint-specific rate limits.
- Generic recovery responses that do not reveal account existence.
- Secure single-use reset tokens.
- Expiration and invalidation rules.
- Appropriate account and IP abuse detection.
- Safe security logging.

**Verification:**

- Recovery responses do not disclose whether an account exists.
- Expired and consumed tokens are rejected.
- Repeated requests cannot create unbounded recovery work.

### T-09: Malicious or incorrect source records

**Affected assets:** Identity accuracy, account relationships, risk findings.

**Scenario:** Imported data contains malformed fields, conflicting identifiers, or misleading identity information.

**Initial risk:** High.

**Required controls:**

- Validate imported data.
- Normalize only documented fields.
- Preserve source identifiers.
- Use unique constraints for source account identity.
- Keep uncertain identity matches unresolved.
- Record import failures and relevant provenance.
- Avoid destructive actions based only on a missing record in one import.

**Verification:**

- Duplicate imports do not create duplicate accounts.
- Invalid source records are rejected or quarantined.
- Uncertain identity matches are not automatically merged.

### T-10: Identity misassociation

**Affected assets:** Identity records, account ownership, risk findings.

**Scenario:** Two different people or entities are incorrectly linked because their names or other attributes look similar.

**Initial risk:** High.

**Required controls:**

- Deterministic, documented matching rules.
- Sufficient matching evidence.
- Explicit handling of ambiguous matches.
- Reviewable identity-link changes.
- Tests for duplicate names and conflicting identifiers.

**Verification:**

- Similar names alone do not merge identities.
- Uncertain accounts remain unresolved.
- Identity-link changes are validated and auditable.

### T-11: Entitlement tampering

**Affected assets:** Access assignments and privilege information.

**Scenario:** A caller assigns an entitlement to an unauthorized account or creates an invalid cross-application relationship.

**Initial risk:** High.

**Required controls:**

- Authorization for entitlement changes.
- Foreign keys and unique constraints.
- Application-consistency validation.
- Transactional assignment updates.
- Audit logging for sensitive changes.

**Verification:**

- Cross-application assignments are rejected.
- Unauthorized callers cannot change assignments.
- Duplicate assignments do not create duplicate rows.

### T-12: Duplicate operations and race conditions

**Affected assets:** Accounts, entitlement assignments, background jobs.

**Scenario:** Retries or concurrent requests create duplicate records or execute a sensitive operation multiple times.

**Initial risk:** Medium to High.

**Required controls:**

- Unique database constraints.
- Transactions for multi-step changes.
- Idempotency keys for selected retryable POST operations.
- Atomic task creation and deduplication.
- Documented duplicate-handling behavior.

**Verification:**

- Repeated ingestion does not duplicate source accounts.
- Concurrent requests cannot bypass uniqueness constraints.
- Repeated task submissions with the same supported idempotency key do not start duplicate jobs.

### T-13: Audit log tampering or repudiation

**Affected assets:** Audit evidence and incident investigations.

**Scenario:** A privileged user alters or deletes evidence of a sensitive operation, or important actions are never recorded.

**Initial risk:** Medium to High.

**Required controls:**

- Structured audit events.
- Actor, action, target, timestamp, and outcome fields where applicable.
- Restricted access to audit records.
- No logging of credentials or tokens.
- Protection against unauthorized log modification.
- Defined retention and access policies.

**Verification:**

- Sensitive actions produce the expected audit events.
- Ordinary application users cannot modify audit records.
- Logs do not contain authentication secrets.

### T-14: Background task abuse

**Affected assets:** Worker capacity, database, task results.

**Scenario:** A caller submits many expensive tasks, guesses another task ID, or repeatedly triggers the same operation.

**Initial risk:** High.

**Required controls:**

- Authorization for task creation and status retrieval.
- Rate limits and concurrency limits.
- Bounded queues.
- Idempotent task initiation where supported.
- Task ownership or permission checks.
- Safe failure reporting.
- Resource and execution time limits.

**Verification:**

- Unauthorized users cannot retrieve other users' task details.
- Duplicate submissions are handled according to the idempotency contract.
- Failed tasks do not expose stack traces or secrets.

### T-15: Dependency and supply-chain compromise

**Affected assets:** Frontend, backend, build environment, secrets.

**Scenario:** A vulnerable or malicious package introduces unauthorized behavior or exposes credentials.

**Initial risk:** Medium to High.

**Required controls:**

- Minimize unnecessary dependencies.
- Review dependency changes.
- Maintain lockfiles.
- Run appropriate dependency vulnerability checks.
- Keep runtime and packages updated.
- Avoid installing untrusted packages automatically.
- Review changes produced by AI coding agents.

**Verification:**

- Dependency checks are performed at appropriate milestones.
- Unexpected dependency additions are reviewed.
- Builds do not require secrets to be committed into source control.

### T-16: Secret leakage

**Affected assets:** Database credentials, authentication keys, API credentials.

**Scenario:** Secrets are committed to Git, printed in logs, or exposed in frontend bundles.

**Initial risk:** High.

**Required controls:**

- Environment variables or an approved secret manager.
- `.env` exclusion from version control.
- Sanitized `.env.example`.
- Startup validation of required configuration.
- Secret scanning where practical.
- Secret rotation and revocation procedures.

**Verification:**

- Repository scans do not reveal committed credentials.
- Frontend bundles contain no server-side secrets.
- Logs and error responses do not expose secrets.

### T-17: AI prompt injection and unsafe AI actions

**Affected assets:** Identity data, risk evidence, application integrity.

**Scenario:** Malicious text in a record or document attempts to manipulate an AI explanation feature into revealing data or performing unauthorized actions.

**Initial risk:** Medium to High when AI features are introduced.

**Required controls:**

- Treat retrieved content as untrusted data.
- Minimize data sent to AI providers.
- Keep authorization enforcement outside the AI model.
- Prevent AI from directly executing SQL.
- Do not grant AI unrestricted tool access.
- Require validation and human approval for sensitive changes.
- Treat generated explanations as untrusted output.
- Document provider retention and data-handling assumptions.

**Verification:**

- Malicious record content cannot bypass application authorization.
- AI output cannot directly change permissions or delete records.
- AI explanations do not receive unrelated sensitive data.

This threat is future-facing until the corresponding AI feature is implemented.

### T-18: Database loss or corruption

**Affected assets:** Persistent identity inventory and application state.

**Scenario:** An accidental migration, hardware failure, or unauthorized change damages stored records.

**Initial risk:** Medium to High.

**Required controls:**

- Versioned database migrations.
- Foreign keys and integrity constraints.
- Transactions for multi-record changes.
- Backups when the data warrants them.
- Documented restoration procedures.
- Restricted database permissions.
- Migration testing against a non-production database.

**Verification:**

- Migrations can be tested safely before deployment.
- Recovery procedures are exercised when backups are introduced.
- Referential integrity violations are detected or rejected.

## 10. Data Classification and Handling

Treat data according to its sensitivity.

### Public or low sensitivity

Examples:

- Public project documentation
- Non-sensitive API documentation
- Synthetic example records

### Internal application data

Examples:

- Synthetic identities and accounts
- Internal application metadata
- Non-sensitive operational information

### Sensitive security data

Examples:

- Identity-to-account mappings
- Entitlement assignments
- Risk findings and investigation evidence
- Audit records
- User session information

### Secrets

Examples:

- Passwords
- Reset tokens
- Authentication signing keys
- Database credentials
- External API credentials

Secrets require the strictest handling. They must not be stored in ordinary identity tables, included in API responses, or written to logs.

Data collection, retention, and sharing must be reviewed before the system processes real organizational records.

## 11. Authentication and Authorization Requirements

The system must:

- Authenticate callers before allowing protected operations.
- Authorize every protected request on the backend.
- Apply ACL/RBAC policies consistently.
- Deny access by default.
- Prevent users from assigning themselves privileged roles.
- Protect administrator routes.
- Use secure session or token handling.
- Implement login, logout, refresh, forgot-password, and reset-password flows according to the API contract.
- Rate-limit authentication and recovery endpoints.
- Record relevant security events without recording credentials.
- Apply additional safeguards to sensitive administrative actions.

CORS, hidden frontend controls, and unguessable UUIDs do not replace authorization.

## 12. API Security Requirements

Every API must follow `docs/api-contract.md`.

Required protections include:

- Zod request validation
- Parameterized SQL
- Consistent HTTP status codes
- Safe error responses
- Rate limiting
- Appropriate throttling
- Request-size limits
- Explicit CORS configuration
- HTTPS and TLS in production
- Security headers
- Authentication and authorization where required
- Pagination and bounded query behavior
- Idempotency and duplicate-handling controls
- Request correlation IDs
- Appropriate audit logging

Long-running operations must use the documented background task design.

Do not claim a task is queued unless it has actually been accepted by reliable task infrastructure.

## 13. Database Security Requirements

The PostgreSQL layer must:

- Use parameterized queries.
- Enforce primary keys, foreign keys, and unique constraints.
- Restrict database credentials to required permissions.
- Avoid using superuser credentials for routine application access.
- Keep database connection settings out of source control.
- Protect sensitive records through backend authorization.
- Use transactions for multi-step operations.
- Apply schema changes through versioned migrations.
- Avoid returning raw database errors to clients.
- Define backup and recovery expectations before storing important real data.

Repositories must be the designated data-access layer.

## 14. Frontend Security Requirements

The React frontend must:

- Avoid storing secrets in source code or browser bundles.
- Avoid rendering untrusted HTML without appropriate sanitization.
- Avoid trusting client-side role information as authorization.
- Handle expired sessions safely.
- Avoid leaking tokens through URLs, logs, or analytics.
- Display safe error messages.
- Use secure authentication patterns appropriate to the application.
- Request only the data required for the current view.

Frontend route guards are a usability feature, not a substitute for backend access control.

## 15. AI Security Boundaries

AI features are optional and must be added only after the core system works safely.

AI may explain existing findings or summarize approved evidence.

AI must not independently:

- Change identity ownership.
- Merge identities.
- Grant or revoke entitlements.
- Change risk severity.
- Resolve or dismiss findings without the approved workflow.
- Execute arbitrary SQL.
- Bypass authentication or authorization.
- Initiate destructive operations without required safeguards.

All AI inputs must follow data-minimization rules.

All generated content must be treated as untrusted until validated.

## 16. Incident Response

The project should define a basic response process for a suspected security incident.

1. Identify the affected component and suspected exposure.
2. Limit further damage, for example by revoking compromised credentials or disabling an affected endpoint.
3. Preserve relevant logs and evidence.
4. Assess which records, accounts, or services may have been affected.
5. Rotate or revoke exposed secrets as appropriate.
6. Restore affected data or service from trusted sources when necessary.
7. Fix the underlying weakness and add regression tests.
8. Document the incident, response, and remaining risks.

Do not delete relevant evidence during an investigation.

Incident-response procedures must be adapted to the actual deployment environment and data sensitivity.

## 17. Security Verification Checklist

Before considering a security-sensitive feature complete, verify the applicable items below.

### Authentication

- [ ] Passwords are securely hashed.
- [ ] Reset tokens are short-lived and single-use.
- [ ] Login and recovery endpoints are rate-limited.
- [ ] Expired and revoked sessions are rejected.
- [ ] Authentication errors do not reveal account existence unnecessarily.

### Authorization

- [ ] Every protected route has an authorization policy.
- [ ] Resource-level access is checked.
- [ ] Standard users cannot access administrator functionality.
- [ ] Role changes cannot be performed through unauthorized request fields.
- [ ] Unauthorized task and record access is rejected.

### API and infrastructure

- [ ] Request bodies and query parameters are validated.
- [ ] Rate limiting and throttling are configured.
- [ ] CORS permits only approved origins.
- [ ] Production traffic uses HTTPS and supported TLS.
- [ ] Error responses do not expose internal implementation details.
- [ ] SQL uses parameterized queries.

### Data integrity

- [ ] Foreign keys and unique constraints are enforced.
- [ ] Repeated imports do not create duplicate source accounts.
- [ ] Identity matching is deterministic and testable.
- [ ] Entitlement relationships are validated.
- [ ] Multi-record operations use appropriate transactions.

### Operations and AI

- [ ] Background tasks enforce authorization and resource limits.
- [ ] Audit events are recorded for sensitive operations.
- [ ] Secrets are excluded from source control and logs.
- [ ] AI cannot bypass authorization or execute unrestricted database actions.
- [ ] Relevant tests have been run and their results documented.

A checked item must be supported by implementation or test evidence. Do not mark a control as complete merely because it appears in this document.

## 18. Assumptions and Limitations

This threat model describes the planned IVIP Mini architecture and is not a certification of security.

The initial assumptions are:

- Synthetic data is used during early development.
- PostgreSQL is the primary database.
- The backend is a modular monolith.
- External identity integrations are not enabled by default.
- AI features are optional and non-authoritative.
- Authentication, authorization, and infrastructure controls may be implemented incrementally.

Actual risk depends on the deployed configuration, code, operational practices, and data being processed.

Before a public or production deployment, review the threat model against the implemented architecture and perform appropriate security testing.

## 19. Maintenance and Review

Update this document when:

- A new API or privileged operation is introduced.
- Authentication or authorization changes.
- A new database or external integration is added.
- Background processing is introduced.
- AI gains access to new data or tools.
- New types of sensitive data are collected.
- A security issue or incident reveals a previously unrecognized threat.
- A major architecture or deployment change occurs.

Each high-risk finding should have a tracked remediation task, an owner, and a verification method.

Any accepted residual risk must be documented with a reason, an accountable owner, and a review point.

## 20. Definition of Done

The threat model is ready for implementation planning when:

- System assets and trust boundaries are identified.
- Relevant threat actors are documented.
- Major threats have unique IDs.
- Initial likelihood and impact assessments are recorded.
- Mitigations are linked to implementation requirements.
- Security tests are defined.
- Future-facing risks are distinguished from implemented features.
- The document is consistent with the architecture and API contract.

The threat model must evolve alongside the codebase. It is a living engineering document, not a one-time checklist.