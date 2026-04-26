# Slides Gap Register (2026-04-24)

This register ensures every known slide-module gap is explicitly mapped to a backlog story ID.

| Gap | Story Coverage | Epic | Status |
| --- | --- | --- | --- |
| Slide module copy over-promises current capability | `US-SLD-004` | S0 | Done |
| Canonical slide tracking/audit alignment | `US-SLD-003`, `US-SLD-005` | S0 | Done |
| Import preflight validation | `US-SLD-010` | S1 | Done |
| Structured import results + warning UX | `US-SLD-011` | S1 | Done |
| Import progress/cancel UX | `US-SLD-012` | S1 | Done |
| Import/export round-trip reliability fixtures | `US-SLD-013` | S1 | Done |
| Render editable slide canvas from component JSON | `US-SLD-020` | S2 | Done |
| Selection, drag, resize, keyboard nudge | `US-SLD-021` | S2 | Done |
| Inline text editing + style toolbar | `US-SLD-022` | S2 | Done |
| Multi-select alignment/distribution | `US-SLD-023` | S2 | Done |
| Undo/redo history | `US-SLD-024` | S2 | Done |
| Keyboard-first + accessibility baseline | `US-SLD-025` | S2 | Done |
| Visual regression screenshot baseline for key editor states | `US-SLD-026` | S2.1 | Done |
| Locked-layer immutability across manipulation/style operations | `US-SLD-027` | S2.2 | Done |
| Library search no-match UX + template visibility filtering before backend limit | `US-SLD-028` | S2.3 | Done |
| Slides chatbot command parity for save/export/navigation with flow runtime guardrails | `US-SLD-029` | S2.4 | Done |
| Slides chatbot direct HTML export download execution | `US-SLD-040` | S2.5 | Done |
| Template publish visibility controls (private/shared) with role-aware UX constraints | `SLD-FE-400` | S3.1 | Code Present |
| Template ACL and ownership governance for visibility edits/archive actions | `SLD-BE-400` | S3.1 | Code Present |
| Template owner handoff controls with visible owner context and collaborator role management UI | `SLD-FE-410` | S3.3 | Code Present |
| Backend ownership/collaborator governance actions with destination-user authorization | `SLD-BE-410` | S3.3 | Code Present |
| Activity explorer filters + pagination + CSV export UX | `SLD-FE-420` | S3.2 | Code Present |
| Audits API server-side filter/search/date pagination contract | `SLD-BE-420` | S3.2 | Code Present |
| Template library visual picker with thumbnails and preview quality signals | `SLD-FE-210`, `SLD-BE-210` | S2.6 | Code Present (`SLD-FE-210`) |
| Precision canvas snapping and visual alignment guides | `SLD-FE-340` | S2.7 | Code Present |
| Unsaved-change/discard telemetry instrumentation and metrics | `SLD-FE-150`, `SLD-BE-150` | S1.5 | Backlog Defined |
| Approval aging SLA indicators and stale-request escalation | `SLD-FE-440` | S3.4 | Done |
| Approval escalation routing and admin notification targets/channels | `SLD-BE-440` | S3.4 | In Progress |
| Saved audit filter presets and long-range asynchronous compliance exports | `SLD-FE-430`, `SLD-BE-430` | S3.5 | Code Present |
| Native PPTX export (single + multi) with warnings report and async job orchestration | `SLD-FE-500`, `SLD-BE-500`, `SLD-BE-510` | S4 | Backlog Defined |
| Slides page orchestration decomposition for maintainability | `SLD-FE-610` | S6 | Backlog Defined |
| Slide and Template Data Model + RLS | `US-SLD-030` | S3 | Done |
| Save API + autosave state contract | `US-SLD-031` | S3 | Done |
| Template Library + My Slides FE/BE wiring | `US-SLD-032` | S3 | Done |
| HTML/PDF export contract | `US-SLD-033` | S3 | Done |
| Conflict handling + crash recovery | `US-SLD-034` | S3 | Done |
| Audit log + telemetry for slide operations | `US-SLD-035` | S3 | Done |
| End-to-end Slides FE/BE regression suite | `US-SLD-036` | S3 | Done |
| Unsaved-change protection for workspace navigation and hub exits | `US-SLD-037` | S3 | Done |
| Scoped draft recovery lifecycle and stale-draft clearing | `US-SLD-038` | S3 | Done |
| Autosave retry queue with bounded backoff and manual controls | `US-SLD-039` | S3 | Done |

## No Unmapped Gaps

As of this snapshot, all known gaps discussed in QA are mapped to backlog stories.
