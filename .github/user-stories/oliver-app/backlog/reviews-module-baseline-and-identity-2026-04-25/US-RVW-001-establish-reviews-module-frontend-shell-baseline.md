---
ID: US-RVW-001
Title: Establish Reviews Module Frontend Shell Baseline
Status: Not Started
Verified: false
Backdated: 2026-04-25
---

As a cross-project UX owner
I want the reviews module shell to follow one locked baseline contract
So any team can build new modules with predictable navigation, structure, and behavior

Acceptance Criteria:
- [ ] Reviews route shell uses the same module frame pattern as other modules: sidebar, topbar, sync indicator, main content container.
- [ ] Mobile behavior is defined and implemented: hamburger opens/closes sidebar, backdrop closes sidebar, main content remains readable at <=500px.
- [ ] The page has a documented section hierarchy and scroll anchors (`focus areas`, `review cycles`, `goals`, `updates`, `quarterly`, `annual`).
- [ ] Top-level headings and labels use tokenized typography and consistent naming conventions with other modules.
- [ ] Main content has one clear primary path and no duplicate controls that trigger the same action from multiple locations.
- [ ] No hidden dependency on another module's private components; only shared/core layer and reviews-owned components are used.
- [ ] Story includes explicit QA checkpoints for desktop and mobile shell parity.

