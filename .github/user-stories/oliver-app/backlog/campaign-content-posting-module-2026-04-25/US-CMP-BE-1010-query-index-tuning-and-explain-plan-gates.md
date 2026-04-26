---
ID: US-CMP-BE-1010
Title: Query/index tuning and explain-plan gates
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-1010
Epic: CMP-E10: Performance and Scale Hardening
---

As a system owner
I want indexed core queries so list/report pages remain fast under growth.
So user experience remains stable.

Acceptance Criteria:
- [ ] Core list/report queries have supporting indexes.
- [ ] Explain plan review documented for worst-case queries.
- [ ] Slow-query thresholds defined and monitored.
- [ ] Index bloat and maintenance notes are documented.
- [ ] Migration includes rollback-safe index strategy.
