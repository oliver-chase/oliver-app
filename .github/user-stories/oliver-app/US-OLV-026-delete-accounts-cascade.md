---
ID: US-OLV-026
Title: Delete accounts cascade
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Port Accounts UX and complete module hub shell

As a account manager
I want to permanently delete an account and related records
So that bad or duplicate accounts can be removed when archiving is insufficient

Acceptance Criteria:
- [ ] Delete confirmation warns that all account data will be removed.
- [ ] deleteAccountCascade deletes related stakeholders, actions, notes, opportunities, projects, background, and engagements.
- [ ] After success, the deleted account is removed from local state and portfolio view is shown.

Notes: Failure is logged; there is no visible recovery toast for this path.
---
