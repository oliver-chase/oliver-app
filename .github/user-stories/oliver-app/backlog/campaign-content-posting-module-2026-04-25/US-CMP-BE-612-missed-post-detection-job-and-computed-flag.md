---
ID: US-CMP-BE-612
Title: Missed-post detection job and computed flag
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-612
Epic: CMP-E6: Reminders, Missed Posts, and Notification Jobs
---

As a stakeholder
I want overdue claimed content surfaced as missed so execution gaps are obvious.
So campaigns can be corrected before momentum drops.

Acceptance Criteria:
- [ ] Missed status is computed from claimed + past scheduled_for + grace period.
- [ ] No new lifecycle status is introduced.
- [ ] Missed indicator appears in dashboard/report/calendar datasets.
- [ ] Optional owner notification is sent when item becomes missed.
- [ ] Missed detection events are logged.
