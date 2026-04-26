---
ID: US-CMP-BE-610
Title: Reminder records and ICS payload generation
Status: Done
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-610
Epic: CMP-E6: Reminders, Missed Posts, and Notification Jobs
---

As a claimer
I want calendar reminders generated from scheduled posts so I do not miss posting windows.
So planned posts remain visible in personal calendars.

Acceptance Criteria:
- [ ] Claim action creates pending reminder record.
- [ ] ICS payload includes title, scheduled time, module link, and posting instruction text.
- [ ] ICS generation does not mutate content state.
- [ ] ICS remains compatible with Outlook and Apple Calendar.
- [ ] Reminder record is canceled when unclaimed or posted early.
