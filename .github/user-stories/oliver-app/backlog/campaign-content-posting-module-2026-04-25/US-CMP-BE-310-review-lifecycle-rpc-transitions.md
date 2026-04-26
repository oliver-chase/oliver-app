---
ID: US-CMP-BE-310
Title: Review lifecycle RPC transitions
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-310
Epic: CMP-E3: Review Queue and Approval Integrity
---

As a system
I want backend-enforced submit/approve/reject transitions so invalid state changes cannot happen.
So review integrity does not depend on frontend button disabling.

Acceptance Criteria:
- [ ] RPC transitions enforce Draft -> Needs Review -> Unclaimed or Draft.
- [ ] Rejection requires reason text.
- [ ] Failed transitions return structured errors.
- [ ] Transition writes include activity log entries.
- [ ] Concurrency guards prevent double finalization.
