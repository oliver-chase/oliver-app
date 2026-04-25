# Slides Backlog

Date: 2026-04-25  
Scope: `/slides` HTML import, persistence, exports, and Oliver Dock workflows.

## Journey Gap Map

| Journey Stage | Current Behavior | Gap / Risk | Ticket(s) |
| --- | --- | --- | --- |
| Start from template | Template duplication works, then opens in Import workspace. Template cards now include visual canvas previews. | Quick preview picker/search quality scoring and backend pre-rendered thumbnail assets are still missing. | SLD-FE-210, SLD-BE-210 |
| Edit imported slide | Scaled 16:9 canvas renderer, resize handles, inline text editing, and bounded drag/nudge controls are available. | Advanced snapping/guides are still missing for precision layouts. | SLD-FE-340 |
| Save + leave safely | Save, conflict handling, draft recovery, autosave, retry queue/backoff, and browser history guardrails now exist. | No unsaved-change telemetry/analytics to quantify discard-risk trends. | SLD-FE-150, SLD-BE-150 |
| Template publishing | Publish from My Slides supports private/shared visibility, ownership transfer handoff, collaborator role controls (editor/reviewer/viewer), and approval request/resolution workflow for governance changes. | No approval SLA/escalation automation yet for stale requests. | SLD-FE-440, SLD-BE-440 |
| Export for client delivery | HTML and print-to-PDF flows exist. PPTX export now supports current-slide and multi-slide selection with warnings surfaced in UI. | Async job orchestration and richer backend-native asset fallback pipeline are still missing for long-running enterprise exports. | SLD-FE-500, SLD-BE-500, SLD-BE-510 |
| Audit and compliance | Save/export/delete actions are logged and now support server-side filtered activity paging plus CSV export of current view. Saved activity filter presets are now available (personal + shared/admin). | Long-range/full-history async export job is still missing for compliance spans beyond paged queries. | SLD-FE-430, SLD-BE-430 |

## Dead / Incomplete / Debt Findings

1. `src/app/slides/page.tsx` is a 1k+ line orchestrator combining parser UX, persistence, export, conflict handling, and tab UI. This is high coupling debt and slows feature delivery (`SLD-FE-610`).
2. No confirmed dead code in the slides subtree right now; debt is mostly oversized UI composition and missing operational tooling.
3. Activity feed now supports operational filtering/export, but it still lacks saved filter presets and org-level canned audit views.

## Epic and Ticket Backlog

## EPIC SLD-E1: Reliability and Session Safety
Goal: Prevent accidental loss and make save behavior resilient under real network conditions.
KPI: Unsaved-data loss incidents trend to zero and save-success rate remains >= 99%.

| Ticket | Title | Layer | Priority | Status | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| SLD-FE-121 | Unsaved-change protection for leave/navigation | Frontend | P0 | Done (2026-04-25) | Confirm dialog on unsafe workspace navigation and hub leave; browser unload prompt when draft is unsaved. |
| SLD-FE-123 | Draft lifecycle hardening (persist unsaved only, per-user keying) | Frontend | P0 | Done (2026-04-25) | Recovery appears only for unsaved drafts; saved/clean state clears recovery snapshot; per-user storage scope enforced. |
| SLD-FE-140 | Offline retry queue with exponential backoff | Frontend | P1 | Done (2026-04-25) | Failed autosaves queue with exponential backoff, retry on reconnect/manual trigger, and surface queue health state in UI. |
| SLD-FE-142 | Browser back/forward route guard coverage | Frontend | P1 | Done (2026-04-25) | Back/forward route transitions respect unsaved guardrails without trap loops. |
| SLD-FE-150 | Unsaved-change risk telemetry + discard analytics | Frontend | P2 | Backlog | Client emits discard-risk/save-friction telemetry with journey context and feature-flag control. |
| SLD-BE-150 | Unsaved-change telemetry ingestion + metrics contract | Backend | P2 | Backlog | Backend stores and exposes discard-rate/retry-rate metrics with retention/privacy controls. |

## EPIC SLD-E2: Core Editing Experience
Goal: Close the workflow gap between import and publish/export by adding true slide editing.
KPI: 80%+ of edits completed without leaving the slide module.

