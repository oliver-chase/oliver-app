---
ID: US-CMP-QA-1112
Title: MVP DoD verification checklist
Status: In Progress
Verified: false
Backdated: 2026-04-25
Ticket: CMP-QA-1112
Epic: CMP-E11: QA, Rollout, and Definition of Done Gates
---

As a product owner
I want explicit DoD checks mapped to PRD so launch readiness is objective.
So acceptance is unambiguous.

Acceptance Criteria:
- [x] Checklist maps each PRD DoD item to implemented ticket evidence.
- [x] Contributor, reviewer, and admin scenario walkthroughs are completed.
- [x] Activity log, state validation, and permission checks are verified.
- [ ] ICS reminder generation verified on both Mac and Windows calendar imports.
- [x] Reporting/export outputs validated against known fixtures.

Evidence:
- PRD DoD mapping is captured in `src/tech-debt/campaign-rollout-and-dod-gates.md`.
- Contributor/reviewer/admin flows are exercised in `tests/e2e/campaigns-module.spec.ts` and `tests/e2e/frontend-smoke.spec.ts`.
- State/permission validation and audit coverage are exercised via campaign RPC/e2e conflict checks and activity assertions in `tests/contracts/campaigns-api.contract.test.mjs` and `src/lib/campaigns.ts`.
- Reporting/export validation is exercised in `tests/contracts/campaigns-api.contract.test.mjs`.
- ICS compatibility validation is tracked in `US-CMP-QA-1113` and requires external client execution.
