---
ID: US-CMP-FE-1303
Title: Review queue filters and actions parity
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-FE-1303
Epic: CMP-PAR-E2: Workflow State and Review Durability
---

As a reviewer
I want the review queue to expose required operational filters and actions
So I can process the queue by urgency and ownership without manual workarounds

Acceptance Criteria:
- [ ] Review queue filters include: all, unclaimed, assigned to me, changes requested, approved-unscheduled, overdue.
- [ ] Queue rows show title, campaign, channel, submitted by, claimed by, time in review, due date, and priority signal.
- [ ] Row actions support claim, open, approve, request changes, reassign, release claim, and schedule approved item.
- [ ] Unclaimed and overdue items are visually distinct and sorted by urgency.
- [ ] Bulk actions are safely constrained and require required reason inputs where applicable.
- [ ] Queue behavior and labels align with canonical backend statuses and review metadata.
