---
ID: US-O25
Title: Enforce Component-Mapped UI and Token-Sourced Styling Across Oliver
Status: Not Started
Verified: false
Backdated: 2026-04-25
---

As a platform owner
I want every Oliver surface to map to shared components and token-backed styling
So the product stays consistent, maintainable, and free of per-page hardcoded drift

Acceptance Criteria:
- [ ] Admin, Design System, Hub, and Slides identify and use the closest existing shared component for each interaction pattern before introducing new UI primitives.
- [ ] When no suitable component exists, a new shared component is added to the component library and reused by consuming pages (instead of page-local hardcoding).
- [ ] Module feature pages do not introduce raw color literals for theme styling; values are sourced from token/runtime configuration.
- [ ] A static check (lint/script) flags direct style/token drift in guarded folders.
- [ ] Storybook/component preview coverage is updated for any new shared component variants.
- [ ] Regression tests verify no visual regressions for primary admin + slides flows after component remapping.

