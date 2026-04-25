# Slides Gap Register (2026-04-24)

This register ensures every known slide-module gap is explicitly mapped to a backlog story ID.

| Gap | Story Coverage | Epic | Status |
| --- | --- | --- | --- |
| Slide module copy over-promises current capability | `US-SLD-004` | S0 | Code Present |
| Canonical slide tracking/audit alignment | `US-SLD-003`, `US-SLD-005` | S0 | Code Present |
| Import preflight validation | `US-SLD-010` | S1 | Code Present |
| Structured import results + warning UX | `US-SLD-011` | S1 | Code Present |
| Import progress/cancel UX | `US-SLD-012` | S1 | Code Present |
| Import/export round-trip reliability fixtures | `US-SLD-013` | S1 | Code Present |
| Render editable slide canvas from component JSON | `US-SLD-020` | S2 | Code Present |
| Selection, drag, resize, keyboard nudge | `US-SLD-021` | S2 | Code Present |
| Inline text editing + style toolbar | `US-SLD-022` | S2 | Code Present |
| Multi-select alignment/distribution | `US-SLD-023` | S2 | Code Present |
| Undo/redo history | `US-SLD-024` | S2 | Code Present |
| Keyboard-first + accessibility baseline | `US-SLD-025` | S2 | Code Present |
| Visual regression screenshot baseline for key editor states | `US-SLD-026` | S2.1 | Code Present |
| Locked-layer immutability across manipulation/style operations | `US-SLD-027` | S2.2 | Code Present |
| Library search no-match UX + template visibility filtering before backend limit | `US-SLD-028` | S2.3 | Code Present |
| Slides chatbot command parity for save/export/navigation with flow runtime guardrails | `US-SLD-029` | S2.4 | Code Present |
| Slides chatbot direct HTML export download execution | `US-SLD-040` | S2.5 | Code Present |
| Template publish visibility controls (private/shared) with role-aware UX constraints | `SLD-FE-400` | S3.1 | Code Present |
| Template ACL and ownership governance for visibility edits/archive actions | `SLD-BE-400` | S3.1 | Code Present |
| Template owner handoff controls with visible owner context in library cards | `SLD-FE-410` | S3.3 | Partial (ownership transfer live) |
| Backend ownership transfer action with destination-user authorization | `SLD-BE-410` | S3.3 | Partial (ownership transfer live) |
| Activity explorer filters + pagination + CSV export UX | `SLD-FE-420` | S3.2 | Code Present |
| Audits API server-side filter/search/date pagination contract | `SLD-BE-420` | S3.2 | Code Present |
| Slide/template data model + RLS | `US-SLD-030` | S3 | Code Present |
| Save API + autosave state contract | `US-SLD-031` | S3 | Code Present |
| Template Library + My Slides FE/BE wiring | `US-SLD-032` | S3 | Code Present |
| HTML/PDF export contract | `US-SLD-033` | S3 | Code Present |
| Conflict handling + crash recovery | `US-SLD-034` | S3 | Code Present |
| Audit log + telemetry for slide operations | `US-SLD-035` | S3 | Code Present |
| End-to-end Slides FE/BE regression suite | `US-SLD-036` | S3 | Code Present |
| Unsaved-change protection for workspace navigation and hub exits | `US-SLD-037` | S3 | Code Present |
| Scoped draft recovery lifecycle and stale-draft clearing | `US-SLD-038` | S3 | Code Present |
| Autosave retry queue with bounded backoff and manual controls | `US-SLD-039` | S3 | Code Present |

## No Unmapped Gaps

As of this snapshot, all known gaps discussed in QA are mapped to backlog stories.
