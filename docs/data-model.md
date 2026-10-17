# IVIP Mini — Data Model

## 1. Purpose

This document defines the logical data model for IVIP Mini, including the core entities, their relationships, data integrity rules, and database design principles.

It serves as the reference for implementing PostgreSQL tables, backend models, repositories, validation schemas, and services.

The data model must remain consistent with `docs/architecture.md`.

This document specifies the intended design. It is not itself a database migration or executable SQL file.

## 2. Data Modeling Principles

The data model must follow these principles:

1. Use PostgreSQL as the primary relational database.
2. Represent real-world identities separately from their accounts in individual applications.
3. Preserve relationships between identities, applications, accounts, and entitlements.
4. Use UUIDs as internal identifiers for core entities.
5. Enforce data integrity through foreign keys, unique constraints, and appropriate indexes.
6. Store timestamps for important creation and modification events.
7. Preserve enough source information to explain where imported records originated.
8. Use synthetic data during initial development.
9. Never store passwords, access tokens, or unnecessary sensitive personal information in identity inventory records.
10. Use versioned migrations for database schema changes.

## 3. Core Entities

The initial data model contains six primary entities:

- Identity
- Application
- Account
- Entitlement
- Account Entitlement
- Risk Finding

These entities represent different concepts and must not be treated as interchangeable.

### 3.1 Identity

An identity represents a human or non-human entity that may own or use accounts in connected applications.

Examples include:

- A human employee
- A service account
- An automated bot
- An AI agent

An identity is the canonical record within IVIP Mini. Multiple application accounts may be associated with the same identity.

Expected fields:

| Field | Purpose |
|---|---|
| `id` | Unique internal UUID |
| `display_name` | Human-readable identity name |
| `identity_type` | Human, service account, bot, or AI agent |
| `email` | Optional email address for applicable identities |
| `status` | Active, inactive, or unknown |
| `owner_id` | Optional reference to another identity responsible for this identity |
| `created_at` | Record creation timestamp |
| `updated_at` | Last modification timestamp |

Rules:

- `id` is the primary key.
- `identity_type` must use an approved set of values.
- `status` must use an approved set of values.
- `owner_id`, when provided, must reference an existing identity.
- An identity cannot be its own owner.
- Ownership cycles must be prevented or detected by the relevant service.
- Email must not be assumed to be globally unique unless a documented requirement establishes that constraint.
- Missing information must be represented explicitly rather than fabricated.

### 3.2 Application

An application represents a SaaS product, cloud service, or other system in which accounts exist.

Examples include a source-control platform, a cloud console, or an internal business application.

Expected fields:

| Field | Purpose |
|---|---|
| `id` | Unique internal UUID |
| `name` | Application name |
| `description` | Optional application description |
| `status` | Application availability or inventory status |
| `created_at` | Record creation timestamp |
| `updated_at` | Last modification timestamp |

Rules:

- `id` is the primary key.
- Application names must follow a documented normalization and uniqueness policy.
- An application may have multiple accounts.
- Application records must not contain application credentials or secret tokens.

### 3.3 Account

An account represents a specific account or principal within an application.

For example, one canonical identity may have an account in a source-control application and another account in a cloud platform.

Expected fields:

| Field | Purpose |
|---|---|
| `id` | Unique internal UUID |
| `identity_id` | Optional link to the canonical identity |
| `application_id` | Application in which the account exists |
| `external_id` | Account identifier supplied by the source application |
| `username` | Optional source username |
| `email` | Optional source email |
| `status` | Active, inactive, or unknown |
| `last_login_at` | Optional last observed login timestamp |
| `source` | Source system or connector identifier |
| `created_at` | Record creation timestamp |
| `updated_at` | Last modification timestamp |

Rules:

- `id` is the primary key.
- `application_id` must reference an existing application.
- `identity_id` may be null when the account has not yet been matched to an identity.
- `external_id` identifies the account within its source application.
- The combination of `application_id` and `external_id` must be unique when both values are available.
- Repeated imports of the same source account must update the existing record instead of creating duplicates.
- Account matching must not rely solely on a display name.
- An account with an unresolved identity must remain visible for investigation.
- Source identifiers must be preserved for traceability.

An account is not the same as an identity. One identity can have many accounts, and one account should normally link to no more than one canonical identity at a time.

### 3.4 Entitlement

An entitlement represents a role, permission, group membership, or access level available within an application.

Examples include:

- Administrator
- Developer
- Read-only user
- Billing manager
- A named application permission

Expected fields:

