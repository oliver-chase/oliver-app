# Slides Module — V1 Completion + V2 Expansion (2026-04-25)

Scope: `oliver-app` Slides module (`/slides`, importer, canvas editor, persistence, and export pipeline).

This backlog bundle captures the full program requested for:
- V1 completion (render-fidelity import, canonical JSON enforcement, export completeness, multi-slide decks, proportional resize)
- V2 expansion (templates, themes, layout-aware editing, reveal.js export, advanced import, editor UX hardening)
- V3 responsive/layout-aware evolution (constraints, pinned elements, and aspect-ratio intelligence)

## Story Index

| Stage | Story IDs | Focus |
| --- | --- | --- |
| V1 | `US-SLD-050`..`US-SLD-058` | Import fidelity, intake validation, warning taxonomy, sample parity gates, canonical SlideDocument JSON, HTML/PDF/PPTX export, multi-slide decks, proportional resize |
| V2 | `US-SLD-060`..`US-SLD-065` | Templates/themes/layout-aware editing/reveal export/advanced import/editor UX |
| V3 | `US-SLD-070` | Responsive and aspect-ratio intelligent layout behavior |

## Program Spec

- See `SLD-V1-V2-V3-program-spec.md` in this folder for consolidated requirements, acceptance criteria, and phased non-goals.

## Canonical Intent

- HTML is an import source format, not the editor source of truth.
- Slide editing, autosave, and exports run from canonical SlideDocument JSON.
- Export fidelity is measured against canvas rendering generated from JSON.
