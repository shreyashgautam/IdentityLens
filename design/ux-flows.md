# IVIP Mini — User Experience Flows

## 1. Purpose

Define the primary user journeys, navigation behavior, interaction states, and expected outcomes for IVIP Mini.

The product helps users explore identities, applications, accounts, entitlements, and evidence-backed risk findings.

The experience should prioritize clarity, predictable navigation, fast investigation, and safe handling of security-sensitive information.

## 2. Primary User

The primary user is an IT administrator, security analyst, or identity-management practitioner exploring identity inventory and potential access risks.

The initial application may use synthetic data. All demonstration data must be clearly identified as synthetic.

## 3. Main Navigation

Use a consistent authenticated application shell.

Primary navigation:

1. Overview
2. Identities
3. Applications
4. Accounts
5. Entitlements
6. Risk Findings
7. Background Tasks, when implemented
8. Settings, when implemented

Only display routes that exist and are usable. Do not add inactive menu items merely to make the application appear more complete.

Each page should include a clear title, a concise description where useful, and relevant primary actions.

## 4. Authentication Flow

### Login

1. The user opens the login page.
2. The user enters the required credentials.
3. The frontend validates basic input requirements.
4. The backend authenticates the user.
5. On success, the user is redirected to the intended protected page or dashboard.
6. On failure, a safe and understandable error message is shown.

### Logout

1. The user selects Logout.
2. The application performs the documented session or token invalidation behavior.
3. Protected application state is cleared as appropriate.
4. The user is redirected to the login page.

### Authentication Requirements

- Show loading and disabled states while submitting.
- Prevent accidental duplicate submissions.
- Do not expose authentication secrets in logs or URLs.
- Do not rely on frontend checks for authorization.
- Preserve the intended session and refresh-token security model.
- Include password recovery only when the backend flow is implemented.

## 5. Overview Dashboard Flow

### Goal

Help the user understand the current inventory and identify where investigation may be needed.

### Flow

1. The user opens Overview.
2. The application loads available inventory and risk metrics.
3. Loading indicators appear while data is being fetched.
4. Metrics and recent activity appear when the request succeeds.
5. The user selects a metric or finding to navigate to the relevant detailed view.
6. The selected view preserves applicable filters or context where practical.

### Dashboard States

- Loading: display skeletons or a clear loading indicator.
- Success: show metrics based on actual API responses.
- Empty: explain that no inventory exists and provide an appropriate next step.
- Error: show a safe message and a retry action where appropriate.
- Partial data: identify unavailable sections rather than implying the entire dashboard is complete.

Never present hardcoded demonstration metrics as live organizational data.

## 6. Identity Discovery and Inventory Flow

### Goal

Allow users to browse identities and understand their associated accounts.

### Flow

1. The user opens Identities.
2. The application loads a paginated identity list.
3. The user searches, filters, or sorts the list.
4. The user selects an identity.
5. The identity detail page displays available identity attributes and linked accounts.
6. The user follows a linked account to its account detail page.
7. The user reviews related applications, entitlements, and risk findings.

### Identity List Requirements

- Display meaningful identity fields and status.
- Support backend pagination.
- Show loading, empty, and error states.
- Allow filters only for fields supported by the API.
- Keep filter state predictable when navigating between pages.

### Identity Detail Requirements

- Display available source and matching information.
- Clearly distinguish confirmed relationships from ambiguous matches.
- Show relevant accounts and findings.
- Link to related application and account details.
- Avoid displaying unavailable fields as verified facts.

Identity merging or modifying identity relationships must not be performed through an unapproved or unimplemented UI action.

## 7. Application Inventory Flow

### Goal

Help users understand which applications exist and which accounts are associated with them.

### Flow

1. The user opens Applications.
2. The application displays a paginated list of known applications.
3. The user searches or filters the list.
4. The user selects an application.
5. The detail page displays application metadata and associated accounts.
6. The user opens an account to inspect its identity relationship and entitlements.

Application detail views should distinguish imported or synthetic information from verified integrations.

## 8. Account Investigation Flow

### Goal

Help users inspect an account and understand its relationship to an identity, application, entitlements, and risk findings.

### Flow

1. The user opens Accounts.
2. The application loads the account list.
3. The user searches, filters, or sorts accounts.
4. The user selects an account.
5. The detail page displays the associated application and identity, if known.
6. The user reviews assigned entitlements.
7. The user reviews associated risk findings and supporting evidence.
8. The user follows related links to investigate further.

If the identity association is unknown or ambiguous, display that state explicitly instead of silently choosing a match.

## 9. Entitlement Exploration Flow

### Goal

Help users understand what access is assigned and to which accounts.

### Flow

1. The user opens Entitlements.
2. The application displays available entitlements.
3. The user searches or filters by application, account, or other supported fields.
4. The user opens an entitlement or account-entitlement relationship.
5. The detail view explains the relationship using available application data.
6. The user follows related account, application, or identity links.

Do not imply that an entitlement is dangerous solely because it exists. Risk assessments must come from documented rules and evidence.

## 10. Risk Findings Investigation Flow

### Goal

Help users understand and investigate potential access risks.

### Flow

1. The user opens Risk Findings.
2. The application displays existing findings.
3. The user filters by severity, status, application, or other supported fields.
4. The user selects a finding.
5. The detail page displays the finding, severity, applicable rule, and supporting evidence.
6. The user follows links to the relevant identity, account, application, or entitlement.
7. The user determines what additional investigation may be required.

### Finding Detail Requirements

- Display the existing severity and finding status.
- Show the rule or condition that generated the finding.
- Present the available evidence and its provenance.
- Clearly distinguish missing information from negative evidence.
- Provide a clear way to return to the filtered finding list.

