---
ID: US-CMP-FE-1403
Title: Calendar scheduled vs unscheduled operations view
Status: In Progress
Verified: false
Backdated: 2026-04-25
Ticket: CMP-FE-1403
Epic: CMP-PAR-E3: Scheduling and Reminders Operational Backbone
---

As a campaign planner
I want the calendar to clearly separate scheduled items from approved-unscheduled work
So I can close scheduling gaps before due dates slip

Acceptance Criteria:
- [ ] Calendar supports month, week, and list views with consistent filter behavior.
- [ ] Calendar shows scheduled items from schedule entries and includes an approved-unscheduled lane or panel.
- [ ] Calendar filters support campaign, channel, and status with deterministic color mapping.
- [ ] Open-content interaction opens content detail side panel without full page context loss.
- [ ] Reschedule actions update schedule entries and reflect immediately in calendar views.
- [ ] Overcrowded days collapse cleanly and maintain access to overflow items.

Execution Update (2026-04-26):
- Added explicit `Approved-Unscheduled Lane` panel in calendar workspace with quick schedule/claim actions and open-content navigation.
- Added inline reschedule controls to claimed calendar rows so schedule updates apply from the calendar surface.
- Kept month/week/list windows and existing campaign/channel/timing filters as the shared calendar control surface.
