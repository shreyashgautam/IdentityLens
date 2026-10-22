# IVIP Mini — API Contract

## 1. Purpose

This document defines the API design, implementation, security, and operational requirements for IVIP Mini.

It is the source of truth for implementing backend routes, controllers, services, validation schemas, middleware, and API tests.

Every API must follow the standards defined here unless an explicit, documented exception is approved.

The requirements apply to current and future APIs, including authentication, identities, applications, accounts, entitlements, risk findings, and background tasks.

## 2. Mandatory API Design Principles

Every API must follow these principles:

1. Use resource-oriented REST endpoints.
2. Use nouns rather than action names in resource URLs.
3. Use plural resource names consistently.
4. Use hyphens instead of underscores in URL paths.
5. Use nested resources when a resource belongs to another resource.
6. Use consistent HTTP methods and status codes.
7. Validate all incoming requests on the backend.
8. Return structured, predictable JSON responses.
9. Implement pagination, filtering, and sorting for suitable collection endpoints.
10. Apply rate limiting and abuse protection to every API.
11. Use authentication and endpoint-level authorization.
12. Enforce ACL/RBAC permissions on protected resources.
13. Use HTTPS with TLS in deployed environments.
14. Configure CORS using explicit trusted origins.
15. Use centralized error handling without exposing internal implementation details.
16. Use idempotent behavior where required by HTTP semantics and operation design.
17. Support asynchronous processing for suitable long-running operations.
18. Protect authentication and password-reset workflows against abuse.
19. Record security-relevant actions through appropriate audit logging.
20. Test API behavior, security controls, and failure scenarios.

## 3. Technology and API Base URL

### Backend stack

- Node.js
- Express
- JavaScript initially
- PostgreSQL
- `pg` database client
- Zod request validation

### Frontend stack

- React
- TypeScript
- Vite

### API versioning

Local API base URL:

`http://localhost:5000/api/v1`

In production, APIs must be served through HTTPS, for example:

`https://api.example.com/api/v1`

The production hostname is illustrative and must be configured for the actual deployment.

All application resource endpoints must use the `/api/v1` prefix.

The health endpoint may remain outside the versioned prefix:

`GET /health`

## 4. URL Naming Conventions

### 4.1 Use nouns, not action names

Resource URLs must describe the resource rather than the operation.

Correct:

- `GET /employees`
- `GET /employees/:id`
- `POST /employees`
- `PATCH /employees/:id`

Incorrect:

- `GET /get-employees`
- `POST /create-employee`
- `POST /delete-employee`

The HTTP method communicates the operation.

### 4.2 Use plural resource names

Use a consistent plural naming convention for collections.

Examples:

- `/identities`
- `/applications`
- `/accounts`
- `/entitlements`
- `/risk-findings`
- `/users`

### 4.3 Use hyphens instead of underscores

Correct:

- `/risk-findings`
- `/forgot-password`
- `/reset-password`
- `/background-tasks`

Incorrect:

- `/risk_findings`
- `/forgot_password`
- `/reset_password`

Use camelCase for JavaScript identifiers where appropriate, but use hyphens in multiword URL paths.

### 4.4 Use nested routes for related resources

When accessing a customer's orders, use:

`GET /customers/:customerId/orders`

When accessing an account's entitlements, use:

`GET /accounts/:accountId/entitlements`

When assigning an entitlement to an account, use:

`POST /accounts/:accountId/entitlements`

Nested routes must not bypass authorization checks on the parent resource.

### 4.5 Use HTTP methods consistently

| Method | Intended use |
|---|---|
| `GET` | Retrieve a resource or collection |
| `POST` | Create a resource or initiate an operation |
| `PUT` | Replace a resource or set a resource to a defined state |
| `PATCH` | Partially update a resource |
| `DELETE` | Delete a resource or remove a relationship |

Use `POST` for actions that do not naturally fit ordinary resource CRUD, such as initiating a risk evaluation. Represent long-running operations as task resources.

## 5. Request and Response Standards

### 5.1 Content type

JSON APIs must accept and return JSON where a body is applicable.

Clients sending JSON must use:

`Content-Type: application/json`

Responses containing JSON must use:

`Content-Type: application/json; charset=utf-8`

The backend must reject malformed JSON and unsupported media types with appropriate error responses.

### 5.2 Standard successful response

Single-resource example:

