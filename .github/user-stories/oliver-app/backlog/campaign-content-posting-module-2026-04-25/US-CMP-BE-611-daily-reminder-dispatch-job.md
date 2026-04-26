---
ID: US-CMP-BE-611
Title: Daily reminder dispatch job
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-611
Epic: CMP-E6: Reminders, Missed Posts, and Notification Jobs
---

As a system owner
I want idempotent daily reminders so users are notified once per due item.
So reminder automation is reliable and non-spammy.

Acceptance Criteria:
- [ ] Job processes only claimed, unposted, due-today items.
- [ ] Job skips canceled reminders.
- [ ] Job marks sent/failure status and stores failure reason.
- [ ] Job is idempotent across repeated executions.
- [ ] Slack/email channel dispatch is feature-flagged by environment capability.
