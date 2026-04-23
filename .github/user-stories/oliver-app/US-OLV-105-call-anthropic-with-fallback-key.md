---
ID: US-OLV-105
Title: Call Anthropic with fallback key
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Port Accounts UX and complete module hub shell

As a operator
I want AI calls to retry with fallback credentials when needed
So that temporary provider limits do not immediately break workflows

Acceptance Criteria:
- [ ] Shared AI helper loads active AI config.
- [ ] callAnthropic sends the configured model and messages.
- [ ] 401 or 429 responses can retry with fallbackKey when present.
- [ ] Errors are returned as structured API responses.

Notes: Inferred from _shared/ai.js usage and tech-debt state notes.
---
