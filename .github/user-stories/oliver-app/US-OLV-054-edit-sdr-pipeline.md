---
ID: US-OLV-054
Title: Edit SDR pipeline
Status: Code Present
Verified: false
Backdated: 2026-04-22
Milestone: Chatbot, voice, and module flows

As a SDR operator
I want prospect edits and call logging through the SDR workflow
So that pipeline context stays current

Acceptance Criteria:
- [ ] SDR flows can edit key prospect fields such as status, track, signal, and notes.
- [ ] Call logs append prospect-facing notes back into the SDR data store.

Notes: These flows are implemented directly against `sdr_prospects`; I did not execute them against a live table.
---
