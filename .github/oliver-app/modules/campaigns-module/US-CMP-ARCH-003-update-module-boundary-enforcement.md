---
ID: US-CMP-ARCH-003
Title: Update module-boundary enforcement
Status: Done
Verified: true
Backdated: 2026-04-25
Ticket: CMP-ARCH-003
Epic: CMP-E0: Module Foundation and Access
---

As a developer
I want module boundary checks to recognize campaigns scope so cross-module imports stay controlled.
So maintainability gates keep passing during campaign build.

Acceptance Criteria:
- [x] `scripts/check-module-boundaries.mjs` includes campaigns scope rules.
- [x] Campaign code can import shared/core primitives only.
- [x] Campaign code cannot import internals of accounts/hr/sdr/slides/reviews/admin.
- [x] Boundary script passes after campaigns files are added.
