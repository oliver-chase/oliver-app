---
ID: US-OLV-027
Title: Add new accounts
Status: Code Present
Verified: false
Backdated: 2026-04-18
Milestone: Accounts parity port from ops-dashboard

As a account operator
I want to create accounts with short and full client names
So that new client records can be seeded directly from the portfolio

Acceptance Criteria:
- [ ] The accounts workspace exposes a create-account modal flow.
- [ ] New account creation persists through the shared accounts data hook.

Notes: The create flow exists and includes `client_company`; I did not verify uniqueness or validation edge cases.
---
