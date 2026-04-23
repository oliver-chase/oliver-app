---
ID: US-OLV-064
Title: Persist chat history
Status: Broken
Verified: false
Backdated: 2026-04-22
Milestone: Chatbot, voice, and module flows

As a module user
I want Oliver conversations saved per module
So that I can return to prior assistant context later

Acceptance Criteria:
- [ ] The app writes Oliver messages into the `chat_messages` store during normal use.
- [ ] The dock can reload or otherwise rely on persisted per-module chat history.

Notes: Broken/incomplete: a `chat_messages` schema exists, but the current `OliverDock` implementation keeps messages only in local component state.
---
