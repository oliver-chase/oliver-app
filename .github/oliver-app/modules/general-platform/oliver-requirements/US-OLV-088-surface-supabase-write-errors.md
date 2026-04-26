---
ID: US-OLV-088
Title: Surface Supabase write errors
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Operationalize design system, CI, and security

As a operator
I want Supabase write failures shown or reflected in UI state
So that failed saves are not mistaken for success

Acceptance Criteria:
- [ ] dbWrite throws when a Supabase query returns error.
- [ ] dbWriteMulti aggregates operation failures.
- [ ] runWrites updates sync state to syncing, ok, or error.
- [ ] HR quick-add failures revert optimistic records.

Notes: Important because supabase-js v2 does not throw automatically.
---
