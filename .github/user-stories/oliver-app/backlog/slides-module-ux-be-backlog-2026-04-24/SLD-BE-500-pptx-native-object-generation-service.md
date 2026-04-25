---
ID: SLD-BE-500
Title: PPTX Native Object Generation Service
Status: Backlog
Verified: false
Backdated: 2026-04-25
---

As a platform maintainer
I want backend PPTX generation that maps slide components to native PowerPoint objects
So exported decks remain editable and consistent with the source canvas

Acceptance Criteria:
- [ ] Export contract maps supported slide component types to native PPTX text/shape objects.
- [ ] Unsupported component types degrade gracefully with explicit warnings payload.
- [ ] Export response includes warnings summary used by FE warnings report.
- [ ] Export path enforces slide ownership/visibility permissions and row-level ACL.
- [ ] PPTX export actions are captured in `slide_audit_events` with outcome status.
