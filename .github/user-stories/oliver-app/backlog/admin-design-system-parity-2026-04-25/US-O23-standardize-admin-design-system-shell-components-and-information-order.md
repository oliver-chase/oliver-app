---
ID: US-O23
Title: Standardize Admin and Design System Shell Components and Information Order
Status: Not Started
Verified: false
Backdated: 2026-04-25
---

As a user moving between privileged pages  
I want Admin and Design System to use the same shared shell components and sensible control ordering as the rest of the app  
So the product stays visually coherent and operationally easy to scan.

Current state:
- Oliver Admin and Design System currently use `AdminShell`, but their internal control structure diverges from other module topbars and from each other in [src/app/admin/page.tsx](/Users/oliver/projects/oliver-app/src/app/admin/page.tsx:96) and [src/app/design-system/page.tsx](/Users/oliver/projects/oliver-app/src/app/design-system/page.tsx:534).
- The persistent global admin chip styling also diverges from the canonical hub button treatment in [src/components/admin/AdminEntryButton.tsx](/Users/oliver/projects/oliver-app/src/components/admin/AdminEntryButton.tsx:8).
- Tesknota parity source uses a tighter shared component vocabulary for topbars, pills, search, selects, pagination, section headers, and modal controls in [tesknota admin design page](</Users/oliver/projects/tesknota/app/(app)/admin/design/page.tsx>).

Acceptance Criteria:
- [ ] Admin and Design System topbars use the same canonical shared components as other Oliver modules wherever the behavior matches.
- [ ] Buttons, dropdowns, pills, search inputs, section headers, and empty states avoid one-off visual treatments when a shared component already exists.
- [ ] Headers, filters, dropdowns, and primary actions are grouped in a sensible reading order with related controls adjacent.
- [ ] Information display hierarchy is consistent across Admin and Design System and does not mix unrelated control groups.
- [ ] Any unavoidable exception to shared component usage is documented with a concrete reason.
