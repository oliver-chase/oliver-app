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
- Template publish workflow now supports private/shared visibility controls with owner/admin governance actions for visibility updates and archive.
- Template library now surfaces current owner, supports ownership transfer handoff controls, and provides collaborator role management (editor/reviewer/viewer).
- Template governance supports owner-submitted approvals and admin approve/reject resolution, but SLA aging/escalation automation is still pending.
- Activity explorer now supports server-side pagination plus action/outcome/entity/date filters and CSV export for current filtered view.
- Activity workflow lacks saved filter presets and long-range asynchronous export jobs for compliance operations.
- Export platform still lacks native PPTX generation and multi-slide PPTX controls.
- Template selection remains text-first with no preview thumbnails.
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
| S2.6 | Template Visual Selection Hardening | `SLD-FE-210`, `SLD-BE-210` | Net-new |
| S3.1 | Template Governance + ACL Hardening | `SLD-FE-400`, `SLD-BE-400` | Net-new |
| S3.3 | Template Delegation Hardening | `SLD-FE-410`, `SLD-BE-410` | Net-new |
| S3.2 | Audit Explorer + Query Hardening | `SLD-FE-420`, `SLD-BE-420` | Net-new |
| S3.4 | Approval SLA and Escalation Hardening | `SLD-FE-440`, `SLD-BE-440` | Net-new |
| S3.5 | Audit Ops Presets + Long-Range Exports | `SLD-FE-430`, `SLD-BE-430` | Net-new |
| S3 | Slide Platform (Backend + FE/BE Integration) | `US-SLD-030`..`US-SLD-039` | Net-new |
| S1.5 | Reliability Telemetry Hardening | `SLD-FE-150`, `SLD-BE-150` | Net-new |
| S2.7 | Precision Layout Hardening | `SLD-FE-340` | Net-new |
| S6 | Maintainability Decomposition | `SLD-FE-610` | Net-new |

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
| S2.6 | Backlog (`SLD-FE-210`, `SLD-BE-210`) | Story definitions complete; implementation pending |
| S3.1 | Complete (`SLD-FE-400`, `SLD-BE-400`) | Ready to commit as one epic milestone |
| S3.3 | Complete (`SLD-FE-410`, `SLD-BE-410`) | Ownership/collaborator governance now includes approval submission + admin resolution workflow |
| S3.2 | Complete (`SLD-FE-420`, `SLD-BE-420`) | Ready to commit as one epic milestone |
| S3.4 | Backlog (`SLD-FE-440`, `SLD-BE-440`) | Story definitions complete; implementation pending |
| S3.5 | Backlog (`SLD-FE-430`, `SLD-BE-430`) | Story definitions complete; implementation pending |
| S3 | Complete (`US-SLD-030`..`US-SLD-039`) | Ready to commit as one epic milestone |
| S1.5 | Backlog (`SLD-FE-150`, `SLD-BE-150`) | Story definitions complete; implementation pending |
| S2.7 | Backlog (`SLD-FE-340`) | Story definitions complete; implementation pending |
| S6 | Backlog (`SLD-FE-610`) | Story definitions complete; decomposition pending |

## Priority Suggestion

1. Add PPTX export platform slice with warnings/reporting and async orchestration (`SLD-FE-500`, `SLD-BE-500`, `SLD-BE-510`).
2. Add template visual selection previews (`SLD-FE-210`, `SLD-BE-210`).
3. Add saved activity filter presets and long-range audit export jobs (`SLD-FE-430`, `SLD-BE-430`).
4. Add governance SLA/escalation handling for stale pending template approvals (`SLD-FE-440`, `SLD-BE-440`).
5. Add precision snapping and guide overlays (`SLD-FE-340`).
6. Add reliability telemetry and discard analytics (`SLD-FE-150`, `SLD-BE-150`).

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
