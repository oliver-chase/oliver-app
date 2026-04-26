---
ID: US-CMP-CHAT-812
Title: Conversation scope and path guard updates
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-CHAT-812
Epic: CMP-E8: Chatbot Parity and Guided Workflows
---

As a system owner
I want campaign path scoping in both client and server guards so cross-module prompts are deterministic.
So users are directed to correct modules without ambiguous behavior.

Acceptance Criteria:
- [ ] `campaigns` path added to conversation path registry.
- [ ] Client intent detection includes campaign keywords.
- [ ] `/api/chat` guard patterns include campaigns path and cross-module blocks.
- [ ] Out-of-scope asks return concise module-switch guidance.
- [ ] Existing module path behavior remains unchanged.
