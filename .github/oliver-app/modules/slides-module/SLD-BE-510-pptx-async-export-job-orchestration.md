---
ID: SLD-BE-510
Title: PPTX Async Export Job Orchestration
Status: Backlog
Verified: false
Backdated: 2026-04-25
---

As a platform maintainer
I want asynchronous orchestration for larger PPTX export workloads
So multi-slide or heavy export requests stay reliable under production load

Acceptance Criteria:
- [ ] PPTX export jobs support queued/running/succeeded/failed lifecycle states.
- [ ] Job payload includes selected slide ids, requester identity, and generation options.
- [ ] Retry policy is bounded and idempotent for transient generation/storage failures.
- [ ] Completed jobs expose downloadable artifact metadata and expiration policy.
- [ ] Job lifecycle events are queryable for operational and compliance diagnostics.
