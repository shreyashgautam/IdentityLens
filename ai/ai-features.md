# IVIP Mini — AI Features and Design Specification

## 1. Purpose

This document defines the AI-powered capabilities planned for IVIP Mini, including their purpose, inputs, outputs, architecture, security boundaries, failure handling, and evaluation criteria.

IVIP Mini is an identity inventory and risk exploration application. It helps users understand identities, application accounts, entitlements, identity relationships, and potential access risks.

AI is intended to make existing information easier to understand. It is not the authoritative source of identity records, permissions, or risk decisions.

The core application must remain useful even when AI is disabled or unavailable.

## 2. Product Goals

The AI layer should:

- Explain existing risk findings in clear language.
- Summarize the evidence supporting a finding.
- Help users understand why an identity or account was flagged.
- Answer questions using authorized data already available in IVIP Mini.
- Highlight missing information and uncertainty.
- Reduce the effort required to investigate identity-related findings.

The AI layer must not invent identity relationships, fabricate evidence, or make unsupported security claims.

## 3. Scope and Implementation Order

AI capabilities must be implemented incrementally after the core inventory, identity discovery, and deterministic risk engine are working.

### Phase A — Risk Finding Explanations

Priority: High

Allow a user to request an explanation of an existing risk finding.

Example questions:

- Why was this account flagged?
- What evidence supports this finding?
- Which access relationship contributed to this risk?
- What additional information would help investigate it?

The AI must use the existing finding and its authorized supporting evidence. It must not independently invent a risk finding.

### Phase B — Investigation Summaries

Priority: High

Generate concise summaries of an identity, account, or risk investigation.

A summary may include:

- The relevant identity and application.
- Associated accounts and entitlements.
- Existing risk findings and their severity.
- Supporting evidence.
- Missing or uncertain information.
- Suggested investigation steps.

The summary must distinguish verified application data from model-generated interpretation.

### Phase C — Natural-Language Exploration

Priority: Medium

Allow users to ask questions about data they are authorized to access.

Example questions:

- Which accounts have high-severity risk findings?
- Summarize the risk findings for this identity.
- Which applications are associated with this account?
- What evidence is available for this finding?

The backend must translate supported questions into validated application operations. The model must not receive unrestricted database access or execute arbitrary SQL.

Unsupported questions must receive a clear explanation rather than a fabricated answer.

### Phase D — Investigation Assistance

Priority: Medium

Provide suggestions that help users investigate existing findings.

Examples:

- Review an account whose identity match is ambiguous.
- Verify whether a privileged entitlement is still required.
- Check whether supporting evidence is incomplete.
- Investigate an account with an unexplained risk finding.

These are recommendations only. They must not automatically change permissions, deactivate accounts, revoke access, or modify identity relationships.

### Out of Scope for the Initial Version

The initial AI implementation must not include:

- Autonomous access revocation or permission changes.
- Automatic identity merges based solely on model output.
- AI-generated risk scores that replace deterministic rules.
- Unrestricted natural-language-to-SQL execution.
- Autonomous remediation agents.
- Unrestricted access to external applications.
- Training custom models on private identity data.
- Claims that the application has discovered real organizational data when only synthetic records exist.

These capabilities require separate product, security, and architectural review before consideration.

## 4. Core Design Principle: Deterministic First, AI Second

The core processing pipeline is:

1. Ingest identity and account records.
2. Validate and normalize the records.
3. Discover relationships using documented matching rules.
4. Evaluate risk using deterministic rules.
5. Persist findings and supporting evidence.
6. Allow the user to request an AI explanation.
7. Retrieve the relevant authorized evidence.
8. Send only the necessary context to the configured AI provider.
9. Validate the model response.
10. Display the explanation with its evidence references and limitations.

The AI layer explains results produced by the application. It does not replace identity matching, authorization checks, or the risk engine.

## 5. High-Level Architecture

The AI request flow should follow this structure:

Frontend → Authenticated API → Authorization → AI Service → Evidence Retrieval → AI Provider Adapter → Output Validation → Frontend

Responsibilities:

- **Frontend:** Collects the user's question and displays the response, loading state, and errors.
- **API layer:** Validates the request and applies normal authentication, authorization, and rate limits.
- **Authorization layer:** Determines which records the user may access.
- **AI service:** Coordinates evidence retrieval, prompt construction, provider calls, and response handling.
- **Evidence retrieval:** Retrieves the minimum necessary authorized records from existing application services.
- **Provider adapter:** Encapsulates provider-specific request and response formats.
- **Output validation:** Checks the response structure and rejects malformed or unsupported output.
- **Audit layer:** Records appropriate metadata about the AI operation without logging sensitive prompt contents unnecessarily.

