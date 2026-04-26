---
ID: US-SLD-029
Title: Slides Chat Command Parity + Flow Runtime Guardrails
Status: Done
Verified: true
Backdated: 2026-04-25
---

As a slide editor user
I want Oliver commands to cover key slide actions without breaking standard editor controls
So chat-driven workflows are useful while keeping existing page interactions stable

Acceptance Criteria:
- [x] Slides command catalog includes save, export generation, and workspace navigation intents with fuzzy aliases.
- [x] Slides chat flows execute save/export/navigation actions and return user-facing confirmations.
- [x] Zero-step flow rendering in `OliverDock` is guarded to avoid runtime `step.kind` crashes.
- [x] Command discoverability does not create duplicate button-role collisions with core editor controls.
- [x] Frontend smoke coverage validates parse/save/export/navigation via chatbot command paths.
