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
