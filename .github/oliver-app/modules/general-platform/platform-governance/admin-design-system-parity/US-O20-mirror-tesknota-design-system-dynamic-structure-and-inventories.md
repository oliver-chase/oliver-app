---
ID: US-O20
Title: Mirror Tesknota Design System Dynamic Structure and Inventories
Status: Not Started
Verified: false
Backdated: 2026-04-25
---

As a design-system steward  
I want Oliver's Design System page to mirror Tesknota's dynamic structure and inventories  
So reference data, section organization, and component discovery behave consistently across products.

Current state:
- Oliver's Design System is a standalone curated reference page in [src/app/design-system/page.tsx](/Users/oliver/projects/oliver-app/src/app/design-system/page.tsx:534).
- Tesknota's parity target already provides a richer admin-native design page with dynamic sections, inventories, and reference/edit modes in [tesknota admin design page](</Users/oliver/projects/tesknota/app/(app)/admin/design/page.tsx>).
- Oliver already has dynamic registries such as module inventory, admin nav inventory, and component catalog available to the page in [src/app/design-system/page.tsx](/Users/oliver/projects/oliver-app/src/app/design-system/page.tsx:524).

Acceptance Criteria:
- [ ] Oliver Design System mirrors the high-level section structure and information hierarchy of Tesknota's admin design page where the domains overlap.
- [ ] Dynamic inventories for modules, admin navigation, components, and token/runtime references are grouped logically and surfaced as first-class reference sections.
- [ ] Section headers, labels, and explanatory notes follow one consistent hierarchy instead of mixed one-off layouts.
- [ ] Related controls and dropdowns are grouped together so scanning order makes sense.
- [ ] Any intentional Oliver-vs-Tesknota structural difference is documented in code comments or backlog notes instead of drifting silently.