The AI service must reuse existing domain services and repositories through approved interfaces. It must not bypass authorization or connect directly to the database using unrestricted model-generated instructions.

## 6. Backend Module Design

Follow `docs/architecture.md` and the existing modular monolith.

The proposed feature module is:

```text
backend/src/modules/ai/
  ai.routes.js
  ai.controller.js
  ai.service.js
  ai.validation.js
  ai.prompts.js
  ai.schemas.js
  ai.provider.js
  ai.constants.js
  index.js
```

Responsibilities:

- `ai.routes.js` — registers AI-related endpoints.
- `ai.controller.js` — handles HTTP request and response mapping.
- `ai.service.js` — orchestrates authorization-aware evidence retrieval and AI operations.
- `ai.validation.js` — validates incoming API requests.
- `ai.prompts.js` — contains versioned prompt templates.
- `ai.schemas.js` — defines validated model output structures.
- `ai.provider.js` — defines the provider interface and delegates to the configured provider adapter.
- `ai.constants.js` — defines stable AI-related constants.
- `index.js` — exposes the approved module interface.

Provider-specific implementations may be placed in separate files when needed.

Do not create empty files before their responsibilities are required. Keep the module as small as practical and follow existing project conventions.

## 7. Provider Abstraction and Configuration

The AI provider must be configurable through backend environment variables.

The application may initially use a Grok-compatible provider if selected, but provider-specific behavior must remain isolated behind the provider adapter.

Configuration may include:

- `AI_ENABLED`
- `AI_PROVIDER`
- `AI_API_KEY`
- `AI_MODEL`
- `AI_BASE_URL`, only when required by the selected provider
- `AI_REQUEST_TIMEOUT_MS`
- `AI_MAX_OUTPUT_TOKENS`
- `AI_MAX_REQUESTS_PER_USER`
- `AI_MAX_CONTEXT_RECORDS`

The actual supported configuration must match the selected provider's API and the project's configuration validation.

Rules:

- AI must be disabled by default until the developer explicitly enables it.
- API keys must remain on the backend.
- Never expose AI credentials through frontend environment variables or browser bundles.
- Never hardcode secrets in source files.
- Validate required configuration at startup when AI is enabled.
- Use the provider's documented API and supported model identifiers.
- Keep model selection configurable rather than scattering model names throughout the codebase.
- Do not silently fall back to a different external provider.
- If the provider is unavailable, return a safe error or a clearly identified non-AI fallback.

Provider changes must not require rewriting identity discovery or the deterministic risk engine.

## 8. AI Input Contracts

Every AI feature must define its allowed inputs explicitly.

### Risk explanation input

The backend should accept a risk finding identifier and an optional, bounded question.

Example conceptual request:

```json
{
  "question": "Why was this account flagged?"
}
```

The finding identifier may be provided through the route path. The backend must retrieve the finding and its evidence after checking authorization.

The client must not be trusted to supply authoritative risk scores, hidden evidence, or permissions.

### Investigation summary input

The request should identify the relevant entity, such as an identity, account, or risk finding.

The backend retrieves the permitted context and constructs the summary request.

### Natural-language exploration input

The request contains a user's question and, where appropriate, an explicitly selected application or identity context.

The backend must limit the question length and the amount of data retrieved.

All request bodies must be validated with Zod. Unsupported fields must not be passed directly into prompts.

## 9. AI Output Contracts

Model output must be treated as untrusted data.

Prefer structured output with validated fields over unrestricted prose wherever practical.

A risk explanation may contain:

- `summary` — a short explanation.
- `evidence` — references to evidence supplied to the model.
- `reasoning` — a concise explanation of how the evidence relates to the finding.
- `uncertainties` — missing information or limitations.
- `suggested_next_steps` — non-destructive investigation suggestions.
- `disclaimer` — a statement that the explanation is AI-generated.

The exact schema must be defined in `ai.schemas.js` and validated before the result reaches the frontend.

Evidence references must resolve to records supplied to the model and authorized for the requesting user. The model must not be allowed to invent record identifiers or claim that nonexistent evidence was retrieved.

The application must reject or safely handle malformed output, unexpected fields, missing required values, and unsupported claims.

