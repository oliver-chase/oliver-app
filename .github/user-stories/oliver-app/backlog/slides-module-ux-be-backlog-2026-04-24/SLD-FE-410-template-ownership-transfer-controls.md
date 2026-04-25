---
ID: SLD-FE-410
Title: Template Ownership + Collaborator Controls
Status: Partial (Approvals Pending)
Verified: true
Backdated: 2026-04-25
---

As a slide template owner or admin
I want to transfer template ownership and manage collaborator roles from the template library
So governance workflows do not require backend intervention and avoid dead-end delegation paths

Acceptance Criteria:
- [x] Template cards surface current owner context.
- [x] Owner/admin users can open transfer controls and submit a destination email or user id.
- [x] Successful transfer refreshes template library state and records an activity event.
- [x] Owner/admin users can assign and remove collaborator roles (editor/reviewer/viewer) from template cards.
- [x] Collaborator members can see delegated private templates and duplicate them to My Slides.
- [x] Regression coverage validates transfer flow and activity filtering for transfer events.
- [ ] Extend this story with approval UX for ownership transfer and collaborator role changes.
