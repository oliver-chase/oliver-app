---
ID: US-OLV-010
Title: Restrict module visibility
Status: Broken
Verified: false
Backdated: 2026-04-17
Milestone: Add auth, permissions, admin, and HR migration

As a admin
I want module cards hidden unless a user has permission
So that employees only enter approved workspaces

Acceptance Criteria:
- [ ] Hub filters non-coming-soon modules by hasPermission when permissions are ready.
- [ ] The empty state appears when no modules are assigned.
- [ ] CRM remains admin-only while marked coming soon.

Notes: UserContext currently returns default null user and hasPermission false; hub bypass shows modules before permissions are ready.
---
