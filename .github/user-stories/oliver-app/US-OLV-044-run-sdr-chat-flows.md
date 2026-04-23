---
ID: US-OLV-044
Title: Run SDR chat flows
Status: Broken
Verified: false
Backdated: 2026-04-22
Milestone: Chatbot, voice, and module flows

As a SDR operator
I want chat-driven flows for prospect and draft actions
So that I can work the SDR queue through Oliver

Acceptance Criteria:
- [ ] The SDR module registers flows for prospect edits, call logging, and draft handling.
- [ ] All registered SDR flows can complete against the currently available backend routes.

Notes: Partially implemented. Prospect-edit flows exist, but draft approval calls `/api/sdr-approve`, and that endpoint is not present in this repo.
---
