---
ID: US-RVW-008
Title: Enforce Chatbot Parity for Reviews Workflows
Status: In Progress
Verified: false
Backdated: 2026-04-25
---

As an operations user
I want chatbot actions and flows to match every core reviews workflow
So voice/chat usage never becomes a second-class path with missing capability

Acceptance Criteria:
- [ ] Chatbot exposes create/update actions for goals, updates, quarterly reflections, and annual drafts.
- [ ] Flow prompts use the same field semantics and validation rules as form UI.
- [ ] Chatbot quick commands map to visible section navigation targets where applicable.
- [ ] Path scope protection blocks out-of-module requests with actionable routing guidance.
- [ ] Flow completion replies are concrete and include what record was written.
- [ ] Flow error replies preserve progress and provide immediate retry options.
- [ ] Reviews chatbot intent aliases are documented and included in regression coverage.

QA / Evidence:
- [x] `npm run lint` passed (`/tmp/reviews-lint-2026-04-26.log`, exit_code=0).
- [x] `npm run typecheck` passed (`/tmp/reviews-typecheck-2026-04-26.log`, exit_code=0).
- [x] `npm run build` passed (`/tmp/reviews-build-2026-04-26.log`, exit_code=0).
- [ ] Chatbot parity checks for all reviews create/update flows are pending in runtime session validation.
- [ ] Playwright smoke execution blocked in this environment (`/tmp/reviews-smoke-desktop-2026-04-26.log`, EPERM bind).

Outstanding Gate Notes:
- Keep `In Progress` until command aliases, prompt parity, and error/retry semantics are runtime-verified.
