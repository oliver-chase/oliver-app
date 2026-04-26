---
ID: US-RVW-010
Title: Define Cross-Project Module Baseline Protocol from Reviews
Status: In Progress
Verified: false
Backdated: 2026-04-25
---

As a platform lead
I want reviews to define the reusable module baseline protocol
So future projects can replicate a proven UX/system pattern without redesigning fundamentals

Acceptance Criteria:
- [ ] A reusable baseline checklist is documented covering shell, design tokens, interactions, chatbot parity, and state handling.
- [ ] Checklist includes required deliverables for "every click" mapping and data provenance mapping.
- [ ] Checklist includes required accessibility and mobile checks.
- [ ] Checklist includes required test gates for `typecheck`, `lint`, and smoke coverage.
- [ ] Checklist clearly separates "shared/core requirements" from "module-specific requirements."
- [ ] Checklist references where to implement and where to document intentional deviations.
- [ ] Reviews module is explicitly tagged as the reference implementation for this protocol.

QA / Evidence:
- [x] `npm run lint` passed (`/tmp/reviews-lint-2026-04-26.log`, exit_code=0).
- [x] `npm run typecheck` passed (`/tmp/reviews-typecheck-2026-04-26.log`, exit_code=0).
- [x] `npm run build` passed (`/tmp/reviews-build-2026-04-26.log`, exit_code=0).
- [ ] Protocol-level checklist extraction and explicit cross-module tagging are pending documentation updates.
- [ ] Smoke-gate requirement remains blocked by local Playwright bind restriction (`/tmp/reviews-smoke-desktop-2026-04-26.log`).

Outstanding Gate Notes:
- Keep `In Progress` until reusable checklist doc and smoke gate references are finalized.
