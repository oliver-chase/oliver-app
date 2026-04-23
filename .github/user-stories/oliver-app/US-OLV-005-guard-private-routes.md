---
ID: US-OLV-005
Title: Guard private routes
Status: Code Present
Verified: false
Backdated: 2026-04-17
Milestone: Auth strategy changes

As a signed-out visitor
I want private routes to redirect me to login
So that internal pages do not render without authentication

Acceptance Criteria:
- [ ] An auth guard blocks non-public routes until auth state is ready.
- [ ] Authenticated users are redirected away from the login route back into the app.

Notes: The guard is wired in the root layout and appears active, but end-to-end redirect behavior was not tested.
---
