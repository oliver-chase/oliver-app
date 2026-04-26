---
ID: US-SLD-033
Title: HTML and PDF Export Service Contract
Status: Complete
Verified: false
Backdated: 2026-04-24
---

As a slide editor user
I want reliable HTML and PDF export from current slide state
So I can deliver client-ready output without manual reconstruction

Acceptance Criteria:
- [x] HTML export produces a clean file without editor chrome and with preserved component layout.
- [x] PDF export contract is defined (client print flow and optional server-rendered fallback path).
- [x] Export errors are surfaced with clear fallback guidance and retry options.
- [x] Export output includes deterministic metadata needed for re-import/traceability.

QA / Evidence:
- `src/components/slides/html-export.ts`: emits canonical slide markup from SlideDocument JSON with deterministic container classes and inline styles.
- `src/app/slides/page.tsx`: export controls generate fresh HTML blobs and expose `slides-export-html` value for trace assertions.
- `tests/e2e/frontend-smoke.spec.ts`:
  - `US-SLD-033` HTML/PDF export smoke path assertions include HTML download availability and export fallback behavior.
- `tests/e2e/slides-regression.spec.ts`:
  - export action coverage for HTML audit events and raw output assertions.
- `tests/contracts/slides-api.contract.test.mjs`: verifies structured audit export/contract outcomes and failure envelopes for upstream export exceptions.

Verification status:
- Attempted: `npx playwright test tests/e2e/slides-regression.spec.ts --workers=1`
- Blocked: Playwright cannot start webServer in this sandbox (`EPERM: operation not permitted 0.0.0.0:3001`) and `playwright` can’t complete browser-driven export assertions here.
