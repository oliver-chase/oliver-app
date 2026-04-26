---
ID: SLD-BE-500
Title: PPTX Native Object Generation Service
Status: Done
Verified: true
Backdated: 2026-04-25
---

As a platform maintainer
I want backend PPTX generation that maps slide components to native PowerPoint objects
So exported decks remain editable and consistent with the source canvas

Acceptance Criteria:
- [x] Export contract maps supported slide component types to native PPTX text/shape objects.
- [x] Unsupported component types degrade gracefully with explicit warnings payload.
- [x] Export response includes warnings summary used by FE warnings report.
- [x] Export path enforces slide ownership/visibility permissions and row-level ACL.
- [x] PPTX export actions are captured in `slide_audit_events` with outcome status.

Evidence:
- API contract now exposes native projection + warnings via `request-pptx-export-job` and download retrieval via `download-pptx-export-job` in `/functions/api/slides.js`.
- Frontend export flow consumes backend warnings metadata before download in `/src/app/slides/page.tsx` (`runPptxExport`).
- Contract coverage added in `/tests/contracts/slides-pptx-export.contract.test.mjs`:
  - `request-pptx-export-job returns succeeded job payload with warnings summary`
  - `pptx-export-jobs listing and download enforce actor access`
