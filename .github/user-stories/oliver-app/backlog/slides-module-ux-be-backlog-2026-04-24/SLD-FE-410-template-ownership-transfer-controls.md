---
ID: SLD-FE-410
Title: Template Ownership Transfer Controls
Status: Partial (Ownership Transfer Live)
Verified: true
Backdated: 2026-04-25
---

As a slide template owner or admin
I want to transfer template ownership to another account from the template library
So delegated ownership handoff does not require backend intervention and avoids dead-end governance workflows

Acceptance Criteria:
- [x] Template cards surface current owner context.
- [x] Owner/admin users can open transfer controls and submit a destination email or user id.
- [x] Successful transfer refreshes template library state and records an activity event.
- [x] Regression coverage validates transfer flow and activity filtering for transfer events.
- [ ] Extend this story with collaborator role matrix (editor/reviewer/viewer) and approval UX.
