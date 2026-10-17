# IVIP Mini — Identity Discovery & Risk Explorer

## 1. Project Overview

IVIP Mini is an independent, beginner-friendly identity discovery and risk exploration platform inspired by publicly documented Identity Visibility & Intelligence concepts.

The goal is to understand how enterprise identity-security products collect identity data from different sources, normalize records, map relationships between identities and applications, and identify potentially risky access.

This is a learning project. It is not affiliated with, endorsed by, or a reproduction of Zluri's proprietary implementation.

## 2. Problem Statement

Organizations use multiple SaaS applications, cloud platforms, identity providers, and internal systems.

Identity and access information can become fragmented across these systems. This makes it difficult to answer questions such as:

- Which identities and application accounts exist?
- Which applications are connected to each identity?
- Who owns a service account or other non-human identity?
- Which accounts have privileged access?
- Which identities have missing ownership or potentially stale access?
- Why has an identity been flagged for investigation?

IVIP Mini aims to provide a unified, understandable view of identities, their application accounts, access relationships, and explainable risk findings.

## 3. Project Goals

The project will:

1. Maintain an inventory of human and non-human identities.
2. Represent applications and their associated accounts.
3. Model roles, permissions, and entitlement assignments.
4. Import and normalize synthetic identity records.
5. Prevent duplicate account creation during repeated imports.
6. Identify potentially risky configurations using deterministic rules.
7. Explain each risk finding using the evidence available to the system.
8. Provide a searchable, accessible React dashboard.
9. Apply secure development practices and automated testing.
10. Document architectural decisions so developers and AI coding agents can work consistently.

## 4. Initial Scope

The first version will include:

- Identity inventory
- Application inventory
- Application account relationships
- Entitlements and permission assignments
- Basic identity search and filtering
- Deterministic risk rules
- Risk finding details
- Synthetic sample data
- Backend REST APIs
- PostgreSQL persistence
- Basic audit and synchronization records as the project evolves
- Automated tests and developer documentation

## 5. Out of Scope for the Initial Version

The initial release will not attempt to:

- Reproduce Zluri's internal systems or proprietary algorithms
- Connect to production enterprise accounts
- Store real employee or customer identity data
- Automatically revoke real user permissions
- Perform autonomous security remediation
- Make high-impact access decisions using an LLM
- Implement a distributed microservices architecture
- Require a graph database, Kubernetes, or a paid AI service

These capabilities may be reconsidered later if they are justified by a documented requirement.

## 6. Technology Stack

### Frontend

- React
- TypeScript
- Vite
- A consistent, accessible component and design system

### Backend

- Node.js
- Express
- JavaScript initially, with TypeScript adoption considered as the project matures
- REST API conventions
- Zod for request validation

### Database

- PostgreSQL
- The `pg` Node.js client
- Versioned SQL migrations
- Foreign keys, uniqueness constraints, and indexes where appropriate

### Engineering Tools

- Git and GitHub
- Automated unit and integration tests
- Environment variables for local configuration
- Structured logging and clear error handling

### Optional AI Capabilities

AI may later assist with explaining existing risk findings, summarizing evidence, and helping developers understand the codebase.

Deterministic application logic remains responsible for identity matching, permission relationships, risk calculations, and access-control enforcement.

## 7. High-Level Architecture

The system consists of the following logical components:

1. React Dashboard: presents identity inventories, application relationships, and risk findings.
2. Express API: validates requests and coordinates application operations.
3. Identity Services: implement identity management, account relationships, and normalization.
4. Ingestion Services: import and validate records from synthetic sources.
5. Risk Engine: evaluates deterministic rules and generates explainable findings.
6. PostgreSQL: persists identities, applications, accounts, entitlements, and findings.
7. Test Suite: verifies API behavior, business rules, data integrity, and security controls.

The detailed architecture and data flows are documented in `docs/architecture.md`.

## 8. Security Principles

- Use synthetic data by default.
- Never commit secrets, credentials, or API tokens.
- Validate all external and user-provided input.
- Enforce authorization on the backend.
- Apply least privilege to database access and integrations.
- Use parameterized SQL queries.
- Record important changes where an audit trail is required.
- Do not trust AI-generated code without review and testing.
- Require explicit human approval for sensitive or destructive operations.

See `security/` for the detailed threat model and secure development requirements.

## 9. Development Principles

- Prefer small, reviewable changes over large rewrites.
- Follow the documented architecture and API contracts.
- Add tests for new business logic and important edge cases.
- Update documentation when behavior or architecture changes.
- Preserve existing working functionality unless a change is approved.
- Explain significant design decisions and trade-offs.
- Do not introduce dependencies without a clear reason.
- Verify changes using reproducible commands.

## 10. Repository Structure

The intended repository structure is:

- `frontend/` — React dashboard
- `backend/` — Express API and business logic
- `docs/` — Architecture, data model, API contract, and roadmap
- `security/` — Threat model and secure development requirements
- `ai/` — AI feature specifications and coding-agent policies
- `design/` — Design system and user experience specifications
- `.agents/rules/` — Scoped coding-agent instructions
- `AGENTS.md` — Root-level project instructions

The repository may evolve as implementation progresses. Any structural change should be reflected in the documentation.

## 11. Development Status

The project is being developed incrementally.

Initial milestone:

1. Establish the frontend and backend workspace.
2. Verify the local PostgreSQL environment.
3. Connect the backend to PostgreSQL.
4. Implement the first identity API.
5. Display persisted identity records in the frontend.

Subsequent milestones will add ingestion, normalization, identity relationships, risk detection, testing, and operational reliability.

## 12. Definition of Done

A feature is considered complete when:

- Its requirements and expected behavior are clear.
- Its implementation follows the documented architecture.
- Input validation and relevant security controls are present.
- Appropriate tests pass.
- Error and edge-case behavior has been considered.
- Documentation has been updated where necessary.
- The feature has been manually or automatically verified.

## 13. AI Coding Agent Instructions

Before implementing a feature, the coding agent must:

1. Read the relevant project documentation.
2. Inspect the existing implementation.
3. Identify assumptions and missing requirements.
4. Propose a small implementation plan.
5. List the expected file changes and verification steps.
6. Avoid destructive actions without approval.
7. Implement only the approved scope.
8. Run appropriate tests and report the results honestly.
9. Update documentation when required.

The agent must not claim that tests passed, integrations work, or security controls are effective without supporting verification.

## 14. Next Documentation

- `docs/architecture.md`
- `docs/data-model.md`
- `docs/api-contract.md`
- `docs/roadmap.md`
- `security/threat-model.md`
- `security/secure-development.md`
- `ai/agent-policy.md`
- `ai/ai-features.md`
- `design/design-system.md`
- `design/ux-flows.md`