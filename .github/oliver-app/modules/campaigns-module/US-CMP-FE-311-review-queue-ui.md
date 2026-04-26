---
ID: US-CMP-FE-311
Title: Review queue UI
Status: Done
Verified: false
Backdated: 2026-04-25
Ticket: CMP-FE-311
Epic: CMP-E3: Review Queue and Approval Integrity
---

As a reviewer
I want a queue sorted by oldest submitted first so pending content gets processed in order.
So review backlog remains visible and actionable.

Acceptance Criteria:
- [ ] Queue defaults to `needs_review` content only.
- [ ] Each row shows title, type, topic, campaign, creator, submitted timestamp.
- [ ] Approve and reject actions are role-gated.
- [ ] Empty queue state is explicit.
- [ ] Queue refreshes when concurrent review conflict is detected.
