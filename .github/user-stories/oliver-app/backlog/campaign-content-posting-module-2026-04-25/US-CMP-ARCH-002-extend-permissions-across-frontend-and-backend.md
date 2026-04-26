---
ID: US-CMP-ARCH-002
Title: Extend permissions across frontend and backend
Status: Done
Verified: false
Backdated: 2026-04-25
Ticket: CMP-ARCH-002
Epic: CMP-E0: Module Foundation and Access
---

As an admin
I want to grant or revoke campaign access so users only see module data they are allowed to use.
So permission boundaries remain consistent across UI and API.

Acceptance Criteria:
- [ ] `PagePermission` includes `campaigns` in frontend types.
- [ ] `/api/users` validates `campaigns` as a valid permission.
- [ ] Admin UserManager can toggle `campaigns` permission.
- [ ] Owner full-permission enforcement includes `campaigns`.
- [ ] No regression in existing module permissions.
