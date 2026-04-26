---
ID: US-O33
Title: Certify Cross-Module E2E Journeys, Click Paths, and Chatbot Parity
Status: Done
Verified: true
Backdated: 2026-04-25
---

As a product owner
I want every critical user journey and chatbot-assisted path tested end to end
So releases do not break workflows, visual consistency, or backend contracts

Acceptance Criteria:
- [x] A canonical journey matrix is documented for Hub, Admin, Design System, Slides, and chatbot-triggered module actions.
- [x] E2E coverage includes happy path, permission-denied, backend-failure, and recovery scenarios for each critical flow.
- [x] Click-path assertions verify navigation destination, persisted state, and expected control visibility.
- [x] Shared component and token consistency checks are included in regression scope for touched pages.
- [x] Contract tests verify API request/response shape for critical writes and high-volume reads.
- [x] Release checklist requires passing results for this matrix before staging-to-main promotion.

Implementation evidence (2026-04-26):
- Added canonical journey matrix:
- `/.github/oliver-app/modules/general-platform/outstanding-build-priorities/cross-module-journey-matrix-US-O33.md`
  - Maps Hub/Admin/Design System/Slides/chatbot critical flows to concrete happy/denied/failure/recovery coverage and click-path assertions.
- Added required promotion checklist:
- `/.github/oliver-app/modules/general-platform/outstanding-build-priorities/staging-to-main-release-checklist-US-O33.md`
  - Requires explicit matrix command pass before staging-to-main promotion.
- Added missing admin failure+recovery e2e slice:
  - `tests/e2e/frontend-smoke.spec.ts`
  - `admin user manager surfaces backend failures and recovers after refresh`
- Extended contract coverage for critical slides API write + high-volume read envelopes:
  - `tests/contracts/slides-api.contract.test.mjs`
  - Added save-write response-shape contract and audits pagination envelope contract.
- Updated deep QA workflow to require the US-O33 matrix/checklist for release promotion:
  - `src/tech-debt/deep-qa-workflow.md`
