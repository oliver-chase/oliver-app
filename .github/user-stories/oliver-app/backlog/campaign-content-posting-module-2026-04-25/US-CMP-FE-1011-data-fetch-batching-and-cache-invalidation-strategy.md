---
ID: US-CMP-FE-1011
Title: Data fetch batching and cache invalidation strategy
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-FE-1011
Epic: CMP-E10: Performance and Scale Hardening
---

As a user
I want fast dashboard loads and accurate refresh after mutations.
So I see current data without full reload penalties.

Acceptance Criteria:
- [ ] Initial dashboard load batches independent queries.
- [ ] Mutation success invalidates impacted slices only.
- [ ] Polling/subscription strategy avoids unnecessary fetch storms.
- [ ] Calendar/report views reuse cached filter datasets where safe.
- [ ] Mobile performance remains acceptable on slower networks.
