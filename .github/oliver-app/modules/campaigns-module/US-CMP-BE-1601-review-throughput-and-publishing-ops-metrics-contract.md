---
ID: US-CMP-BE-1601
Title: Review throughput and publishing ops metrics contract
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-1601
Epic: CMP-PAR-E5: Operational Reporting and Throughput Clarity
---

As a stakeholder
I want reporting metrics to include review throughput and publishing operations detail
So campaign health can be evaluated without manual analysis

Acceptance Criteria:
- [ ] Reporting contract includes average time in review, approved count, changes-requested count, and overdue review count.
- [ ] Publishing contract includes scheduled, posted, missed, and delayed counts.
- [ ] Metrics support campaign, date-range, channel, and status scoping.
- [ ] Metrics are computed from durable review/schedule/reminder models, not client-only inference.
- [ ] API responses are versioned or backward-compatible for existing report consumers.
- [ ] Query plans and indexes are documented for expected reporting load.
