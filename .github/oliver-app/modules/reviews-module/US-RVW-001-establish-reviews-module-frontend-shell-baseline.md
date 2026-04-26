---
ID: US-RVW-001
Title: Establish Reviews Module Frontend Shell Baseline
Status: In Progress
Verified: false
Backdated: 2026-04-25
---

As a cross-project UX owner
I want the reviews module shell to follow one locked baseline contract
So any team can build new modules with predictable navigation, structure, and behavior

Acceptance Criteria:
- [x] Reviews route shell uses the same module frame pattern as other modules: sidebar, topbar, sync indicator, main content container.
- [x] Mobile behavior is defined and implemented: hamburger opens/closes sidebar, backdrop closes sidebar, main content remains readable at <=500px.
- [x] The page has a documented section hierarchy and scroll anchors (`focus areas`, `review cycles`, `goals`, `updates`, `quarterly`, `annual`).
- [x] Top-level headings and labels use tokenized typography and consistent naming conventions with other modules.
- [x] Main content has one clear primary path and no duplicate controls that trigger the same action from multiple locations.
- [x] No hidden dependency on another module's private components; only shared/core layer and reviews-owned components are used.
- [x] Story includes explicit QA checkpoints for desktop and mobile shell parity.

QA Checkpoints:
- [ ] Desktop shell parity:
  - [ ] Sidebar is visible with overview nav and does not obstruct main content.
  - [ ] Topbar and sync indicator render in fixed layout with active refresh control.
  - [ ] Section tabs are visible and command anchors resolve to the same sections on click.
  - [ ] Primary path begins with the shell + section nav and avoids duplicate action sources for the same jump.
- [ ] Mobile shell parity (<=500px):
  - [ ] Hamburger is visible and opens sidebar.
  - [ ] Backdrop is tappable and closes sidebar.
  - [ ] Main content container remaps to full-width (`left=0`) and remains legible with tabs/forms/cards.
- [ ] Data/error parity:
  - [ ] Schema-missing and policy-blocked states remain visible and actionable at both viewport sizes.

QA / Evidence:
- [x] `npm run lint` passed (`/tmp/reviews-lint-2026-04-26.log`, exit_code=0).
- [x] `npm run build` passed (`/tmp/reviews-build-2026-04-26.log`, exit_code=0).
- [x] `npm run typecheck` passed after build refresh (`/tmp/reviews-typecheck-2026-04-26.log`, exit_code=0).
- [ ] `npm run test:smoke` blocked by environment: Playwright webserver cannot bind (`/tmp/reviews-smoke-desktop-2026-04-26.log`, exit_code=1, EPERM on `0.0.0.0:3001`).
- [ ] `npm run test:smoke:mobile` blocked by environment: Playwright webserver cannot bind (`/tmp/reviews-smoke-mobile-2026-04-26.log`, exit_code=1, EPERM on `0.0.0.0:3002`).

Outstanding Gate Notes:
- [ ] Manual/automated QA evidence not yet attached; keep this story `In Progress` until shell parity, mobile checks, and scroll/command checks are executed and logged.
- Shell parity and command-anchor checks remain blocked until QA environment can run Playwright webserver locally.
