---
ID: US-OLV-117
Title: Maintain tech debt state docs
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Operationalize design system, CI, and security

As a maintainer
I want current-state and locked-invariant docs
So that future changes do not regress load-bearing behavior

Acceptance Criteria:
- [ ] src/tech-debt/STATE.md documents repo/deploy status and module map.
- [ ] src/tech-debt/locked.md documents locked invariants.
- [ ] Stale QA docs are archived under src/tech-debt/archive.
- [ ] Docs identify retired components and banned patterns.

Notes: These docs can become stale and should be updated with code changes.
---
