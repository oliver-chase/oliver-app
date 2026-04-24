# Slide Module UX + FE/BE Backlog (2026-04-24)

Scope: `oliver-app` slide module (`/slides`, `src/components/slides`, module/chat wiring, and missing backend surfaces).  
Goal: create one actionable backlog that covers:
- net-new slide product work
- existing UX/functionality gaps
- cleanup and hardening
- past slide capabilities that exist in code but are under-tracked

## Current Reality Snapshot

- Slide module currently provides an HTML import/parser surface and parser warnings output.
- There is no persisted slide library, no template management, no editor canvas interactions, and no slide export pipeline in the current module UI.
- Existing slide parser work is tracked in backlog-only items (`US-O13`..`US-O16`) rather than in canonical module story coverage.
- Module copy still implies capabilities (template flow/export workflow) that are not yet present in the UI.

## Epic Breakdown

| Epic | Scope | Story IDs | Type |
| --- | --- | --- | --- |
| S0 | Backfill + Tracking Cleanup | `US-SLD-001`..`US-SLD-005` | Past untracked detail + cleanup |
| S1 | Import UX Hardening | `US-SLD-010`..`US-SLD-013` | Existing gap + cleanup |
| S2 | Core Editor UX (Frontend) | `US-SLD-020`..`US-SLD-025` | Net-new |
| S3 | Slide Platform (Backend + FE/BE Integration) | `US-SLD-030`..`US-SLD-036` | Net-new |

## Epic Status (Current Branch)

| Epic | Status | Commit Readiness |
| --- | --- | --- |
| S0 | Complete (`US-SLD-001`..`US-SLD-005`) | Ready to commit as one epic milestone |
| S1 | Not started | Not commit-ready |
| S2 | Not started | Not commit-ready |
| S3 | Not started | Not commit-ready |

## Priority Suggestion

1. Execute `S0` first so current shipped behavior is traceable and wording is accurate.
2. Execute `S1` second to improve immediate usability/safety of the existing import flow.
3. Execute `S3` foundation stories (`US-SLD-030`, `US-SLD-031`) before most of `S2`, so editor work has a real persistence contract.
4. Ship `S2` + `S3` iteratively with paired FE/BE slices and story-level tests.

## Execution and Commit Model

- Work is epic-driven and story-driven: every change should map to a defined `US-SLD-*` story.
- Preferred commit grouping is by epic milestone (for example, one commit for `S0` tracking cleanup, one for `S1` import hardening).
- If an epic is too large for one safe commit, use story-scoped commits (`US-SLD-0xx`) and merge them under one epic PR/milestone.
- Each commit/PR should reference story IDs and QA gate outcomes (`typecheck`, `lint`, smoke/integration tests as applicable).

## Existing Evidence Anchors

- Slides route/UI: [src/app/slides/page.tsx](/Users/oliver/projects/oliver-app/src/app/slides/page.tsx)
- Slides parser/types: [src/components/slides/html-import.ts](/Users/oliver/projects/oliver-app/src/components/slides/html-import.ts), [src/components/slides/types.ts](/Users/oliver/projects/oliver-app/src/components/slides/types.ts)
- Slides commands/flows: [src/app/slides/commands.ts](/Users/oliver/projects/oliver-app/src/app/slides/commands.ts), [src/app/slides/flows.ts](/Users/oliver/projects/oliver-app/src/app/slides/flows.ts)
- Module registration/copy: [src/modules/registry.ts](/Users/oliver/projects/oliver-app/src/modules/registry.ts)
- Current smoke coverage: [tests/e2e/frontend-smoke.spec.ts](/Users/oliver/projects/oliver-app/tests/e2e/frontend-smoke.spec.ts)

## QA Snapshot

- [QA-2026-04-24.md](/Users/oliver/projects/oliver-app/.github/user-stories/oliver-app/backlog/slides-module-ux-be-backlog-2026-04-24/QA-2026-04-24.md)
- [GAP-REGISTER.md](/Users/oliver/projects/oliver-app/.github/user-stories/oliver-app/backlog/slides-module-ux-be-backlog-2026-04-24/GAP-REGISTER.md)
