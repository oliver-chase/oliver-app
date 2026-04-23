---
ID: US-OLV-037
Title: Review parsed transcripts
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Chatbot, voice, and module flows

As a account operator
I want a review modal before parsed transcript data is committed
So that I can correct extraction mistakes before they hit the database

Acceptance Criteria:
- [ ] A transcript review modal exposes editable metadata, actions, decisions, and notes.
- [ ] Confirming the modal returns an edited payload for the downstream write path.

Notes: The modal exists; I did not validate every edit path or payload merge edge case.
---
