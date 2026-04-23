---
ID: US-OLV-022
Title: Open account detail
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Port Accounts UX and complete module hub shell

As a account manager
I want to open a full account detail page
So that I can manage sections for one account

Acceptance Criteria:
- [ ] Selecting an account sets currentAccountId.
- [ ] AccountView receives the selected account id and shared app state.
- [ ] Back to all accounts clears the selected account and returns to portfolio.

Notes: Rendered inside an ErrorBoundary that reports AccountView crashes.
---