| Field | Purpose |
|---|---|
| `id` | Unique internal UUID |
| `application_id` | Application defining the entitlement |
| `name` | Entitlement name |
| `description` | Optional description |
| `created_at` | Record creation timestamp |
| `updated_at` | Last modification timestamp |

Rules:

- `id` is the primary key.
- `application_id` must reference an existing application.
- Entitlement names should be unique within an application.
- Entitlements must not be assumed to have identical meanings across different applications.
- Privilege levels must be based on documented source metadata or explicit rules, not guessed from names alone.

### 3.5 Account Entitlement

Account Entitlement represents the assignment of an entitlement to an account.

This is a relationship entity connecting accounts and entitlements.

Expected fields:

| Field | Purpose |
|---|---|
| `account_id` | Account receiving the entitlement |
| `entitlement_id` | Assigned entitlement |
| `assigned_at` | Optional assignment timestamp |
| `created_at` | Record creation timestamp |

Rules:

- `account_id` must reference an existing account.
- `entitlement_id` must reference an existing entitlement.
- The combination of `account_id` and `entitlement_id` must be unique.
- An entitlement must belong to the same application as the account receiving it.
- Invalid cross-application assignments must be rejected.
- Removal of an assignment must not automatically delete the underlying account or entitlement.

The application-consistency rule must be enforced through appropriate database design or transactional service validation.

### 3.6 Risk Finding

A risk finding represents a potentially unsafe or noteworthy identity configuration detected by a deterministic rule.

Initial examples include:

- An active account without a linked identity
- An identity without a known owner
- An account with a privileged entitlement
- An inactive identity associated with an active account
- A stale account based on a documented activity threshold

Expected fields:

| Field | Purpose |
|---|---|
| `id` | Unique internal UUID |
| `identity_id` | Optional associated identity |
| `account_id` | Optional associated account |
| `rule_code` | Stable identifier for the detecting rule |
| `severity` | Informational, low, medium, high, or critical |
| `description` | Human-readable explanation |
| `status` | Open, acknowledged, resolved, or dismissed |
| `evidence` | Structured evidence supporting the finding |
| `first_detected_at` | First detection timestamp |
| `last_detected_at` | Most recent detection timestamp |
| `created_at` | Record creation timestamp |
| `updated_at` | Last modification timestamp |

Rules:

- `id` is the primary key.
- A finding must reference at least one relevant entity.
- `rule_code` must identify a known risk rule.
- Severity must be assigned according to documented deterministic criteria.
- Findings must explain the condition that triggered the rule.
- Re-running a risk rule must not create duplicate open findings for the same underlying issue.
- Existing findings should be updated when the same issue is detected again.
- Resolution and dismissal must be distinguishable.
- Evidence must contain only the minimum information required to explain the finding.
- AI-generated text may explain a finding but must not change its severity or underlying evidence.

## 4. Entity Relationships

The intended relationships are:

- One identity can have many accounts.
- One application can have many accounts.
- One application can define many entitlements.
- One account can have many entitlements.
- One entitlement can be assigned to many accounts.
- One identity may have many risk findings.
- One account may have many risk findings.
- An identity may optionally reference another identity as its owner.

The account-entitlement relationship is many-to-many and is represented by the `account_entitlements` relationship table.

A canonical identity may exist without any linked application accounts. An application account may also exist before identity resolution is complete.

## 5. Relationship Overview

The logical relationship flow is:

Identity → Accounts → Applications

Accounts → Account Entitlements → Entitlements

Identity and Account → Risk Findings

Identity → Owner Identity

These relationships must be implemented using stable internal identifiers and foreign keys rather than display names.

## 6. Identity Resolution

Identity resolution is the process of determining whether records from different sources represent the same underlying identity.

For the initial version:

1. Import synthetic source records.
2. Normalize supported fields such as email and source identifiers.
3. Apply documented matching rules.
4. Link accounts to an identity only when the matching evidence meets the defined criteria.
5. Leave uncertain matches unresolved.
6. Record the reason for a match or an unresolved result when practical.

Matching rules must be deterministic, testable, and explainable.

A matching score may be introduced later, but it must not automatically merge identities without appropriate safeguards.

The system must preserve source account identifiers so that an account can be traced back to its origin.

## 7. Data Integrity and Constraints

The database must enforce integrity wherever practical.

Required protections include:

- Primary keys for core entities
- Foreign keys for relationships
- Unique constraints for source account identity
- Validated enumerated values for identity types and statuses
- Validated severity and finding status values
- Non-null constraints for required fields
- Indexes for commonly queried relationships
- Transactional updates for operations involving multiple related records

