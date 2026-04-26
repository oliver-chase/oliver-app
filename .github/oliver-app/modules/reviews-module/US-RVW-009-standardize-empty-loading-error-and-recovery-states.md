---
ID: US-RVW-009
Title: Standardize Empty, Loading, Error, and Recovery States
Status: In Progress
Verified: false
Backdated: 2026-04-25
---

As a user
I want every reviews screen state to explain what is happening and what to do next
So I can recover quickly when data is missing, loading, or failing

Acceptance Criteria:
- [ ] Loading states are present for each data panel and do not flash confusing empty states prematurely.
- [ ] Empty states include a direct next action (for example, create first goal).
- [ ] Error states include plain-language cause and one-click retry.
- [ ] Schema-not-ready state is handled intentionally with migration guidance and without broken UI controls.
- [ ] Save actions disable appropriately during writes to prevent accidental double-submits.
- [ ] Error state copy is consistent between UI forms and chatbot flow responses.
- [ ] State behavior is tested for desktop and mobile viewports.

QA / Evidence:
- [x] `npm run lint` passed (`/tmp/reviews-lint-2026-04-26.log`, exit_code=0).
- [x] `npm run typecheck` passed (`/tmp/reviews-typecheck-2026-04-26.log`, exit_code=0).
- [x] `npm run build` passed (`/tmp/reviews-build-2026-04-26.log`, exit_code=0).
- [ ] Runtime checks for loading/empty/error/retry states and double-submit prevention are pending.
- [ ] Playwright desktop/mobile smoke blocked in this environment (`/tmp/reviews-smoke-desktop-2026-04-26.log`, `/tmp/reviews-smoke-mobile-2026-04-26.log`).

Outstanding Gate Notes:
- Keep `In Progress` until state-handling UX is confirmed in desktop and mobile browser runs.
