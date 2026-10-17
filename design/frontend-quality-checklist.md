# IVIP Mini — Professional Frontend Quality Standard

## Objective

Build a polished, professional, production-quality identity security dashboard that feels like a real enterprise SaaS product, not a generic AI-generated template. Prioritize a distinctive visual identity, consistent design, usability, accessibility, responsive behavior, and functional interactions.

## Design Requirements

- Use a clean, modern enterprise-security aesthetic with deliberate typography, spacing, alignment, colors, and visual hierarchy.
- Create a distinctive identity for IVIP Mini with a custom logo, proper favicon, consistent branding, and a professional application shell.
- Support light and dark themes with consistent design tokens.
- Use reusable components, consistent buttons, cards, tables, forms, dialogs, badges, and navigation.
- Design meaningful dashboard visualizations, identity relationship views, risk indicators, and data tables without unnecessary decoration.
- Avoid excessive gradients, glassmorphism, random animations, oversized headings, generic landing-page layouts, and repetitive AI-generated card grids.
- Use realistic synthetic data where needed and clearly distinguish demo data from real integrations.
- Include polished loading, empty, success, error, and permission-denied states.

## Functional and Technical Checklist

- [ ] Remove horizontal scrolling and prevent mobile overflow.
- [ ] Make every page responsive and usable on mobile, tablet, and desktop.
- [ ] Add a functional mobile navigation menu.
- [ ] Add a custom favicon and appropriate application icons.
- [ ] Add a clickable logo that navigates to the correct home or dashboard route.
- [ ] Set unique, meaningful page titles and meta descriptions.
- [ ] Fix broken links, footer links, buttons, and navigation routes.
- [ ] Remove placeholder text, dead controls, unused navigation, and unfinished UI.
- [ ] Add a custom 404 page and appropriate error boundaries.
- [ ] Display clear success, validation, and error messages.
- [ ] Add confirmation dialogs for destructive actions.
- [ ] Make email addresses and phone numbers clickable wherever applicable.
- [ ] Optimize images, assets, fonts, and loading performance.
- [ ] Use accessible labels, keyboard navigation, visible focus states, and sufficient color contrast.
- [ ] Ensure forms provide validation feedback and prevent accidental duplicate submissions.
- [ ] Verify the copyright year dynamically.
- [ ] Respect reduced-motion preferences and avoid unnecessary animation.
- [ ] Ensure tables, charts, dialogs, and navigation remain usable on small screens.

## Engineering Rules

- Inspect the existing project before changing files.
- Follow the approved React, TypeScript, Vite, API, and design-system architecture.
- Use reusable components and centralized design tokens instead of duplicated styles.
- Connect controls to real application behavior or clearly mark unavailable functionality; never use decorative buttons that do nothing.
- Do not invent backend integrations or display synthetic data as verified real data.
- Preserve authentication, authorization, validation, and security controls.
- Avoid unnecessary dependencies and excessive refactoring.
- Keep the frontend maintainable, accessible, and performant.

## Final Verification

Before declaring the frontend complete:

1. Test every route, navigation item, link, and interactive control.
2. Check mobile layouts and remove horizontal overflow.
3. Verify favicon, page titles, metadata, logo navigation, and the 404 page.
4. Test loading, empty, success, validation, and error states.
5. Run linting, type checking, tests, and the production build where configured.
6. Fix discovered issues and report any remaining limitations honestly.

**Definition of done:** The interface must feel cohesive, distinctive, responsive, accessible, secure, and production-ready—not merely visually attractive in a screenshot.