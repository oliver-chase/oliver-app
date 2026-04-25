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
- Core editor UX now includes resize handles with guardrails, inline text edit mode, style toolbar controls, multi-select alignment/distribution tools, undo/redo history, and keyboard-first shortcut support.
- Locked-layer guardrails now enforce immutability for protected components across keyboard, pointer, resize, and toolbar styling/alignment actions.
- Library search now has explicit no-match guidance across My Slides/templates/activity and template visibility is constrained server-side before query limiting.
- Slides chatbot coverage now includes parse/save/export/navigation command intents with guarded zero-step flow runtime handling.
- Slides chatbot now supports direct HTML export download command execution to remove export dead-end follow-ups.
- Existing parser hardening stories (`US-O13`..`US-O16`) remain tracked as historical backlog provenance and now map cleanly into canonical slides coverage.

## Epic Breakdown

| Epic | Scope | Story IDs | Type |
| --- | --- | --- | --- |
| S0 | Backfill + Tracking Cleanup | `US-SLD-001`..`US-SLD-005` | Past untracked detail + cleanup |
| S1 | Import UX Hardening | `US-SLD-010`..`US-SLD-013` | Existing gap + cleanup |
| S2 | Core Editor UX (Frontend) | `US-SLD-020`..`US-SLD-025` | Net-new |
| S2.1 | Visual Regression Hardening | `US-SLD-026` | Net-new |
| S2.2 | Interaction Safety Hardening | `US-SLD-027` | Net-new |
| S2.3 | Library Search Hardening | `US-SLD-028` | Net-new |
| S2.4 | Chat Command Parity Hardening | `US-SLD-029` | Net-new |
| S2.5 | Chat Export Execution Hardening | `US-SLD-040` | Net-new |
| S3 | Slide Platform (Backend + FE/BE Integration) | `US-SLD-030`..`US-SLD-039` | Net-new |

## Epic Status (Current Branch)

| Epic | Status | Commit Readiness |
| --- | --- | --- |
| S0 | Complete (`US-SLD-001`..`US-SLD-005`) | Ready to commit as one epic milestone |
| S1 | Complete (`US-SLD-010`..`US-SLD-013`) | Ready to commit as one epic milestone |
| S2 | Complete (`US-SLD-020`..`US-SLD-025`) | Ready to commit as one epic milestone |
| S2.1 | Complete (`US-SLD-026`) | Ready to commit as one epic milestone |
| S2.2 | Complete (`US-SLD-027`) | Ready to commit as one epic milestone |
| S2.3 | Complete (`US-SLD-028`) | Ready to commit as one epic milestone |
| S2.4 | Complete (`US-SLD-029`) | Ready to commit as one epic milestone |
| S2.5 | Complete (`US-SLD-040`) | Ready to commit as one epic milestone |
| S3 | Complete (`US-SLD-030`..`US-SLD-039`) | Ready to commit as one epic milestone |

## Priority Suggestion

1. Run full smoke + e2e pass in CI-like network conditions to validate no environment-specific regressions.
2. Add cross-browser visual baselines if/when Firefox/WebKit projects are enabled.
3. Track follow-up UX polish separately from the now-complete S2 functional backlog.

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