A valid JSON response alone does not establish that the explanation is factually correct.

## 10. Evidence and Grounding Requirements

AI responses must be grounded in retrieved application data.

The AI service should provide a minimal, structured context containing relevant fields, such as:

- Finding identifier and existing severity.
- Existing risk rule identifier.
- Relevant account and application identifiers.
- Relevant entitlement details.
- Evidence supporting the finding.
- Data source and observation timestamps, when available.
- Existing identity-match confidence or ambiguity information, when available.

Rules:

- Do not ask the model to guess missing values.
- Do not treat a model-generated explanation as new evidence.
- Do not claim a record was verified when it was not.
- Preserve provenance when presenting evidence.
- Clearly identify unavailable or incomplete information.
- Avoid retrieving an entire organization's data for a single finding.
- Do not send unrelated identities or accounts to the provider.
- Do not claim certainty beyond what the underlying records support.

When evidence is insufficient, the response should say that the available information is insufficient to reach a confident conclusion.

## 11. Authorization and Data Privacy

Authentication and authorization must be enforced before evidence retrieval and before returning an AI response.

The AI provider must never be treated as an authorization boundary.

Requirements:

- Verify that the user may access the requested identity, account, application, or finding.
- Apply resource-level access controls before building the prompt.
- Retrieve only the fields required for the requested operation.
- Exclude passwords, access tokens, API keys, session cookies, and other secrets.
- Minimize personal and organizational information sent to external providers.
- Do not send full database records by default.
- Do not include data belonging to other users merely because it improves the model's answer.
- Document the selected provider's data handling and retention requirements before using real organizational data.
- Use synthetic records during development and testing.
- Avoid storing complete prompts and model responses in audit logs unless a separately approved need and retention policy exist.

AI must not be able to expand the requesting user's permissions.

## 12. Prompt Injection and Untrusted Content

Treat user questions, imported application metadata, descriptions, document content, and retrieved records as untrusted input.

The system must not assume that retrieved content is safe simply because it came from the database.

The agent implementing AI must:

- Clearly separate system instructions from retrieved evidence.
- Instruct the model to treat evidence as data rather than executable instructions.
- Avoid including unnecessary free-form external content in prompts.
- Never expose system prompts, credentials, or internal secrets in responses.
- Prevent retrieved text from authorizing tool calls or bypassing access controls.
- Avoid giving the model arbitrary tools, shell access, database access, or unrestricted network access.
- Validate model output independently of prompt instructions.

Prompt engineering alone is not a security control. Enforce access restrictions and allowed operations in deterministic backend code.

## 13. Failure Handling and Reliability

AI features must fail safely.

Handle at least these conditions:

- Provider timeout.
- Provider rate limit.
- Provider authentication failure.
- Network failure.
- Invalid provider response.
- Empty response.
- Invalid structured output.
- Context too large.
- Missing or inaccessible finding.
- AI disabled by configuration.
- Usage quota exceeded.

Requirements:

- Apply bounded request timeouts.
- Limit prompt size and output tokens.
- Use bounded retries only where appropriate.
- Avoid retrying permanent errors such as invalid credentials.
- Respect provider rate-limit responses.
- Prevent repeated user requests from causing uncontrolled costs.
- Do not return provider stack traces or secrets to clients.
- Keep AI failures separate from the availability of the core inventory.
- Use a clear error response when AI cannot complete the request.
- Do not present a failed AI response as a successful analysis.

If the application later supports asynchronous AI jobs, use the documented background-task lifecycle and status-polling contract. Repeated status checks must not restart the operation.

## 14. API Design

AI endpoints must follow `docs/api-contract.md`.

Possible initial endpoints include:

- `POST /api/risk-findings/:findingId/explanations`
- `GET /api/risk-findings/:findingId/explanations/:explanationId`
- `POST /api/identities/:identityId/summaries`
- `POST /api/ai/queries`

These are proposed routes, not a requirement to implement all of them immediately. Review them against the existing API contract before adoption.

For each endpoint:

- Define request and response schemas.
- Apply authentication and resource-level authorization.
- Enforce input-size and rate limits.
- Return consistent safe errors.
- Avoid exposing provider internals.
- Define whether processing is synchronous or asynchronous.
- Define idempotency and caching behavior where appropriate.

Do not add endpoints merely to expose the model provider directly to the frontend.

## 15. Caching and Cost Controls

Repeated requests for identical evidence may incur unnecessary provider costs.

