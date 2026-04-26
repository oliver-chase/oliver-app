---
ID: US-O25
Title: Enforce Component-Mapped UI and Token-Sourced Styling Across Oliver
Status: Done
Verified: true
Backdated: 2026-04-25
---

As a platform owner
I want every Oliver surface to map to shared components and token-backed styling
So the product stays consistent, maintainable, and free of per-page hardcoded drift

Acceptance Criteria:
- [x] Admin, Design System, Hub, and Slides identify and use the closest existing shared component for each interaction pattern before introducing new UI primitives.
- [x] When no suitable component exists, a new shared component is added to the component library and reused by consuming pages (instead of page-local hardcoding).
- [x] Module feature pages do not introduce raw color literals for theme styling; values are sourced from token/runtime configuration.
- [x] A static check (lint/script) flags direct style/token drift in guarded folders.
- [x] Storybook/component preview coverage is updated for any new shared component variants.
- [x] Regression tests verify no visual regressions for primary admin + slides flows after component remapping.

Implementation Evidence (2026-04-26):
- Added shared notice primitive and styling:
  - `src/components/shared/AppNotice.tsx`
  - `src/components/shared/AppNotice.module.css`
- Remapped existing page-local notices to shared component usage:
  - `src/components/admin/UserManager.tsx`
  - `src/components/admin/TokenEditor.tsx`
  - `src/app/page.tsx`
  - `src/app/slides/page.tsx`
- Added design-system preview coverage and catalog registration for the new primitive:
  - `src/components/admin/ComponentLibrary.tsx`
  - `src/modules/design-catalog.ts`
- Added guarded token/style drift check and wired it into lint:
  - `scripts/check-guarded-token-drift.mjs`
  - `package.json` (`check-guarded-token-drift` + `lint` composition)
- Removed hardcoded color literals from guarded feature surfaces and routed to token/runtime values:
  - `src/app/slides/page.tsx`
  - `src/app/slides/slides.css`
  - `src/app/admin/flows.ts`
  - `src/lib/theme-tokens.ts`
- Regression verification:
  - `npx playwright test tests/e2e/frontend-smoke.spec.ts --grep "hub cards and admin links navigate correctly|hub startup telemetry records budgeted auth and permission warm-path timings|admin user manager surfaces backend failures and recovers after refresh|design system interactive controls behave consistently"`
  - `npx playwright test tests/e2e/slides-regression.spec.ts --grep "US-SLD-020 renders scaled 16:9 canvas layers from component json and supports baseline inline edits|SLD-FE-400 and SLD-BE-400 support visibility controls and template ownership governance"`
