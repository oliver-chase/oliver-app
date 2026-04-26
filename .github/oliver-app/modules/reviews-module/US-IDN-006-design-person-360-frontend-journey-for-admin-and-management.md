---
ID: US-IDN-006
Title: Design Person 360 Frontend Journey for Admin and Management
Status: In Progress
Verified: false
Backdated: 2026-04-25
---

As an admin or management user
I want a simple person-360 screen with clear section priorities
So I can make accurate decisions quickly without hunting through multiple modules

Acceptance Criteria:
- [ ] Person-360 entry point is explicit in admin workspace and is not exposed to unauthorized users.
- [ ] Journey begins with person search/select and then opens one structured profile view.
- [ ] Profile sections follow clear order: identity summary, reviews, HR/hiring, accounts links, devices/assets, activity timeline.
- [ ] Each section includes "open in source module" links for deeper edits.
- [ ] Sensitive fields are visually marked and hidden by default when role does not allow access.
- [ ] Loading/empty/error states are section-scoped so one failing module does not collapse the full profile.
- [ ] Mobile and desktop layouts keep key identity and review status visible without excessive scrolling.

QA / Evidence:
- [x] `npm run lint` passed (`/tmp/reviews-lint-2026-04-26.log`, exit_code=0).
- [x] `npm run typecheck` passed (`/tmp/reviews-typecheck-2026-04-26.log`, exit_code=0).
- [x] `npm run build` passed (`/tmp/reviews-build-2026-04-26.log`, exit_code=0).
- [ ] Frontend journey validation for role gating, section ordering, and source-module deep links is pending.
- [ ] Mobile/desktop visual QA remains blocked on Playwright webserver bind in this environment (`/tmp/reviews-smoke-desktop-2026-04-26.log`).

Outstanding Gate Notes:
- Keep `In Progress` until person-360 UI path and responsive state behavior are executed in browser QA with artifacts.
