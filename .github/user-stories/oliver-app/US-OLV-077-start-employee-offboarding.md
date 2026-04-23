---
ID: US-OLV-077
Title: Start employee offboarding
Status: Code Present
Verified: false
Backdated: 2026-04-19
Milestone: Build HR workflows and harden QA

As a HR operator
I want to start offboarding for an employee
So that departures create trackable tasks

Acceptance Criteria:
- [ ] Offboarding modal captures the selected employee and end date.
- [ ] Confirm updates employee status/end date.
- [ ] Confirm creates an offboarding run and run tasks from configured tracks.
- [ ] The operation surfaces Supabase write failures through syncState/error handling.

Notes: Implemented in HrDirectory and emp flows.
---
