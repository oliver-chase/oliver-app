---
ID: US-RVW-006
Title: Deliver Quarterly Reflection Journey with Cycle Guardrails
Status: In Progress
Verified: false
Backdated: 2026-04-25
---

As an employee
I want quarterly reflections to be quick to complete and easy to compare across cycles
So I can maintain a consistent rhythm without repetitive manual formatting

Acceptance Criteria:
- [ ] Quarterly flow enforces a valid cycle label format and blocks ambiguous entries.
- [ ] Reflection body is required before save; blockers and support-needed remain optional.
- [ ] Saving the same cycle updates the existing cycle record instead of creating duplicates.
- [ ] Reflection list is sorted by cycle recency and shows last updated timestamp.
- [ ] UI makes it obvious whether the user is creating a new cycle entry or updating an existing one.
- [ ] Chatbot flow supports the same required/optional field contract as the form UI.
- [ ] Validation and error messages are plain language, specific, and non-technical.

QA / Evidence:
- [x] `npm run lint` passed (`/tmp/reviews-lint-2026-04-26.log`, exit_code=0).
- [x] `npm run typecheck` passed (`/tmp/reviews-typecheck-2026-04-26.log`, exit_code=0).
- [x] `npm run build` passed (`/tmp/reviews-build-2026-04-26.log`, exit_code=0).
- [ ] Browser checks for cycle-label validation, duplicate-cycle update behavior, and recency ordering are pending.
- [ ] Playwright smoke execution blocked in this environment (`/tmp/reviews-smoke-desktop-2026-04-26.log`, EPERM bind).

Outstanding Gate Notes:
- Keep `In Progress` until quarterly flow create/update and validation-copy behavior are manually verified.
