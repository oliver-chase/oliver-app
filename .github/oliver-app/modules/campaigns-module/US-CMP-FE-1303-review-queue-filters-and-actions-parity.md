---
ID: US-CMP-FE-1303
Title: Review queue filters and actions parity
Status: Done
Verified: false
Backdated: 2026-04-25
Ticket: CMP-FE-1303
Epic: CMP-PAR-E2: Workflow State and Review Durability
---

As a reviewer
I want the review queue to expose required operational filters and actions
So I can process the queue by urgency and ownership without manual workarounds

Acceptance Criteria:
- [x] Review queue filters include: all, unclaimed, assigned to me, changes requested, approved-unscheduled, overdue.
- [x] Queue rows show title, campaign, channel, submitted by, claimed by, time in review, due date, and priority signal.
- [x] Row actions support claim, open, approve, request changes, reassign, release claim, and schedule approved item.
- [x] Unclaimed and overdue items are visually distinct and sorted by urgency.
- [x] Bulk actions are safely constrained and require required reason inputs where applicable.
- [x] Queue behavior and labels align with canonical backend statuses and review metadata.

Execution Update (2026-04-26):
- Added queue filter control with operational views (`needs-review`, `all`, `unclaimed`, `assigned-to-me`, `changes-requested`, `approved-unscheduled`, `overdue`).
- Added row-level operational metadata (campaign/channel/submitted/claimed/time-in-review/due/priority) and urgency-centric ordering.
- Added row actions for open, claim-and-schedule, release claim, reassign-to-me, approve, and request changes; bulk selection is constrained to `needs_review` rows.
- Added canonical lifecycle/review metadata labels in queue rows (legacy-compatible fallback) to align reviewer-facing labels with normalized backend status fields during migration window.
