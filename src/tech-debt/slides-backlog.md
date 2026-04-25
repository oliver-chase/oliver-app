# Slides Backlog

Date: 2026-04-25  
Scope: `/slides` HTML import, persistence, exports, and Oliver Dock workflows.

## Journey Gap Map

| Journey Stage | Current Behavior | Gap / Risk | Ticket(s) |
| --- | --- | --- | --- |
| Start from template | Template duplication works, then opens in Import workspace. | No thumbnail, no visual picker quality signal; template choice is mostly text-only. | SLD-FE-210, SLD-BE-210 |
| Edit imported slide | Parse summary + component table works. | No in-canvas editing yet (drag/resize/direct text edit), so user cannot complete full edit journey in one place. | SLD-FE-300 through SLD-FE-330 |
| Save + leave safely | Save, conflict handling, draft recovery, autosave, and retry queue/backoff now exist. | Browser back route transitions still need full guard coverage for all navigation surfaces. | SLD-FE-142 |
| Template publishing | Publish from My Slides works. | No template visibility controls (private/shared) or ownership governance workflows. | SLD-FE-400, SLD-BE-400 |
| Export for client delivery | HTML and print-to-PDF flows exist. | No native PPTX export path, warnings report, or multi-slide export controls. | SLD-FE-500, SLD-BE-500 |
| Audit and compliance | Save/export/delete actions are logged. | No admin-grade filter/search/export for audit events; troubleshooting remains manual. | SLD-FE-420, SLD-BE-420 |

## Dead / Incomplete / Debt Findings

1. `src/app/slides/page.tsx` is a 1k+ line orchestrator combining parser UX, persistence, export, conflict handling, and tab UI. This is high coupling debt and slows feature delivery.
2. Oliver Dock command coverage is still narrow (import/parse only), creating a disconnected assistant journey for save/export/library operations.
3. No confirmed dead code in the slides subtree right now; debt is mostly incomplete workflow coverage and oversized UI composition.

## Epic and Ticket Backlog

## EPIC SLD-E1: Reliability and Session Safety
Goal: Prevent accidental loss and make save behavior resilient under real network conditions.
KPI: Unsaved-data loss incidents trend to zero and save-success rate remains >= 99%.

| Ticket | Title | Layer | Priority | Status | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| SLD-FE-121 | Unsaved-change protection for leave/navigation | Frontend | P0 | Done (2026-04-25) | Confirm dialog on unsafe workspace navigation and hub leave; browser unload prompt when draft is unsaved. |
| SLD-FE-123 | Draft lifecycle hardening (persist unsaved only, per-user keying) | Frontend | P0 | Done (2026-04-25) | Recovery appears only for unsaved drafts; saved/clean state clears recovery snapshot; per-user storage scope enforced. |
| SLD-FE-140 | Offline retry queue with exponential backoff | Frontend | P1 | Done (2026-04-25) | Failed autosaves queue with exponential backoff, retry on reconnect/manual trigger, and surface queue health state in UI. |
| SLD-FE-142 | Browser back/forward route guard coverage | Frontend | P1 | Backlog | Back/forward route transitions respect unsaved guardrails without trap loops. |

## EPIC SLD-E2: Core Editing Experience
Goal: Close the workflow gap between import and publish/export by adding true slide editing.
KPI: 80%+ of edits completed without leaving the slide module.

| Ticket | Title | Layer | Priority | Status | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| SLD-FE-300 | Canvas renderer for parsed component model | Frontend | P0 | Backlog | Parsed components render visually on 16:9 canvas with deterministic positioning. |
| SLD-FE-310 | Drag and nudge movement controls | Frontend | P0 | Backlog | Mouse drag + keyboard nudge updates component coordinates and dirty state. |
| SLD-FE-320 | Resize handles + bounds constraints | Frontend | P1 | Backlog | Width/height edits via handles with minimum-size and canvas bounds enforcement. |
| SLD-FE-330 | Inline text editing with content sanitization parity | Frontend | P1 | Backlog | Text edit mode preserves sanitization guarantees and updates saved component content. |

## EPIC SLD-E3: Library and Governance
Goal: Make shared templates and audits operationally usable for admins and teams.
KPI: Template reuse rate and admin audit resolution time both improve release-over-release.

| Ticket | Title | Layer | Priority | Status | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| SLD-FE-400 | Template visibility controls in publish workflow | Frontend | P1 | Backlog | User can set template visibility (private/shared) with clear role constraints. |
| SLD-BE-400 | Template ACL and ownership enforcement | Backend | P1 | Backlog | API enforces visibility/edit/delete rights by owner/role with audit entries. |
| SLD-FE-420 | Audit explorer with filter/search/export | Frontend | P2 | Backlog | Activity tab supports filters by actor/action/outcome/date and exportable views. |
| SLD-BE-420 | Audit query endpoints with indexed filtering | Backend | P2 | Backlog | API supports server-side filtering/pagination and returns predictable query latency. |

## EPIC SLD-E4: Export Platform
Goal: Expand deliverable options while preserving editable output quality.
KPI: Export completion rate >= 99% and support incidents for export mismatches decrease.

| Ticket | Title | Layer | Priority | Status | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| SLD-FE-500 | PPTX export UX (single + multi-select) | Frontend | P1 | Backlog | User selects one/many slides and gets status + warnings report. |
| SLD-BE-500 | PPTX generation service (native objects + fallback images) | Backend | P1 | Backlog | Text/shapes map to native PPT objects where supported; unsupported nodes fall back with warnings. |
| SLD-BE-510 | Export job model for long-running conversions | Backend | P2 | Backlog | Async jobs track status, retries, and downloadable artifacts. |

## Next Features In Line

1. SLD-FE-300: Render editable canvas from parsed component JSON (foundation for drag/resize/edit tickets).
2. SLD-FE-400 + SLD-BE-400: Add template visibility/ownership controls so publish workflow is complete end-to-end.
3. SLD-FE-142: Add browser back/forward route guard coverage across all slide navigation surfaces.
