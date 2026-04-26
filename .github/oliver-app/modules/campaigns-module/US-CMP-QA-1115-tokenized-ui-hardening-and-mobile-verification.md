---
ID: US-CMP-QA-1115
Title: Campaign UI hardening for locked component + token standards
Status: In Progress
Verified: false
Backdated: 2026-04-26
Ticket: CMP-QA-1115
Epic: CMP-E11: QA, Rollout, and Definition of Done Gates
Priority: Medium
---

As a product maintainer
I want Campaign module layouts and controls to consistently use locked design-system patterns
So module polish and responsiveness stay stable across releases.

Acceptance Criteria:
- [x] Audit `src/app/campaigns/campaigns.css` and related modules for non-token values in spacing/radius/font-size/border widths where token alternatives exist.
- [x] Replace remaining hard-coded values with established token-backed variables (`var(--spacing-*)`, `var(--font-size-*)`, `var(--radius-*)`, etc.).
- [x] Update `src/tech-debt/design-system.md` (or `src/tech-debt/margin-scale.md`) if new campaign-specific conventions are required.
- [x] Add/adjust at least one test assertion in `tests/e2e/mobile-clickpaths.spec.ts` or `tests/e2e/frontend-smoke.spec.ts` to guard against regression in campaign mobile shell overflow after token refactor.
- [x] Execute and pass campaign test file(s) affected by style or shell changes.

Execution notes:
- No new campaign-specific token conventions were required; existing token taxonomy in `src/tech-debt/design-system.md` remains authoritative.
- Updated Campaign landing entry text and shell copy in `src/components/campaigns/CampaignsLanding.tsx` and styling in `src/app/campaigns/campaigns.css` to stabilize module entry expectation (`Campaign Execution Workspace`).

Blocker:
- Signed test artifacts for campaign shell/mobility checks are not yet attached in git-tracked evidence.

Unblock action:
- Re-run affected campaigns coverage (or provide log hash/artifacts) and link them from this story and `src/tech-debt/campaign-rollout-and-dod-gates.md`.

Latest evidence:
- 2026-04-26T10:54:22Z: `npm run test:contracts -- tests/contracts/campaign-ics.contract.test.mjs tests/contracts/campaigns-api.contract.test.mjs`  
  Result: PASS (`13 passed, 0 failed`) — local contract scope, non-staging.
