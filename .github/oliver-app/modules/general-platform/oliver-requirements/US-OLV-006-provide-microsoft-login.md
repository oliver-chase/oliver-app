---
ID: US-OLV-006
Title: Provide Microsoft login
Status: Code Present
Verified: false
Backdated: 2026-04-17
Milestone: Add auth, permissions, admin, and HR migration

As a employee
I want to sign in with Microsoft
So that internal routes are protected by enterprise identity

Acceptance Criteria:
- [ ] The /login route renders a Microsoft sign-in button.
- [ ] Clicking the button starts an MSAL redirect login with openid, profile, email, and User.Read scopes.
- [ ] After login, authenticated users are redirected away from /login.

Notes: Code is present in AuthProvider/AuthGuard/login; end-to-end Azure env behavior is not human-verified.
---