Caching may be introduced after the basic AI feature works correctly.

If caching is used:

- Include the relevant finding or entity version in the cache key.
- Account for prompt version and model configuration.
- Do not share cached responses across authorization boundaries.
- Invalidate cached explanations when relevant evidence or findings change.
- Avoid caching responses indefinitely.
- Ensure cached responses remain clearly associated with the evidence used to generate them.

Apply reasonable limits to requests per user, input size, context size, output length, and concurrent provider calls.

Track operational usage without logging unnecessary sensitive content.

## 16. AI Evaluation and Testing

AI features require both software tests and response-quality evaluation.

### Functional tests

Verify:

- Correct retrieval of the requested finding.
- Authorization before evidence retrieval.
- Request validation.
- Output-schema validation.
- Provider timeout handling.
- Provider error handling.
- AI-disabled behavior.
- Rate-limit behavior.
- Safe handling of malformed model responses.

### Security tests

Verify:

- Unauthorized users cannot obtain explanations for inaccessible findings.
- Prompt injection cannot bypass backend authorization.
- Secrets are not included in prompts or responses.
- Model output cannot execute arbitrary SQL or application commands.
- Untrusted evidence cannot trigger unauthorized actions.
- The model cannot directly modify permissions or identity relationships.

### Quality evaluation

Maintain a small synthetic evaluation dataset with expected evidence and acceptable explanation criteria.

Evaluate whether responses:

- Use the supplied evidence correctly.
- Preserve the existing risk severity.
- Avoid fabricated facts and citations.
- Acknowledge uncertainty.
- Avoid unsupported remediation claims.
- Remain concise and understandable.

Use deterministic assertions wherever possible. For model-quality checks, document that outputs can vary between runs.

Do not use a single successful demonstration as proof of overall AI reliability.

## 17. Observability and Auditing

Record appropriate operational metadata, such as:

- Request identifier.
- Feature name.
- Requesting user identifier, subject to the application's privacy policy.
- Relevant finding or entity identifier.
- Provider and model identifier.
- Prompt-template version.
- Request duration.
- Success or failure category.
- Token usage and estimated cost when available.
- Retry count.

Do not log credentials, full prompts, or complete evidence by default.

Audit logs must not become a secondary source of unrestricted sensitive identity data.

## 18. Implementation Milestones

AI work must follow the core project roadmap.

### AI-0 — Readiness

Prerequisites:

- Core identity and application inventory works.
- Account-entitlement relationships are available.
- Authentication and authorization are enforced.
- The deterministic risk engine produces evidence-backed findings.
- Security and API contracts are documented.

### AI-1 — Provider Foundation

- Add validated configuration.
- Create a provider interface.
- Implement a single selected provider.
- Add bounded timeouts and safe error handling.
- Test the disabled-provider path.

### AI-2 — Risk Explanations

- Retrieve authorized finding evidence.
- Construct a minimal prompt.
- Validate structured output.
- Display the explanation and limitations.
- Add functional and security tests.

### AI-3 — Investigation Summaries

- Support summaries of authorized identities or accounts.
- Preserve evidence references.
- Handle missing and ambiguous data.
- Evaluate response quality.

### AI-4 — Natural-Language Exploration

- Define a bounded set of supported questions.
- Map requests to approved backend operations.
- Validate results and authorization.
- Test unsupported questions and prompt-injection attempts.

### AI-5 — Hardening and Evaluation

- Review privacy and provider data handling.
- Add usage and cost controls.
- Evaluate factual grounding.
- Test provider outages and malformed responses.
- Update documentation and the project roadmap.

Do not begin a later milestone until its dependencies are satisfied.

## 19. Acceptance Criteria

An AI feature is ready for completion review only when:

- It solves a clearly defined user problem.
- It uses authorized, relevant application data.
- It follows the documented module architecture.
- Its request and response contracts are validated.
- Its output is treated as untrusted.
- It handles provider failures safely.
- It does not bypass deterministic risk logic.
- It cannot independently change access or permissions.
- Relevant functional and security tests have been run.
- Known limitations are documented.
- Its completion status is supported by verification evidence.

## 20. Final Principles

IVIP Mini's AI capabilities must make identity and risk information easier to understand without making the underlying security decisions less reliable.

The application remains responsible for identity matching, authorization, data integrity, and risk calculation.

AI may explain, summarize, and suggest. It must not become an unrestricted authority over the system.