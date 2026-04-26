---
ID: US-RVW-007
Title: Deliver Annual Self-Review Draft Journey
Status: In Progress
Verified: false
Backdated: 2026-04-25
---

As an employee
I want one simple annual self-review drafting flow
So I can summarize impact accurately without maintaining separate documents

Acceptance Criteria:
- [ ] Annual draft captures review year, self-summary, impact examples, and growth plan as structured fields.
- [ ] One user can have only one draft per year; resaving updates that year's draft.
- [ ] Review year input is constrained to valid allowed range and cannot be saved as invalid text.
- [ ] Draft save success/failure states are explicit and include last-updated context when available.
- [ ] Existing annual draft preloads into the form when the year is selected.
- [ ] Unsaved edits behavior is documented (autosave/manual save/discard) and matches implementation.
- [ ] Chatbot annual flow can complete the same draft path without requiring route changes.

QA / Evidence:
- [x] `npm run lint` passed (`/tmp/reviews-lint-2026-04-26.log`, exit_code=0).
- [x] `npm run typecheck` passed (`/tmp/reviews-typecheck-2026-04-26.log`, exit_code=0).
- [x] `npm run build` passed (`/tmp/reviews-build-2026-04-26.log`, exit_code=0).
- [ ] Browser checks for yearly uniqueness, preload-by-year, and explicit save success/failure feedback are pending.
- [ ] Playwright smoke execution blocked in this environment (`/tmp/reviews-smoke-desktop-2026-04-26.log`, EPERM bind).

Outstanding Gate Notes:
- Keep `In Progress` until annual draft lifecycle behavior is executed and recorded with artifact links.