Application-level validation does not replace database constraints.

Database constraints do not replace API validation. Both layers are required for their respective responsibilities.

## 8. Indexing Strategy

Indexes should support the initial API query patterns without adding unnecessary complexity.

Consider indexes on:

- `accounts.identity_id`
- `accounts.application_id`
- `accounts.status`
- `risk_findings.identity_id`
- `risk_findings.account_id`
- `risk_findings.status`
- `risk_findings.severity`
- `entitlements.application_id`

Indexes should be added or adjusted based on actual queries and query plans as the project grows.

Unique constraints may create their own indexes, so duplicate indexes must be avoided.

## 9. Database Migrations

All database schema changes must be versioned.

The target migration location is:

`backend/src/database/migrations/`

Each migration must:

1. Have a unique, ordered version.
2. Define a specific schema change.
3. Be safe to apply to the expected database state.
4. Be tested against a local development database.
5. Include rollback guidance when practical.
6. Be committed alongside the application code that depends on it.

Do not maintain multiple conflicting copies of the database schema.

If an initial `schema.sql` already exists in the repository, inspect it and use it as the starting point for the first migration. Do not independently create a second initial schema that defines the same tables.

## 10. Data Lifecycle and Retention

The system should distinguish between:

- A source record that is currently observed
- A source record that is no longer observed
- An identity marked inactive
- A risk finding that has been resolved
- A record that is eligible for deletion

A missing record during an import must not automatically result in destructive deletion.

Later ingestion features should define how to handle records that disappear from a source, failed synchronization runs, and source deactivation.

Retention and deletion policies must be documented before using real organizational data.

## 11. Security and Privacy

- Use synthetic data by default.
- Avoid collecting unnecessary personal information.
- Never store plaintext passwords, access tokens, private keys, or connector secrets in these tables.
- Validate imported data before persistence.
- Use parameterized SQL statements.
- Restrict database credentials to the permissions required by the application.
- Do not expose internal database errors or sensitive source payloads through API responses.
- Protect audit and risk evidence from unauthorized modification.
- Apply authorization checks before returning identity, account, or risk data.
- Do not send entire identity records or database results to an AI service by default.

Detailed controls are specified in the `security/` documentation.

## 12. AI Boundary

AI is optional and must not be a source of truth for this data model.

AI may later help:

- Explain a deterministic risk finding in simpler language
- Summarize existing evidence
- Help a developer understand relationships between records

AI must not independently:

- Create or merge canonical identities
- Invent missing ownership information
- Assign permissions
- Change risk severity
- Mark findings as resolved
- Execute destructive database operations
- Bypass application authorization

Any future AI-assisted action that changes persisted data must follow explicit authorization, validation, and human-approval requirements.

## 13. Mapping to Backend Modules

The data model maps to feature modules as follows:

- `modules/identities/` — identity records and ownership relationships
- `modules/applications/` — application inventory
- `modules/accounts/` — application accounts and identity links
- `modules/entitlements/` — entitlements and account-entitlement assignments
- `modules/risk/` — risk rules, findings, and finding lifecycle

Repositories own SQL queries and persistence behavior.

Services own business rules and coordinate operations across repositories.

Controllers handle HTTP input and output.

Validation schemas validate incoming data before business logic executes.

Domain models describe the shape and meaning of application data; they are not automatically database schemas.

## 14. Testing Requirements

Tests must cover at least:

- Creating and retrieving an identity
- Creating an application and its accounts
- Rejecting invalid foreign-key relationships
- Preventing duplicate source accounts
- Assigning an entitlement to an account
- Rejecting cross-application entitlement assignments
- Handling accounts with unresolved identities
- Creating and updating risk findings without duplicates
- Validating permitted statuses and severity values
- Handling missing or malformed source fields
- Ensuring unauthorized users cannot access protected records when authorization is implemented

Use a dedicated test database or isolated test fixtures. Tests must not depend on production data.

## 15. Completion Criteria

This data model is ready to guide implementation when:

- The core entities and relationships are understood.
- Field names and allowed values are documented.
- Database constraints are identified.
- Identity resolution behavior is defined at a basic level.
- Risk findings have a clear lifecycle.
- Security and AI boundaries are explicit.
- Migration and testing expectations are documented.
- The model is consistent with `docs/architecture.md`.

Any change to the core entities or relationships must be reflected in this document and the corresponding database migrations.