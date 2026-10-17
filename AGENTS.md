# IVIP Mini — AI Coding Agent Instructions (AGENTS.md)

## 1. Purpose and Authority

This document defines the core operational rules, boundaries, and workflow for all AI coding agents (including Antigravity, Claude, Codex, and others) working in the **IVIP Mini** repository.

`AGENTS.md` is the primary entry point for coding agents. It provides a concise governance framework and delegates domain details to authoritative project documents:

1. **Architecture & Module Boundaries**: `docs/architecture.md`
2. **Relational Data Model & Migrations**: `docs/data-model.md`
3. **REST API Contract & Errors**: `docs/api-contract.md`
4. **Development Roadmap & Milestones**: `docs/roadmap.md`
5. **Security Threat Model**: `security/threat-model.md`
6. **Secure Development Standards**: `security/secure-development.md`
7. **Agent Behavioral Policy**: `ai/agent-policy.md`
8. **AI Feature Specification**: `ai/ai-features.md`
9. **Design System & UX Standards**: `design/design-system.md`, `design/ux-flows.md`, and `design/frontend-quality-checklist.md`
10. **Architecture Decisions & Flow Traces**: `understanding/ai_response/decision.md` and `understanding/ai_response/flow.md`

Agents must consult these documents rather than guessing conventions or inventing undocumented patterns.

---

## 2. Core Architectural Rules

IVIP Mini is built as a **Modular Monolith**:
- **Backend**: Node.js + Express (ES Modules `"type": "module"`) with Zod request validation and PostgreSQL accessed via `pg` and versioned SQL migrations.
- **Frontend**: React 18 + TypeScript + Vite 6 LTS with centralized CSS design tokens (no utility-class bloat).
- **Decoupled Server & App**: `backend/src/server.js` manages process lifecycle and port listening; `backend/src/app.js` registers middleware, routes, and error handling.
- **Strict Dependency Direction**:
  $$\text{Routes} \longrightarrow \text{Controllers} \longrightarrow \text{Services} \longrightarrow \text{Repositories} \longrightarrow \text{Database}$$
  - **Routes** map HTTP endpoints and mount middleware. No business logic.
  - **Controllers** unpack validated request data and call services. No SQL.
  - **Services** orchestrate business rules, identity resolution, and risk calculation.
  - **Repositories** own parameterized SQL queries (`$1, $2`). No HTTP objects.
  - **Database** manages connection pools (`pg.Pool`) and migrations.
- **No Premature Complexity**: Do NOT introduce microservices, message queues, Docker/Kubernetes, graph databases, or ORMs (Prisma/TypeORM) unless explicitly requested and documented.

---

## 3. Mandatory Agent Workflow for Every Task

For every task, agents must follow this sequential process:

1. **Understand & Inspect Before Modifying**:
   - Inspect existing files, package configurations, directory structures, and Git status.
   - Do NOT assume files exist or contain specific code; verify directly.
2. **Consult Roadmap & Relevant Specifications**:
   - Identify the active roadmap milestone and dependency order.
   - Align changes with API contracts, data models, and security threat models.
3. **Plan Incrementally**:
   - Make the smallest coherent change that satisfies the user's requirements.
   - For non-trivial changes, provide a concise plan before modifying files.
4. **Preserve Working Code**:
   - Never break working functionality or overwrite unrelated user work.
5. **Test & Verify Honestly**:
   - Execute relevant commands (build, lint, type-check, tests, health checks).
   - Report actual terminal outputs honestly. Never claim a test passed without running it.
6. **Document Decisions & Code Flows**:
   - Update `understanding/ai_response/decision.md` whenever an architectural or technical trade-off is accepted.
   - Update `understanding/ai_response/flow.md` when the call chain or file-to-file execution flow changes.
   - Update `docs/roadmap.md` when milestones advance.

---

## 4. Security & Quality Guardrails

1. **Zero Secret Leakage**:
   - Never commit passwords, tokens, API keys, or private secrets.
   - Keep `.env` out of version control; maintain sanitized `.env.example` templates.
2. **Parameterized SQL Only**:
   - Never concatenate untrusted user input into SQL queries.
3. **Strict Input Validation**:
   - Validate all request bodies, query parameters, and URL path variables with Zod.
4. **Read-Only AI Boundary**:
   - AI capabilities are restricted to read-only explanations of existing findings.
   - AI has zero direct database write permissions and cannot modify permissions or access.
5. **Deterministic-First Core**:
   - Identity matching and risk evaluations must use deterministic, explainable rules.
6. **Frontend Standards**:
   - Maintain WCAG 2.2 AA accessibility, visible focus states, zero horizontal overflow, and light/dark theme support.

---

## 5. Approval Boundaries

Agents must obtain explicit user approval before:
- Modifying or dropping database tables or executing destructive SQL queries.
- Introducing major new architecture changes or microservices.
- Adding major third-party dependencies.
- Modifying production credentials or deployment environments.
- Git operations involving `git push`, branch deletion, or history rewrites (`rebase`, `reset --hard`).
