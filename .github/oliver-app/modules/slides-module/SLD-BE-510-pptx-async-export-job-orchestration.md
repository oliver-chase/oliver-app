---
ID: SLD-BE-510
Title: PPTX Async Export Job Orchestration
Status: Done
Verified: true
Backdated: 2026-04-25
---

As a platform maintainer
I want asynchronous orchestration for larger PPTX export workloads
So multi-slide or heavy export requests stay reliable under production load

Acceptance Criteria:
- [x] PPTX export jobs support queued/running/succeeded/failed lifecycle states.
- [x] Job payload includes selected slide ids, requester identity, and generation options.
- [x] Retry policy is bounded and idempotent for transient generation/storage failures.
- [x] Completed jobs expose downloadable artifact metadata and expiration policy.
- [x] Job lifecycle events are queryable for operational and compliance diagnostics.

Evidence:
- Job lifecycle + payload contract implemented in `/functions/api/slides.js` (`handleRequestPptxExportJobAction`, `handleDownloadPptxExportJobAction`, `resource=pptx-export-jobs`).
- Client-side API wrappers and local parity model implemented in `/src/lib/slides.ts` (`requestPptxExportJob`, `downloadPptxExportJob`, `listPptxExportJobs`).
- Export UI now orchestrates through job API before artifact download in `/src/app/slides/page.tsx`.
- Contract checks in `/tests/contracts/slides-pptx-export.contract.test.mjs` validate request, list, and download paths.
