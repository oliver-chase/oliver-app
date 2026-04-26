---
ID: US-OLV-007
Title: Preserve auth session
Status: Code Present
Verified: false
Backdated: 2026-04-17
Milestone: Add auth, permissions, admin, and HR migration

As a employee
I want my Microsoft session restored on page reload
So that I do not have to sign in repeatedly during work

Acceptance Criteria:
- [ ] AuthProvider initializes MSAL in the browser.
- [ ] Redirect responses set the active account.
- [ ] Existing MSAL accounts are restored from localStorage cache.

Notes: Depends on configured Azure client and tenant environment variables.
---
