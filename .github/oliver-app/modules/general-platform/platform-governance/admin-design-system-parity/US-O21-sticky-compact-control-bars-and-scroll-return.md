---
ID: US-O21
Title: Sticky Compact Control Bars and Scroll Return for Admin and Design System
Status: Not Started
Verified: false
Backdated: 2026-04-25
---

As an admin user  
I want compact top spacing, persistent filter bars, and a safe return-to-top control  
So I can keep switching views without repeatedly scrolling back to the top or losing context.

Current state:
- Admin tabs render near the top of [src/app/admin/page.tsx](/Users/oliver/projects/oliver-app/src/app/admin/page.tsx:96) but do not currently define the requested sticky compact behavior.
- Oliver Design System uses a large standalone page shell with anchor navigation in [src/app/design-system/page.tsx](/Users/oliver/projects/oliver-app/src/app/design-system/page.tsx:548).
- Tesknota's parity reference includes sticky controls and section scrolling behavior in [tesknota admin design page](</Users/oliver/projects/tesknota/app/(app)/admin/design/page.tsx>).

Acceptance Criteria:
- [ ] Admin and Design System top spacing matches the tighter component-layout baseline instead of oversized page offsets.
- [ ] Primary filter/tab/navigation bars remain visible while scrolling through long admin/design-system content.
- [ ] Sticky controls do not overlap headings, form controls, modals, or anchor targets.
- [ ] A visible top-right `Back to top` or equivalent control exists and does not sit on top of active content.
- [ ] Users can repeatedly click top filter controls while deep in the page without manually scrolling back up.
- [ ] Keyboard focus order, anchor jumps, and reduced-motion behavior remain usable.
