---
ID: US-OLV-007
Title: Preserve auth session
Status: Code Present
Verified: false
Backdated: 2026-04-17
Milestone: Auth strategy changes

As a signed-in employee
I want my Microsoft session to be restored and logged out cleanly
So that I can move through the app without reauth glitches

Acceptance Criteria:
- [ ] The auth provider initializes MSAL and restores or sets the active account.
- [ ] The app exposes login and logout actions through shared auth context.

Notes: Session restore logic is present in `AuthContext`, but browser-level behavior was not verified.
---
