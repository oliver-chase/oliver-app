---
ID: US-OLV-008
Title: Guard private routes
Status: Code Present
Verified: false
Backdated: 2026-04-17
Milestone: Add auth, permissions, admin, and HR migration

As a security owner
I want private app routes to require authentication
So that unauthenticated visitors cannot see operations data

Acceptance Criteria:
- [ ] AuthGuard allows /login as a public path.
- [ ] Unauthenticated users on private paths are redirected to /login/.
- [ ] Authenticated users visiting /login are redirected to /.

Notes: Code present; historical docs conflict with current MSAL reintroduction.
---