| Ticket | Title | Layer | Priority | Status | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| SLD-FE-300 | Canvas renderer for parsed component model | Frontend | P0 | Done (2026-04-25) | Parsed components render on a scaled 16:9 canvas with deterministic positioning and baseline inline content editing. |
| SLD-FE-310 | Drag and nudge movement controls | Frontend | P0 | Done (2026-04-25) | Mouse drag updates coordinates in real time and marks dirty on release; keyboard nudge supports 1px and Shift+10px movement with bounds clamping. |
| SLD-FE-320 | Resize handles + bounds constraints | Frontend | P1 | Done (2026-04-25) | Width/height edits via handles with minimum-size and canvas bounds enforcement. |
| SLD-FE-330 | Inline text editing with content sanitization parity | Frontend | P1 | Done (2026-04-25) | Text edit mode preserves sanitization guarantees and updates saved component content. |
| SLD-FE-340 | Canvas snapping guides + precision layout | Frontend | P2 | Backlog | Drag/resize interactions support snapping and visual guides without breaking keyboard and lock guardrails. |

## EPIC SLD-E3: Library and Governance
Goal: Make shared templates and audits operationally usable for admins and teams.
KPI: Template reuse rate and admin audit resolution time both improve release-over-release.

| Ticket | Title | Layer | Priority | Status | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| SLD-FE-400 | Template visibility controls in publish workflow | Frontend | P1 | Done (2026-04-25) | User can set template visibility (private/shared) with clear role constraints. |
| SLD-BE-400 | Template ACL and ownership enforcement | Backend | P1 | Done (2026-04-25) | API enforces visibility/edit/delete rights by owner/role with audit entries. |
| SLD-FE-410 | Template ownership + collaborator role controls | Frontend | P1 | Done (2026-04-25) | Owner governance actions submit approval requests for admin resolution; admin queue supports approve/reject with audit visibility. |
| SLD-BE-410 | Template ownership + collaborator governance contract | Backend | P1 | Done (2026-04-25) | API enforces owner/admin governance rights, persists template approvals, and applies/rejects pending requests with audit events. |
| SLD-FE-420 | Audit explorer with filter/search/export | Frontend | P2 | Done (2026-04-25) | Activity tab supports filters by actor/action/outcome/date and exportable views. |
| SLD-BE-420 | Audit query endpoints with indexed filtering | Backend | P2 | Done (2026-04-25) | API supports server-side filtering/pagination and returns predictable query latency. |
| SLD-FE-430 | Activity filter presets + saved views | Frontend | P2 | In Progress (2026-04-25) | Save/apply/delete presets are implemented; expand preset management UX and shared-governance constraints as needed. |
| SLD-BE-430 | Long-range audit export jobs + presets contract | Backend | P2 | In Progress (2026-04-25) | Preset persistence contract is implemented; async long-range compliance export jobs remain open. |
| SLD-FE-440 | Approval aging SLA signal + escalation UI | Frontend | P2 | Done (2026-04-25) | Template approval queue now surfaces SLA age states (healthy/at-risk/overdue) and escalation reminders for requesters/admins. |
| SLD-BE-440 | Template approval SLA + escalation automation | Backend | P2 | In Progress (2026-04-25) | Manual escalation and admin sweep API/audit flows are live; scheduled/idempotent unattended escalation automation remains open. |

## EPIC SLD-E4: Export Platform
Goal: Expand deliverable options while preserving editable output quality.
KPI: Export completion rate >= 99% and support incidents for export mismatches decrease.

| Ticket | Title | Layer | Priority | Status | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| SLD-FE-500 | PPTX export UX (single + multi-select) | Frontend | P1 | In Progress (2026-04-25) | Current-slide and selected My Slides exports are shipped; continue hardening status/warnings and selection UX. |
| SLD-BE-500 | PPTX generation service (native objects + fallback images) | Backend | P1 | In Progress (2026-04-25) | Native text/shape mapping with warnings is shipped in current export path; image/logo fallback mapping remains. |
| SLD-BE-510 | Export job model for long-running conversions | Backend | P2 | Backlog | Async jobs track status, retries, and downloadable artifacts. |

## EPIC SLD-E6: Maintainability and Decomposition
Goal: Reduce coupling and improve change safety in the slide module.
KPI: PR cycle time and regression rework decrease across slide feature iterations.

| Ticket | Title | Layer | Priority | Status | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| SLD-FE-610 | Slides page orchestrator decomposition | Frontend | P3 | Backlog | `src/app/slides/page.tsx` decomposed into bounded modules with no workflow regressions. |

## Next Features In Line

1. SLD-FE-500 + SLD-BE-500 + SLD-BE-510: Add native PPTX export with async orchestration and warnings reporting.
2. SLD-FE-210 + SLD-BE-210: Expand template preview flow with quick-preview picker and backend thumbnail asset generation.
3. SLD-FE-430 + SLD-BE-430: Add saved audit presets and long-range export jobs.
4. SLD-BE-440: Add automated SLA escalation orchestration (manual escalation path already shipped).
5. SLD-FE-340: Add snapping/guides for precision editing workflows.
6. SLD-FE-150 + SLD-BE-150: Add unsaved-change risk telemetry and reliability analytics.
