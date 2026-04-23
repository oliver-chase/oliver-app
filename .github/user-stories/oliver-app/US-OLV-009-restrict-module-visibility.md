---
ID: US-OLV-009
Title: Restrict module visibility
Status: Broken
Verified: false
Backdated: 2026-04-17
Milestone: Auth strategy changes

As a non-admin employee
I want the hub to show only the modules I am allowed to use
So that access control is enforced in the product UI

Acceptance Criteria:
- [ ] Module visibility is derived from the resolved app user permissions.
- [ ] Coming-soon and admin-only surfaces are hidden when the user lacks access.

Notes: Broken in current code: `UserContext` is an unmounted bypass stub, so real per-user permission enforcement is not active.
---
