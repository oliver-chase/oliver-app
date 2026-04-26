---
ID: US-CMP-QA-1701
Title: End-to-end certification for spec-critical campaign journeys
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-QA-1701
Epic: CMP-PAR-E6: E2E Certification and Legacy Cutover
---

As a release owner
I want E2E coverage for all spec-critical campaign workflows
So parity regressions are caught before production rollout

Acceptance Criteria:
- [ ] E2E suite covers campaign workspace tab navigation and persistent header behavior.
- [ ] E2E suite covers content side panel flows including metadata, comments, review actions, and close/reopen behavior.
- [ ] E2E suite covers reminders lifecycle flows (create, complete, reassign, snooze, delete).
- [ ] E2E suite covers schedule-entry lifecycle (schedule, reschedule, posted, missed transitions).
- [ ] E2E suite includes permission matrix negative tests for unauthorized actions.
- [ ] Release checklist requires passing campaign parity suite in desktop and mobile configs.
