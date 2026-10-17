# IVIP Mini — Design System

## 1. Purpose

Define a consistent, professional design language for IVIP Mini, an identity inventory and risk exploration dashboard. The interface should feel like a mature enterprise SaaS security product: clear, distinctive, data-focused, accessible, and trustworthy.

Avoid generic AI-generated layouts, excessive decoration, inconsistent spacing, and unnecessary visual effects.

## 2. Design Principles

- **Clarity first:** Prioritize identity information, access relationships, and risk findings.
- **Professional appearance:** Use restrained colors, deliberate typography, consistent spacing, and strong visual hierarchy.
- **Data integrity:** Clearly distinguish real application data, synthetic demonstration data, and AI-generated explanations.
- **Consistency:** Reuse design tokens and shared components across all pages.
- **Efficiency:** Make common tasks discoverable with minimal navigation.
- **Accessibility:** Support keyboard navigation, visible focus, readable text, and sufficient contrast.
- **Responsive by default:** Design for desktop, tablet, and mobile.
- **Functional completeness:** Every interactive control must have a defined behavior.

## 3. Visual Identity

Create a distinctive IVIP Mini identity suitable for an identity-security product.

- Use a simple custom logo or symbol inspired by identity, connected nodes, or access relationships.
- Keep the logo legible at small sizes.
- Provide a favicon and application icon consistent with the logo.
- Use a restrained visual language rather than decorative cybersecurity clichés.
- Do not copy another company's logo, branding, or proprietary interface.
- Keep the branding consistent across the sidebar, login screen, browser tab, and error pages.

## 4. Color System

Use centralized CSS variables or equivalent design tokens. Avoid hardcoding colors repeatedly throughout components.

Suggested palette:

### Light theme

- Primary background: `#F7F8FA`
- Surface: `#FFFFFF`
- Primary text: `#172033`
- Secondary text: `#64748B`
- Borders: `#E2E8F0`
- Primary action: `#3157D5`
- Success: `#15803D`
- Warning: `#B45309`
- Error: `#B91C1C`
- Informational: `#0369A1`

### Dark theme

- Primary background: `#0B1020`
- Surface: `#121A2B`
- Elevated surface: `#182338`
- Primary text: `#F1F5F9`
- Secondary text: `#A5B4C7`
- Borders: `#29364A`
- Primary action: `#8098FF`

Use semantic color tokens for success, warning, error, and informational states in both themes. Verify contrast before finalizing the palette.

Risk severity colors must remain consistent throughout tables, charts, finding details, and badges. Never rely on color alone to communicate severity; include text or an icon.

## 5. Typography

Use a professional, readable sans-serif typeface. Prefer a well-supported system font stack or one carefully selected font family.

Suggested hierarchy:

- Page title: 28–32 px on desktop.
- Section heading: 20–24 px.
- Card heading: 14–16 px.
- Body text: 14–16 px.
- Supporting text: 12–13 px.
- Table content: 13–14 px.
- Numeric metrics: clear, aligned, and easy to scan.

Use consistent font weights and line heights. Avoid excessive uppercase text, oversized typography, and too many font families.

## 6. Spacing, Layout, and Shape

Use a consistent spacing scale based on 4 px increments.

Suggested values: 4, 8, 12, 16, 24, 32, and 40 px.

- Use a consistent content grid and page padding.
- Keep card padding and table spacing consistent.
- Use subtle borders and restrained shadows.
- Prefer small, consistent corner radii, generally 6–12 px.
- Avoid excessive nested cards.
- Maintain readable line lengths and adequate whitespace.
- Prevent horizontal overflow at every supported viewport.

## 7. Application Shell

Use a consistent application shell for authenticated pages.

### Sidebar

Include relevant navigation items:

- Overview
- Identities
- Applications
- Accounts
- Entitlements
- Risk Findings
- Background Tasks, when implemented
- Settings, when implemented

Use clear icons, readable labels, a visible active state, and accessible keyboard interactions.

Allow the sidebar to collapse on desktop if useful. On mobile, use an accessible drawer or menu with an appropriate close behavior.

Do not expose navigation items for features that do not exist.

### Top Bar

Where appropriate, include:

- Breadcrumbs or page context.
- Page-level actions.
- Theme toggle.
- Current user menu and logout.
- Notifications only when backed by actual functionality.

Do not fill the top bar with decorative controls or inactive icons.

## 8. Reusable Components

Build shared components where they improve consistency:

- Buttons and icon buttons
- Inputs, selects, and textareas
- Search fields
- Cards and metric summaries
- Data tables
- Pagination controls
- Tabs
- Status and severity badges
- Tooltips
- Dropdown menus
- Dialogs and confirmation dialogs
- Toast notifications
- Breadcrumbs
- Empty states
- Loading skeletons
- Error states
- Page headers
- Filter bars

