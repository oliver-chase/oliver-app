---
ID: US-OLV-047
Title: Sync account data
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Port Accounts UX and complete module hub shell

As a account manager
I want visible sync status while account data loads or saves
So that I know whether changes reached the backend

Acceptance Criteria:
- [ ] useAccountsData sets loading state during initial fetch.
- [ ] Save paths report syncing/ok/error states.
- [ ] Topbar sync text updates from that state.
- [ ] Fetch errors render an app error message.

Notes: Some individual save failures are console-only and should be verified.
---