{
  "data": {
    "id": "example-uuid",
    "display_name": "Alice Johnson",
    "identity_type": "human",
    "status": "active"
  },
  "meta": {
    "request_id": "req_example123"
  }
}

Collection example:

{
  "data": [
    {
      "id": "example-uuid",
      "display_name": "Alice Johnson",
      "identity_type": "human",
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  },
  "meta": {
    "request_id": "req_example123"
  }
}

These examples illustrate the intended format. Actual response schemas must use the fields defined for each resource.

### 5.3 Response consistency

- Use consistent field names and data types.
- Use ISO 8601 timestamps in UTC for API timestamps.
- Use stable identifiers for resources.
- Do not expose database internals unnecessarily.
- Do not return passwords, password-reset tokens, access tokens, secrets, or private credentials in ordinary resource responses.
- Do not return database stack traces or raw SQL errors.
- Do not return different response structures for the same endpoint without a documented reason.

### 5.4 Request validation

Use Zod to validate:

- Request bodies
- Path parameters
- Query parameters
- UUIDs
- Enum values
- String lengths
- Pagination limits
- Sorting fields
- Filtering fields
- Request size
- Supported update fields

Reject unknown or unsupported fields according to the endpoint's validation policy.

Frontend validation improves usability but never replaces backend validation.

## 6. Pagination, Filtering, and Sorting

Collection endpoints must support pagination when the result set can grow.

### 6.1 Pagination

Standard parameters:

- `page`: one-based page number; default `1`.
- `limit`: number of records per page; default `20`, maximum `100`.

Example:

`GET /api/v1/identities?page=2&limit=20`

The response must return pagination metadata.

The backend must apply pagination in the database query rather than retrieving every record and slicing the array in application memory.

For large datasets, consider cursor-based pagination where justified.

### 6.2 Filtering

Examples:

`GET /api/v1/identities?status=active`

`GET /api/v1/accounts?application_id=example-uuid`

`GET /api/v1/risk-findings?severity=high&status=open`

Only documented filter fields and values may be accepted.

### 6.3 Sorting

Example:

`GET /api/v1/risk-findings?sort_by=created_at&sort_order=desc`

Supported sorting fields must be explicitly allowlisted.

Never insert arbitrary client-provided column names or SQL fragments into a query.

### 6.4 Search

Example:

`GET /api/v1/identities?search=alice`

Search must have documented matching behavior and appropriate database query limits.

Pagination, filtering, sorting, and search must be tested together to ensure consistent results and reasonable database load.

## 7. Authentication APIs

Authentication routes are part of the API contract and must be implemented before exposing protected functionality to external users.

### 7.1 Signup

`POST /api/v1/auth/signup`

Purpose: Register a new user.

Example request:

{
  "name": "Alice Johnson",
  "email": "alice@example.test",
  "password": "example-password"
}

Rules:

- Validate the name, email, and password.
- Enforce password policy and email normalization.
- Store passwords using an established, secure password-hashing algorithm.
- Never store plaintext passwords.
- Prevent duplicate account registration according to the account identity policy.
- Do not allow public signup to grant administrative privileges.
- Apply strict rate limiting.
- Require email verification if enabled by the authentication design.

Success: `201 Created`.

Never return the submitted password or password hash.

### 7.2 Login

`POST /api/v1/auth/login`

Example request:

{
  "email": "alice@example.test",
  "password": "example-password"
}

Purpose: Authenticate the user.

Success: `200 OK`.

The response may contain the documented session or token information, but never the password or password hash.

Rules:

- Apply strict rate limiting.
- Use generic authentication failure messages.
- Do not reveal whether an email address exists.
- Protect refresh tokens and session credentials.
- Do not log passwords or authentication tokens.
- Require HTTPS in deployed environments.

### 7.3 Refresh token

`POST /api/v1/auth/refresh`

Purpose: Obtain a renewed access token using a valid refresh mechanism.

Rules:

- Validate the refresh token or session.
- Apply token expiration and revocation policies.
- Consider refresh-token rotation and reuse detection.
- Protect refresh credentials from theft.
- Rate-limit the endpoint.

Success: `200 OK`.

### 7.4 Logout

`POST /api/v1/auth/logout`

Purpose: Invalidate the applicable session or refresh-token family.

Rules:

- Revoke the relevant session or refresh credential where applicable.
- Clear secure cookies when cookie-based sessions are used.
- Do not assume that deleting a frontend token invalidates a server-side session.

Success: `204 No Content` when no response body is required.

### 7.5 Forgot password

`POST /api/v1/auth/forgot-password`

Example request:

{
  "email": "alice@example.test"
}

Purpose: Initiate password recovery.

Rules:

- Return a generic response that does not reveal whether the account exists.
- Generate a cryptographically secure, short-lived, single-use reset token.
- Store only a protected representation of the reset token where practical.
- Deliver the reset link through the configured recovery channel.
- Do not return the reset token in the API response.
- Rate-limit by IP and account-related signals.
- Prevent repeated requests from overwhelming the delivery service.
- Never log reset tokens or include them in analytics.

Success: `202 Accepted` may be used when recovery processing is queued. Otherwise, return a consistent success response according to the implementation.

### 7.6 Reset password

`POST /api/v1/auth/reset-password`

Example request:

{
  "token": "example-reset-token",
  "new_password": "example-new-password"
}

Rules:

- Verify that the token exists, is valid, has not expired, and has not been used.
- Consume the token atomically so it cannot be reused.
- Apply the password policy and secure password hashing.
- Invalidate appropriate existing sessions or refresh tokens.
- Never disclose the token in the response or logs.
- Apply strict rate limiting.

Success: `200 OK` or `204 No Content`, according to the documented response contract.

### 7.7 Email verification

If email verification is enabled, implement a separate verification flow using short-lived, single-use verification tokens.

The verification endpoint must not allow a caller to verify another user's email without possession of the appropriate proof.

### 7.8 Authentication middleware

Protected routes must validate the session or access token before executing business logic.

Authentication middleware must:

- Reject missing or invalid credentials with `401 Unauthorized`.
- Verify token signature, expiry, issuer, and audience when applicable.
- Attach a trusted authenticated principal to the request.
- Never trust a user ID or role supplied only in an untrusted request body.
- Support session revocation requirements where applicable.

## 8. Authorization, ACL, and RBAC

Authentication answers: **Who is making the request?**

Authorization answers: **What is that caller allowed to access or change?**

Both are mandatory for protected resources.

### 8.1 Access control

Use a combination of:

- ACL: permissions associated with a particular resource or relationship.
- RBAC: permissions granted through roles such as admin, analyst, or standard user.
- Resource ownership or tenant checks where applicable.

The implementation must choose and document the exact authorization model for each feature.

### 8.2 Example roles

| Role | Intended access |
|---|---|
| Admin | Manage authorized users, applications, configuration, and administrative operations |
| Analyst | Read permitted identities, accounts, and findings; update findings within assigned permissions |
| Standard user | Access only explicitly permitted resources and personal account operations |

These are illustrative roles. Exact permissions must be defined before implementation.

### 8.3 Mandatory rules

- Deny access by default.
- Check authorization on the backend for every protected endpoint.
- Verify resource-level permissions, not just the user's role.
- Prevent insecure direct object reference (IDOR) vulnerabilities.
- Do not rely on frontend route hiding as a security control.
- Prevent ordinary users from accessing admin routes or restricted records.
- Protect sensitive operations such as risk evaluation, user management, and permission changes.
- Prevent privilege escalation through user-editable role fields.
- Apply authorization to nested resources as well as their parent resources.
- Return `403 Forbidden` when a caller is authenticated but lacks permission, unless a documented anti-enumeration policy requires a non-disclosing response.

## 9. Rate Limiting, Throttling, and IP Blocking

**Every API must be covered by rate limiting and abuse protection.** Different endpoints may use different limits according to their risk and resource cost.

### 9.1 Rate limiting

Rate limiting restricts how many requests a caller can make in a defined period.

Apply limits by relevant combinations of:

- IP address
- Authenticated user or API client
- Endpoint or endpoint group
- Authentication failure patterns
- Expensive operations

Illustrative starting policies for local development and later tuning:

| Endpoint category | Example initial policy |
|---|---|
| General read APIs | 100 requests per minute per user or IP |
| Resource creation and updates | 30 requests per minute per user |
| Login | 5 failed attempts per 15 minutes per account/IP policy |
| Signup | 5 requests per hour per IP |
| Forgot/reset password | 3 requests per hour per account/IP policy |
| Risk evaluation | 5 requests per minute per authorized user |

These are starting values, not universal security limits. Tune them using observed traffic, abuse risk, infrastructure capacity, and product requirements.

Rate limiting must account for multiple application instances. Production deployments may need a shared store such as Redis rather than in-memory counters.

### 9.2 Throttling

Throttling controls traffic bursts and protects system resources.

The API should:

- Limit concurrent expensive operations.
- Limit request body sizes.
- Apply database query timeouts where appropriate.
- Limit concurrent background jobs.
- Use backpressure or queueing for expensive work.
- Return `429 Too Many Requests` when a client exceeds its permitted request rate.
- Include `Retry-After` where a retry time is known.

Rate limiting and throttling must not be treated as interchangeable; both should be used where appropriate.

### 9.3 IP blocking and denylisting

The system must support an operational policy for blocking abusive or known malicious IP addresses.

Requirements:

- Support a denylist for confirmed abusive sources.
- Allow authorized operators to add or remove entries.
- Prefer temporary blocks and expiry where appropriate.
- Record administrative changes to block rules.
- Apply blocking before expensive request processing.
- Return an appropriate response without revealing sensitive detection logic.
- Avoid blocking trusted users solely because they share a public IP.
- Consider reverse proxies and trusted proxy configuration before interpreting client IP addresses.
- Never trust arbitrary client-supplied forwarding headers.

IP blocking must complement, not replace, authentication, authorization, and rate limiting.

## 10. CORS and Transport Security

### 10.1 CORS configuration

Configure CORS explicitly in the Express application.

Requirements:

- Allow only approved frontend origins.
- Use environment-specific origin configuration.
- Permit only required HTTP methods and headers.
- Handle preflight requests correctly.
- Enable credentials only when the chosen authentication mechanism requires them.
- Never combine credentialed requests with an unrestricted wildcard origin.
- Do not treat CORS as authentication or authorization.

### 10.2 HTTPS and TLS

Production APIs must be served over HTTPS using supported TLS configurations.

Requirements:

- Use TLS at the trusted ingress, load balancer, or application server.
- Redirect HTTP traffic to HTTPS where applicable.
- Use secure cookies when cookie-based authentication is chosen.
- Apply HSTS after confirming the production HTTPS setup.
- Keep certificates valid and renew them reliably.
- Never transmit passwords, session tokens, or reset tokens over unencrypted production connections.

TLS is the correct term; SSL is obsolete and must not be used as the target protocol.

### 10.3 Security headers

Apply appropriate HTTP security headers, using Helmet or an equivalent reviewed configuration.

Configure headers according to the deployment architecture and avoid blindly applying incompatible policies.

## 11. Idempotency and Duplicate Prevention

Idempotency describes whether repeating an operation produces the same intended state as performing it once.

### 11.1 GET

`GET` must not modify application state.

Repeated identical requests should return the same representation when the underlying data and authorization context have not changed.

### 11.2 PUT

`PUT` should be idempotent: applying the same replacement repeatedly must result in the same resource state.

### 11.3 DELETE

`DELETE` should be idempotent in its intended effect. Repeating deletion must not delete unrelated resources or create additional side effects.

The response status may differ on a repeated request, such as the first request returning success and the next returning `404`, provided the resulting state remains the same.

### 11.4 PATCH

Design `PATCH` operations to avoid unintended repeated side effects.

Setting a status to a specific value is naturally easier to make idempotent than operations such as incrementing a counter.

### 11.5 POST

`POST` is not inherently idempotent.

Repeating a `POST` can create multiple resources or initiate multiple operations. Do not assume that repeating a `POST` automatically produces the same result.

However, the API must still protect against accidental duplicate creation where required.

Use the following safeguards where applicable:

- Database unique constraints
- Duplicate source identifier checks
- Explicit upsert behavior for ingestion
- Idempotency keys for retryable creation or operation requests
- Atomic processing of idempotency records and associated state changes

For example, importing the same application account repeatedly should update the existing account based on its application and external ID instead of inserting duplicates.

For supported idempotency keys, bind the key to the authenticated caller and operation, retain it for a documented period, and reject reuse with a different request payload.

A repeated request with the same key and same payload should return the recorded result or current task state rather than creating duplicate work.

## 12. Asynchronous Processing and Long-Running Operations

Long-running operations must not unnecessarily keep an HTTP request open until the entire job finishes.

Examples include:

- Risk evaluation across a large inventory
- Bulk identity imports
- Synchronization with an external source
- Large report generation

### 12.1 Initiate an operation

Example endpoint:

`POST /api/v1/risk-evaluations`

Example request:

{
  "scope": "all"
}

Example response:

{
  "data": {
    "task_id": "task_example123",
    "status": "queued",
    "message": "Risk evaluation has been accepted.",
    "estimated_completion_seconds": 30
  }
}

Return `202 Accepted` when the operation has been accepted for asynchronous processing but has not completed.

The task ID must refer to a persisted or otherwise reliably tracked task.

The estimated completion time is an estimate, not a guarantee.

### 12.2 Check task status

`GET /api/v1/background-tasks/:taskId`

Example response while running:

{
  "data": {
    "task_id": "task_example123",
    "status": "running",
    "progress_percent": 45,
    "message": "Evaluating identity and account records.",
    "estimated_completion_seconds": 18
  }
}

Supported statuses may include:

- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`

The task-status endpoint should return `200 OK` when the task status is successfully retrieved, even if the task itself is still running.

A `202 Accepted` response is for accepting asynchronous work, not a requirement for every status poll.

### 12.3 Repeated requests

When a client retries the same operation using a supported idempotency key, the backend must not start duplicate work.

The client should poll the existing task using its task ID.

Repeated task-status requests must not restart the operation.

The server must enforce authorization before returning task status or results.

### 12.4 Task failure

Failed tasks must expose a safe, stable error code and a useful summary.

Do not return stack traces, database credentials, raw SQL errors, or internal implementation details.

### 12.5 Initial implementation

Asynchronous task infrastructure may be introduced after the core APIs work.

Do not return `202 Accepted` for an operation that has not actually been queued or accepted for reliable execution.

## 13. Standard Error Handling

All API errors must use a consistent format.

Example:

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "display_name",
        "message": "Display name is required."
      }
    ],
    "request_id": "req_example123"
  }
}

### 13.1 Error response rules

- Return the correct HTTP status code.
- Use stable, documented public error codes.
- Provide a clear, actionable message when safe.
- Include field-level validation details when appropriate.
- Include a request ID for troubleshooting.
- Do not return stack traces.
- Do not expose controller source code, SQL statements, filesystem paths, secrets, or internal infrastructure details.
- Log detailed diagnostics securely on the server.
- Do not disclose whether a user account exists in authentication and recovery flows where that would enable account enumeration.

### 13.2 Common public error codes

| HTTP status | Error code | Meaning |
|---|---|---|
| `400` | `BAD_REQUEST` | Invalid request syntax or parameters |
| `401` | `UNAUTHENTICATED` | Missing or invalid authentication |
| `403` | `FORBIDDEN` | Caller lacks permission |
| `404` | `NOT_FOUND` | Resource unavailable or not found |
| `409` | `RESOURCE_CONFLICT` | Duplicate or conflicting operation |
| `413` | `PAYLOAD_TOO_LARGE` | Request body too large |
| `415` | `UNSUPPORTED_MEDIA_TYPE` | Unsupported content type |
| `422` | `VALIDATION_ERROR` | Valid syntax but invalid input or business state |
| `429` | `RATE_LIMITED` | Request rate exceeded |
| `500` | `INTERNAL_ERROR` | Unexpected server failure |
| `503` | `SERVICE_UNAVAILABLE` | Required service unavailable |

The API must not expose internal exception names or controller-specific implementation codes as public contract details.

## 14. Core IVIP Mini Endpoints

All routes below are relative to `/api/v1`.

### 14.1 Identities

- `GET /identities`
- `GET /identities/:id`
- `POST /identities`
- `PATCH /identities/:id`
- `GET /identities/:id/accounts`

Support documented pagination, filtering, sorting, and search where applicable.

### 14.2 Applications

- `GET /applications`
- `GET /applications/:id`
- `POST /applications`
- `PATCH /applications/:id`
- `GET /applications/:id/accounts`

### 14.3 Accounts

- `GET /accounts`
- `GET /accounts/:id`
- `POST /accounts`
- `PATCH /accounts/:id`
- `GET /accounts/:accountId/entitlements`
- `POST /accounts/:accountId/entitlements`

### 14.4 Entitlements

Entitlement inventory definitions and account-entitlement relationship assignments:

- `GET /api/v1/entitlements`
  - Query parameters: `page` (default 1), `limit` (default 20, max 100), `application_id` (UUID), `type` (`role`, `group`, `permission`, `license`), `is_privileged` (boolean), `search` (case-insensitive ILIKE against name and description), `sort_by` (`name`, `type`, `created_at`, `updated_at`), `sort_order` (`asc`, `desc`, default `asc`).
  - Response: `200 OK` with paginated collection envelope (`data`, `pagination`, `meta`).

- `GET /api/v1/entitlements/:id`
  - Path parameter: `id` (UUID).
  - Response: `200 OK` with single entity envelope (`data`, `meta`), `404 Not Found` if nonexistent, `422 Unprocessable Entity` if malformed UUID.

- `POST /api/v1/entitlements`
  - Request body: `application_id` (UUID), `name` (string, max 255), `type` (enum), `description` (optional string), `is_privileged` (optional boolean, default `false`). Unknown fields rejected.
  - Response: `201 Created` with single entity envelope, `409 Conflict` if `(application_id, name)` already exists, `422 Unprocessable Entity` on validation failure.

- `PATCH /api/v1/entitlements/:id`
  - Path parameter: `id` (UUID).
  - Request body: partial update (`name`, `type`, `description`, `is_privileged`). Unknown fields rejected. Empty body rejected with `400 Bad Request`.
  - Response: `200 OK` with updated entity envelope, `404 Not Found` if nonexistent, `409 Conflict` if new name clashes with existing name in the same application, `422 Unprocessable Entity` on validation failure.

- `GET /api/v1/accounts/:accountId/entitlements`
  - Path parameter: `accountId` (UUID).
  - Query parameters: `page`, `limit`, `type`, `is_privileged`, `sort_by` (`name`, `type`, `assigned_at`), `sort_order`.
  - Response: `200 OK` with paginated list of entitlements assigned to the account (including `assigned_at` and `assigned_by`), `404 Not Found` if account does not exist.

- `POST /api/v1/accounts/:accountId/entitlements`
  - Path parameter: `accountId` (UUID).
  - Request body: `entitlement_id` (UUID), `assigned_by` (optional string, max 255).
  - Transactional consistency: executed in an ACID transaction with row-level locking (`FOR SHARE`) protecting both account and entitlement. Cross-application assignment (`account.application_id !== entitlement.application_id`) is strictly rejected with `422 Unprocessable Entity`. Duplicate assignment is mapped to `409 Conflict`.
  - Response: `201 Created` with assignment envelope (`account_id`, `entitlement_id`, `assigned_at`, `assigned_by`).

- `DELETE /api/v1/accounts/:accountId/entitlements/:entitlementId`
  - Path parameters: `accountId` (UUID), `entitlementId` (UUID).
  - Purpose: Removes the assignment relationship between the account and entitlement in the join table `account_entitlements`. It does NOT delete the account or the entitlement definition.
  - Response: `204 No Content` on successful unassignment, `404 Not Found` if the assignment relationship does not exist, `422 Unprocessable Entity` on invalid UUID parameters.

### 14.5 Risk findings

- `GET /risk-findings`
- `GET /risk-findings/:id`
- `PATCH /risk-findings/:id`

### 14.6 Risk evaluations

- `POST /risk-evaluations`
- `GET /risk-evaluations/:id`

Long-running evaluations must use the background task contract.

### 14.7 Background tasks

- `GET /background-tasks`
- `GET /background-tasks/:taskId`

These endpoints must only expose tasks the caller is authorized to view.

### 14.8 Health

`GET /health`

This endpoint checks API availability. A separate readiness check may verify that required dependencies such as PostgreSQL are available.

### 14.9 Route naming restrictions

Do not create duplicate action-oriented routes such as:

- `/get-identities`
- `/create-account`
- `/delete-entitlement`

Prefer resource paths and HTTP methods.

Authentication endpoints are an explicit exception to the noun-only resource pattern because they represent security protocol operations under `/auth`.

## 15. Backend Architecture Requirements

Follow `docs/architecture.md`.

Expected backend modules:

- `modules/identities/`
- `modules/applications/`
- `modules/accounts/`
- `modules/entitlements/`
- `modules/risk/`
- `modules/auth/`
- `modules/background-tasks/`

Each substantial module should separate responsibilities into:

- Routes
- Controllers
- Services
- Models
- Validation schemas
- Repositories

### Dependency direction

Routes → Controllers → Services → Repositories → Database.

Middleware handles cross-cutting concerns such as authentication, authorization, rate limiting, request IDs, validation, and centralized error handling.

Controllers must not contain SQL queries or substantial business logic.

Repositories must not decide HTTP status codes.

Business rules must not be duplicated across multiple controllers.

## 16. Configuration and Secrets

Use environment variables for environment-specific configuration, including:

- `PORT`
- `DATABASE_URL` or the documented database connection settings
- `CORS_ORIGINS`
- Authentication secrets or key references
- Rate-limit configuration
- Password-recovery delivery configuration
- Background task configuration

Requirements:

- Keep `.env` out of version control.
- Provide a sanitized `.env.example`.
- Never commit production credentials.
- Validate required configuration at application startup.
- Fail safely when essential security configuration is missing.
- Do not silently fall back to permissive production CORS or insecure authentication settings.

## 17. Logging, Monitoring, and Auditing

The backend must support structured logging and request correlation.

Log useful operational information, including:

- Request ID
- Route or route template
- HTTP status
- Duration
- Rate-limit events
- Authentication failures
- Authorization failures
- Background task outcomes
- Unexpected server errors

Audit security-relevant actions such as administrative changes, sensitive access, permission changes, and risk finding status changes.

Never log passwords, reset tokens, access tokens, database credentials, or unnecessary sensitive personal information.

Apply access controls and retention policies to logs and audit records.

## 18. Testing Requirements

Every endpoint must have tests appropriate to its behavior.

Tests must cover:

- Valid requests and expected response schemas
- Invalid request bodies and query parameters
- Missing resources
- Authentication failures
- Authorization and ACL/RBAC enforcement
- Access to resources owned by other users
- Rate-limit enforcement
- CORS configuration
- Duplicate creation and idempotency behavior
- Pagination, filtering, and sorting
- Background task creation and status polling
- Safe error responses
- Database failures and transaction behavior
- Password-reset expiry and single-use behavior
- Prevention of privilege escalation

Use an isolated test database and controlled test fixtures.

Do not claim a security control works merely because the relevant middleware or configuration exists; verify it through tests.

## 19. Implementation Priority

Implement the API in manageable phases.

### Phase 1 — Foundation

- Express application and server
- Environment configuration
- PostgreSQL connection
- Request IDs
- Centralized error handling
- Zod validation
- CORS configuration
- Basic security headers
- Global and route-specific rate limiting
- Health endpoint

### Phase 2 — Authentication and access control

- Signup
- Login
- Logout
- Token refresh
- Forgot password
- Reset password
- Authentication middleware
- Authorization middleware
- Initial ACL/RBAC policy

Do not expose sensitive inventory APIs before the required authorization controls are enforced.

### Phase 3 — Core inventory APIs

- Identities
- Applications
- Accounts
- Pagination
- Filtering
- Sorting
- Consistent request and response schemas

### Phase 4 — Access and risk

- Entitlements
- Account-entitlement assignments
- Risk findings
- Deterministic risk evaluation
- Finding lifecycle

### Phase 5 — Reliability and operational hardening

- Background task queue and task status
- Idempotency-key support for selected POST operations
- Shared rate-limit storage if required
- IP denylisting and abuse response
- Audit logging
- Monitoring and alerting
- Security and integration testing

The order may be adjusted for a specific dependency, but security requirements must not be skipped to accelerate feature development.

## 20. Definition of Done

An API is complete only when:

- Its route follows the naming conventions.
- Its request and response contracts are documented.
- Input validation is implemented.
- Appropriate status codes and error formats are used.
- Rate limiting and relevant abuse protections are applied.
- Authentication and authorization are enforced where required.
- CORS and transport security are configured for the target environment.
- Idempotency and duplicate-handling behavior are defined and tested.
- Long-running operations use the documented asynchronous task pattern.
- Database access follows the repository architecture.
- Automated tests cover successful and failure scenarios.
- Logs avoid secrets and sensitive information.
- Documentation reflects the implemented behavior.
- Verification results are reported honestly.

**Final rule:** Do not implement an endpoint by guessing its behavior. Read this contract, inspect the existing code, propose the smallest suitable change, implement it, test it, and update the contract if an approved design decision changes.