Each component should have documented variants and clear interaction states.

Buttons must support disabled and loading states where applicable. Inputs must show labels, validation errors, and focus states. Dialogs must support keyboard interaction and appropriate focus management.

## 9. Dashboard Design

The overview dashboard should help users understand the state of their identity inventory quickly.

Possible elements, depending on implemented backend data:

- Total identities.
- Total applications.
- Total accounts.
- Total entitlements.
- Open risk findings by severity.
- Recent ingestion or discovery activity.
- Recent risk findings.
- Identity and account inventory trends, if meaningful data exists.

Each metric must have a clear label and a traceable data source. Do not invent metrics or display hardcoded values as live data.

Avoid unnecessary charts. Every chart must answer a useful question and include readable labels, legends where needed, and accessible alternatives.

## 10. Tables and Data Exploration

Tables are central to IVIP Mini.

- Support readable columns and consistent alignment.
- Use predictable sorting and filtering controls.
- Include pagination for large result sets.
- Provide useful empty, loading, and error states.
- Make row actions discoverable without overcrowding the table.
- Use responsive layouts or an alternative mobile presentation when tables become too wide.
- Keep important identifiers, statuses, and severity labels visible.
- Use monospaced text selectively for technical identifiers.

Search, sorting, filtering, and pagination must connect to actual application behavior.

## 11. Identity and Risk Visualization

Identity relationships and risk findings should be understandable without requiring users to interpret decorative graphics.

- Display identities, accounts, applications, and entitlements with clear entity labels.
- Distinguish verified relationships from uncertain matches.
- Provide access to the underlying evidence.
- Explain risk severity with both a label and a visual indicator.
- Show the reason a finding exists and the rule that produced it.
- Clearly mark AI-generated explanations.
- Never represent a proposed relationship as verified without supporting evidence.

Graph visualizations must have a readable alternative, such as a relationship table or structured list.

## 12. Light and Dark Themes

Support both light and dark themes using centralized design tokens.

- Provide an accessible theme toggle.
- Persist the preference only through an approved client-side mechanism.
- Apply theme changes consistently across every page and component.
- Check text, borders, badges, charts, forms, dialogs, and focus indicators in both themes.
- Avoid pure-black backgrounds and excessive neon colors unless specifically justified by the design.
- Respect the user's system preference when no explicit preference is saved.

## 13. Responsive Design

Support desktop, tablet, and mobile without horizontal page scrolling.

- Desktop: full sidebar and multi-column dashboard where useful.
- Tablet: tighter grids and adaptable navigation.
- Mobile: compact navigation, stacked metrics, readable forms, and responsive tables or list views.

Use content-driven breakpoints rather than targeting a single device model. Test narrow screens, long identifiers, large text, dialogs, and error messages.

## 14. Accessibility

Target WCAG 2.2 AA where practical.

- Maintain sufficient text and interface contrast.
- Use semantic HTML and appropriate labels.
- Support keyboard navigation.
- Provide visible focus indicators.
- Associate validation errors with their inputs.
- Use accessible names for icon-only controls.
- Avoid communicating state through color alone.
- Respect reduced-motion preferences.
- Ensure charts and relationship views have accessible text alternatives.

## 15. Motion and Feedback

Use animation only when it helps communicate state or relationships.

- Keep transitions short and subtle.
- Avoid continuous decorative motion.
- Show loading states for asynchronous actions.
- Show success messages after successful operations.
- Provide actionable error messages.
- Confirm destructive actions where appropriate.
- Avoid displaying success before the backend confirms success.

## 16. Branding and Browser Experience

- Use a custom favicon consistent with IVIP Mini branding.
- Set meaningful page titles.
- Provide suitable meta descriptions for public pages.
- Use consistent logo and application naming.
- Provide a custom 404 page and appropriate error boundaries.
- Optimize images and assets.
- Avoid placeholder text and broken navigation.
- Include contact links only when actual contact details are available.

## 17. Implementation Rules

- Inspect the existing frontend before introducing new components or styling.
- Keep design tokens centralized.
- Follow the approved React, TypeScript, and Vite architecture.
- Reuse components where appropriate without overengineering.
- Avoid unnecessary dependencies and duplicated CSS.
- Preserve authentication and authorization behavior.
- Never use frontend-only checks as a replacement for backend access control.
- Keep mock data clearly identified.
- Do not claim a design requirement is complete without verifying it.

## 18. Definition of Done

The design system is correctly applied when:

- Pages use consistent tokens, typography, spacing, and components.
- Light and dark themes are usable.
- The application is responsive and accessible.
- Dashboard data is clear and not misleading.
- Identity relationships and risk severity are understandable.
- Interactive states are consistent.
- No visible placeholder controls or unfinished styling remain.
- The visual identity feels cohesive and distinctive across the application.