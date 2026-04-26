---
ID: US-CMP-QA-1114
Title: Campaign staging signoff evidence package
Status: In Progress
Verified: false
Backdated: 2026-04-26
Ticket: CMP-QA-1114
Epic: CMP-E11: QA, Rollout, and Definition of Done Gates
Priority: High
---

As a release owner
I want a complete staging signoff packet for the Campaign module
So production release decisions are based on verifiable evidence.

Acceptance Criteria:
- [ ] Campaign-specific test suites executed on staging and results captured: `tests/e2e/campaigns-module.spec.ts`, `tests/e2e/frontend-smoke.spec.ts` (campaign cases), `tests/e2e/mobile-clickpaths.spec.ts` (campaign route shell checks).
- [ ] Staging run includes `/api/campaigns` export idempotency and fallback scenarios, `campaign_jobs` dry-run/live workflows, and permission/gating scenarios.
- [ ] `campaign-rollout-and-dod-gates.md` staging checklist is fully completed with timestamps and actor IDs.
- [ ] Environment flags (`NEXT_PUBLIC_DISABLED_MODULES`, `NEXT_PUBLIC_ENABLED_MODULES`, `NEXT_PUBLIC_HUB_VISIBLE_MODULES`) are validated and documented for prod/staging parity.
- [ ] Rollout blocker is lifted only when all checklist items are signed-off in `src/tech-debt/campaign-rollout-and-dod-gates.md`.

Evidence location:
`src/tech-debt/campaign-staging-signoff-evidence-2026-04-26.md`

Evidence target:
- Primary: `src/tech-debt/campaign-staging-signoff-evidence-2026-04-26.md`
- Gate tracking: `src/tech-debt/campaign-rollout-and-dod-gates.md`

Notes:
- Core DoD and contract evidence are already recorded in:
  - `src/tech-debt/campaign-rollout-and-dod-gates.md`
  - `/.github/oliver-app/modules/campaigns-module/US-CMP-QA-1112-mvp-dod-verification-checklist.md`
  - `/.github/oliver-app/modules/campaigns-module/US-CMP-QA-1113-ics-import-platform-verification.md`
- Current blocker: manual staging and external-client validations are still pending and tracked directly in the package evidence file.

Blocker:
- Missing staging execution artifacts for campaigns suites, API/job behavior, permission matrix, and environment flag checks.

Unblock action:
- Complete one full staging run with seeded campaign dataset and update:
  - this file (`Status`, `Result summary`, `Evidence artifact`),
  - `src/tech-debt/campaign-staging-signoff-evidence-2026-04-26.md` (signature + run actor),
  - `src/tech-debt/campaign-rollout-and-dod-gates.md` (rollout blocker lift after checklist complete).
