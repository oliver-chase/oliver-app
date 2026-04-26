---
ID: US-OLV-065
Title: Run accounts chat flows
Status: Code Present
Verified: false
Backdated: 2026-04-22
Milestone: Add module chat flows and story backfill docs

As a account manager
I want Oliver account flows for account planning actions
So that I can perform account tasks conversationally

Acceptance Criteria:
- [ ] AccountsApp registers flows from buildAccountsFlows.
- [ ] Flows receive accounts, stakeholders, actions, notes, opportunities, projects, and currentAccountId.
- [ ] Account flows can add or save accounts through provided callbacks.
- [ ] Flow completion can refresh account data.

Notes: Specific flow list is derived from src/app/accounts/flows.ts.
---
