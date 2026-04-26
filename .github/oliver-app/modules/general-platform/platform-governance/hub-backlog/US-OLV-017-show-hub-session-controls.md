---
ID: US-OLV-017
Title: Show hub session controls
Status: Code Present
Verified: false
Backdated: 2026-04-22
Milestone: Operationalize design system, CI, and security

As a signed-in user
I want to see my signed-in email and sign out from the hub
So that I can confirm the active account and leave the app

Acceptance Criteria:
- [ ] When an MSAL account exists, the hub shows account.username.
- [ ] Clicking Sign out calls the auth logout flow.
- [ ] The session bar is hidden when no account is present.

Notes: Depends on MSAL being configured in the deployed environment.
---
