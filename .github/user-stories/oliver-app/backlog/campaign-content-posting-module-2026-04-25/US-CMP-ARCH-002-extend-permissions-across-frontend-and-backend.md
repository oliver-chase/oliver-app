---
ID: US-CMP-ARCH-002
Title: Extend permissions across frontend and backend
Status: Done
Verified: true
Backdated: 2026-04-25
Ticket: CMP-ARCH-002
Epic: CMP-E0: Module Foundation and Access
---

As an admin
I want to grant or revoke campaign access so users only see module data they are allowed to use.
So permission boundaries remain consistent across UI and API.

Acceptance Criteria:
- [x] `PagePermission` includes `campaigns` in frontend types.
- [x] `/api/users` validates `campaigns` as a valid permission.
- [x] Admin UserManager can toggle `campaigns` permission.
- [x] Owner full-permission enforcement includes `campaigns`.
- [x] No regression in existing module permissions.
