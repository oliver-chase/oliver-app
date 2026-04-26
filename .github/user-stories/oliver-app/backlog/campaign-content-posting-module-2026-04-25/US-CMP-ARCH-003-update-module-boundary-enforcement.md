---
ID: US-CMP-ARCH-003
Title: Update module-boundary enforcement
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-ARCH-003
Epic: CMP-E0: Module Foundation and Access
---

As a developer
I want module boundary checks to recognize campaigns scope so cross-module imports stay controlled.
So maintainability gates keep passing during campaign build.

Acceptance Criteria:
- [ ] `scripts/check-module-boundaries.mjs` includes campaigns scope rules.
- [ ] Campaign code can import shared/core primitives only.
- [ ] Campaign code cannot import internals of accounts/hr/sdr/slides/reviews/admin.
- [ ] Boundary script passes after campaigns files are added.
