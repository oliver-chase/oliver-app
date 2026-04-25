---
ID: SLD-FE-610
Title: Slides Page Orchestrator Decomposition
Status: Backlog
Verified: false
Backdated: 2026-04-25
---

As a maintainer
I want `src/app/slides/page.tsx` decomposed into bounded feature modules
So ongoing FE changes stay testable, reviewable, and less regression-prone

Acceptance Criteria:
- [ ] Large orchestration logic is split into focused hooks/components (import, editor, library, activity, export).
- [ ] Cross-cutting state transitions are documented with typed contracts.
- [ ] Existing regression and visual tests remain green after decomposition.
- [ ] No user-visible workflow regressions in save, export, governance, and audit paths.
- [ ] New module boundaries reduce average PR diff size for slide features.
