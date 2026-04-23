---
ID: US-OLV-016
Title: Browse account portfolio
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Accounts parity port from ops-dashboard

As a account manager
I want a portfolio view of all accounts
So that I can scan the book of business before drilling into one account

Acceptance Criteria:
- [ ] The accounts workspace renders a portfolio state when no account is selected.
- [ ] Portfolio navigation can switch the workspace into a selected account view.

Notes: Implemented through `AccountsApp` and `PortfolioView`; list correctness was not validated against live data.
---
