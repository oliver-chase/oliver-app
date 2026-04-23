---
ID: US-OLV-056
Title: Answer contextual chat
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Port Accounts UX and complete module hub shell

As a operator
I want AI chat grounded in the current page context
So that I can ask operational questions without leaving the module

Acceptance Criteria:
- [ ] OliverDock sends recent message history and pageContext to /api/chat.
- [ ] Page context payload is included when configured.
- [ ] The API constrains the system prompt to the current page context.
- [ ] Responses display the model tag when available.

Notes: AI provider must be configured in ai_config/env.
---