The interface must not fabricate evidence or imply that a risk finding proves malicious behavior.

## 11. AI Explanation Flow

This flow becomes available only after the AI feature is implemented and enabled.

### Goal

Help the user understand an existing finding without replacing the deterministic risk engine.

### Flow

1. The user opens an authorized risk finding.
2. The user selects Explain finding.
3. The frontend displays a loading state.
4. The backend verifies access to the finding and retrieves the minimum necessary evidence.
5. The AI service generates an explanation.
6. The backend validates the response.
7. The frontend displays the explanation alongside the original finding and evidence.
8. The user reviews the explanation and suggested investigation steps.

### AI Interaction Requirements

- Label AI-generated content clearly.
- Preserve links to the original evidence.
- Show uncertainty or missing information.
- Handle unavailable AI providers gracefully.
- Do not allow AI output to change the finding severity or permissions.
- Do not present suggestions as completed actions.
- Never expose findings the user is not authorized to access.

If AI is disabled, hide or disable the action with a clear explanation rather than displaying a nonfunctional button.

## 12. Background Task Flow

This flow applies only when background ingestion or other long-running tasks are implemented.

### Flow

1. The user initiates an authorized operation.
2. The backend accepts the task and returns `202 Accepted` with a task identifier.
3. The frontend displays the task status.
4. The frontend retrieves status using the documented polling behavior.
5. The user sees progress and an estimated remaining time only when the backend provides a meaningful estimate.
6. The interface displays completion or failure.
7. The user can navigate to the resulting inventory or relevant error details.

Repeated status requests must not start duplicate tasks. Retrying task creation must follow the documented idempotency rules.

Do not invent progress percentages or completion estimates.

## 13. Search, Filtering, Sorting, and Pagination

Collection pages must support predictable data exploration.

### Search

- Provide a clearly labeled search field.
- Use a reasonable debounce for remote searches when appropriate.
- Handle empty queries consistently.
- Provide a clear action to reset the search.

### Filtering

- Show active filters.
- Allow users to remove individual filters.
- Provide a clear-all option when multiple filters are supported.
- Preserve filters during pagination.
- Validate supported filter fields on the backend.

### Sorting

- Clearly indicate the selected sort field and direction.
- Use only supported sort fields.
- Keep sorting consistent across pages.

### Pagination

- Display the current page and available navigation actions.
- Use server-side pagination for collection endpoints.
- Keep page size within the API's permitted limits.
- Return to a valid page when filters reduce the result count.

## 14. Forms and Mutating Actions

Forms should be introduced only for implemented operations.

For each form:

1. Explain the action clearly.
2. Label every field.
3. Validate input.
4. Display field-level errors.
5. Show submission progress.
6. Prevent duplicate submissions.
7. Display success only after confirmed success.
8. Display a safe, actionable error on failure.

For destructive operations, require appropriate authorization and confirmation.

Do not introduce account deactivation, entitlement revocation, identity merging, or other sensitive actions unless the backend behavior and security requirements have been approved and implemented.

## 15. Global UI States

Every data-driven page must handle:

- Initial loading.
- Successful response.
- Empty results.
- Request failure.
- Unauthorized access.
- Missing or deleted records.
- Invalid query parameters.
- Expired authentication.
- Network interruption.

Use consistent messages and recovery actions.

Never show a successful result when the backend operation failed.

## 16. Responsive and Accessible Interaction

- Use an accessible mobile navigation menu.
- Ensure dialogs, menus, forms, tables, and filters work on small screens.
- Remove horizontal page overflow.
- Provide keyboard navigation and visible focus.
- Give icon-only controls accessible names.
- Associate validation errors with their fields.
- Respect reduced-motion preferences.
- Keep important actions discoverable on touch devices.

Where a desktop table does not fit on mobile, use an appropriate responsive table or list presentation rather than shrinking text until it becomes unreadable.

## 17. Navigation and Route Behavior

- The logo navigates to the appropriate home or dashboard route.
- Every navigation item points to an implemented route.
- Breadcrumbs reflect the actual navigation hierarchy.
- Detail pages provide a predictable route back to their parent list.
- Browser back and forward navigation should work correctly.
- Direct navigation to a valid route should render the correct page.
- Invalid routes display a custom 404 page.
- Protected routes must be enforced by the backend, not just hidden in the frontend.
- Query parameters should be used consistently for shareable search and filter state where appropriate.

## 18. UX Acceptance Criteria

A user should be able to:

- Understand the current inventory from the dashboard.
- Find a specific identity, application, or account.
- Navigate between linked entities.
- Inspect entitlements and supporting relationships.
- Understand why a risk finding exists.
- Distinguish verified data, synthetic data, and AI-generated explanations.
- Recover from loading errors and empty results.
- Complete supported actions without confusing or misleading feedback.
- Use the application on desktop and mobile.

All acceptance criteria must be tested against implemented functionality. A documented flow does not mean the corresponding feature already exists.

## 19. Implementation Guidance for Antigravity

Before implementing a page or interaction:

1. Read this document and `design/design-system.md`.
2. Inspect existing routes, components, API contracts, and relevant backend functionality.
3. Identify the applicable user flow.
4. Plan the smallest coherent implementation.
5. Reuse existing components and design tokens.
6. Implement all relevant loading, empty, success, and error states.
7. Verify keyboard behavior, responsiveness, and navigation.
8. Run relevant tests and report any remaining limitations.

Do not build every flow in one large change. Implement and verify the experience incrementally in accordance with `docs/roadmap.md`.

## 20. Final Principle

Every page should answer three questions clearly:

- Where am I?
- What information am I looking at?
- What can I safely do next?

IVIP Mini should feel like a reliable enterprise tool, not a collection of disconnected screens.