# Slide Module UX + FE/BE Backlog (2026-04-24)

Scope: `oliver-app` slide module (`/slides`, `src/components/slides`, module/chat wiring, and missing backend surfaces).  
Goal: create one actionable backlog that covers:
- net-new slide product work
- existing UX/functionality gaps
- cleanup and hardening
- past slide capabilities that exist in code but are under-tracked

## Current Reality Snapshot

- Slide module now provides import preflight validation, categorized parser failures, grouped warnings, and structured component result tables.
- Persisted My Slides + Template Library views are wired to a FE/BE contract (`/api/slides`) with local fallback for dev/QA and Supabase-backed production path.
- Save/autosave, revision conflict handling, draft recovery, HTML export metadata, PDF print contract, and audit feed are implemented.
- Existing parser hardening stories (`US-O13`..`US-O16`) remain tracked as historical backlog provenance and now map cleanly into canonical slides coverage.

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
| S1 | Complete (`US-SLD-010`..`US-SLD-013`) | Ready to commit as one epic milestone |
| S2 | Not started (`US-SLD-020`..`US-SLD-025`) | Not commit-ready |
| S3 | Complete (`US-SLD-030`..`US-SLD-036`) | Ready to commit as one epic milestone |

## Priority Suggestion

1. Execute `S2` (`US-SLD-020`..`US-SLD-025`) next, using the now-shipped S3 persistence contracts.
2. Keep S1/S3 regression coverage green while adding editor interactions.
3. Land editor features in story-sized slices so each interaction family (selection, text editing, undo/redo, accessibility) ships with tests.

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
