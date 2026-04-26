---
ID: US-OLV-012
Title: Operate admin workspace
Status: Code Present
Verified: false
Backdated: 2026-04-17
Milestone: Add auth, permissions, admin, and HR migration

As a admin
I want an Admin route with Users, Design Tokens, and Components tabs
So that I can manage app governance from one workspace

Acceptance Criteria:
- [ ] The /admin route renders tab buttons for Users, Design Tokens, and Components.
- [ ] Selecting a tab swaps the active admin panel without leaving the page.
- [ ] Non-admin app users are redirected to the hub.

Notes: The route now checks the mounted `UserProvider`; live access still depends on `/api/users` and a seeded admin row in `app_users`.
---
