---
ID: US-RVW-005
Title: Deliver Structured Progress Update Journey
Status: In Progress
Verified: false
Backdated: 2026-04-25
---

As an employee
I want to log updates against goals with clear evidence context
So reviewers can understand progress without reading unstructured notes

Acceptance Criteria:
- [ ] Update flow requires selecting a goal and entering update content before save is allowed.
- [ ] Update type is constrained to approved categories (`action`, `win`, `lesson`, `feedback`, `evidence`).
- [ ] Goal picker only displays the current user's eligible goals and clearly labels each option.
- [ ] Optional evidence link is validated for basic URL shape and rendered safely when displayed.
- [ ] Saved updates appear in reverse chronological order with timestamp and update type label.
- [ ] Empty state explains what to do next (for example, "Create a goal first, then add updates").
- [ ] Save failure states do not clear form input and provide a direct retry path.

QA / Evidence:
- [x] `npm run lint` passed (`/tmp/reviews-lint-2026-04-26.log`, exit_code=0).
- [x] `npm run typecheck` passed (`/tmp/reviews-typecheck-2026-04-26.log`, exit_code=0).
- [x] `npm run build` passed (`/tmp/reviews-build-2026-04-26.log`, exit_code=0).
- [ ] Browser checks for update-type constraints, goal picker eligibility, and reverse-chronological rendering are pending.
- [ ] Playwright smoke execution blocked in this environment (`/tmp/reviews-smoke-desktop-2026-04-26.log`, EPERM bind).

Outstanding Gate Notes:
- Keep `In Progress` until update form validation, list ordering, and failure-retry behavior are browser-verified.
