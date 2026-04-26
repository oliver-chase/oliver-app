---
ID: US-RVW-004
Title: Deliver Minimal and Accurate Goal Creation Journey
Status: In Progress
Verified: false
Backdated: 2026-04-25
---

As an employee
I want to create a growth goal in a minimal number of steps
So I can capture intent quickly without losing structure or data quality

Acceptance Criteria:
- [ ] Goal creation requires only essential fields in the primary path (`focus area`, `title`), with optional fields clearly marked.
- [ ] Focus area options match the module framework vocabulary and cannot be saved outside allowed values.
- [ ] Inline validation explains exactly what is missing or malformed (for example, blank title or invalid date format).
- [ ] Successful save gives immediate confirmation and inserts the new goal in the visible list without a page reload.
- [ ] Failure state keeps entered values intact so the user does not lose work.
- [ ] Goal cards show status, progress, and update count in a scannable format with no redundant metadata.
- [ ] Progress/status controls are explicit and reversible, with state transitions logged in module data.

QA / Evidence:
- [x] `npm run lint` passed (`/tmp/reviews-lint-2026-04-26.log`, exit_code=0).
- [x] `npm run typecheck` passed (`/tmp/reviews-typecheck-2026-04-26.log`, exit_code=0).
- [x] `npm run build` passed (`/tmp/reviews-build-2026-04-26.log`, exit_code=0).
- [ ] Browser flow checks for goal create/validation/save/retry are pending.
- [ ] Playwright smoke execution blocked in this environment (`/tmp/reviews-smoke-desktop-2026-04-26.log`, EPERM bind).

Outstanding Gate Notes:
- Keep `In Progress` until goal create/edit/validation states are executed in browser QA and artifacts are attached.
