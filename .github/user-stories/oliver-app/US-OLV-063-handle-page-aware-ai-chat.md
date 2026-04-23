---
ID: US-OLV-063
Title: Handle page-aware AI chat
Status: Code Present
Verified: false
Backdated: 2026-04-17
Milestone: Chatbot, voice, and module flows

As a module user
I want the AI chat backend to receive page-specific context
So that assistant responses stay grounded in the module I am using

Acceptance Criteria:
- [ ] The chat function accepts recent messages, page context, and structured page data.
- [ ] The system prompt scopes the assistant to the active module context.

Notes: The API contract is present; answer quality and safety were not re-evaluated beyond the prompt text.
---
