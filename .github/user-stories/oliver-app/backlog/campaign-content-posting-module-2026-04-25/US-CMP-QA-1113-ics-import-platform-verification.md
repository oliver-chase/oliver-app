---
ID: US-CMP-QA-1113
Title: ICS import compatibility validation on desktop calendar clients
Status: In Progress
Verified: false
Backdated: 2026-04-26
Ticket: CMP-QA-1113
Epic: CMP-E11: QA, Rollout, and Definition of Done Gates
Priority: High
---

As a campaign operator
I want deterministic evidence that generated ICS reminders import on both major desktop calendar clients
So reminders are usable by the full team without timezone and recurrence surprises.

Acceptance Criteria:
- [x] A representative ICS payload for `add-to-calendar` is generated with required iCalendar fields: `BEGIN:VCALENDAR`, `VERSION:2.0`, `PRODID`, `BEGIN:VEVENT`, `UID`, `DTSTAMP`, `DTSTART`, `DTEND`, `SUMMARY`, `DESCRIPTION`, `END:VEVENT`, `END:VCALENDAR` (validated by `tests/contracts/campaign-ics.contract.test.mjs`).
- [x] ICS payload includes deterministic timezone policy (UTC or explicit offset) and `DTSTAMP`/event times are valid `YYYYMMDDTHHMMSSZ` values (validated by `tests/contracts/campaign-ics.contract.test.mjs`).
- [x] ICS payload generation helper is centralized and reusable (`src/lib/campaign-ics.js`).
- [ ] Add-to-calendar payload is validated in at least two external clients: macOS Calendar and Windows Outlook.
- [ ] Validation confirms event title, description/body text, and module deep link are preserved after import.
- [x] Any import failure includes a troubleshooting note and a fallback remediation path in the campaign help/ops notes (`src/tech-debt/campaign-ics-troubleshooting.md`).
- [ ] Completion is recorded as signed manual evidence in `src/tech-debt/campaign-rollout-and-dod-gates.md` and linked from `US-CMP-QA-1112`.
