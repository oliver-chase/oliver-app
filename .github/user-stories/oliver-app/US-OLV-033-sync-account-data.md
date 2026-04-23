---
ID: US-OLV-033
Title: Sync account data
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Accounts parity port from ops-dashboard

As a account operator
I want account data loading and optimistic updates handled centrally
So that the workspace stays responsive while persisting to Supabase

Acceptance Criteria:
- [ ] A shared hook loads all account-domain tables into app state.
- [ ] Core account writes update local state and reconcile against Supabase persistence.

Notes: The hook and helpers exist; I did not verify every rollback path under failure.
---
