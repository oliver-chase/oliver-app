---
ID: US-OLV-059
Title: Capture voice input
Status: Code Present
Verified: false
Backdated: 2026-04-22
Milestone: Add module chat flows and story backfill docs

As a operator
I want to dictate a command or chat message
So that I can use Oliver hands-free when supported

Acceptance Criteria:
- [ ] The mic control checks SpeechRecognition or webkitSpeechRecognition support.
- [ ] Unsupported browsers receive a visible assistant message.
- [ ] Recognition results are sent to chat.
- [ ] Recognition error/end clears listening state.

Notes: Browser support varies.
---
