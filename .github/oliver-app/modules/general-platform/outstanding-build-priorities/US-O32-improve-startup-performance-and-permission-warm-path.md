---
ID: US-O32
Title: Improve Startup Performance and Permission Warm Path
Status: Done
Verified: true
Backdated: 2026-04-25
---

As an Oliver user
I want the app to load quickly and resolve module permissions without lag
So sign-in, refresh, and first action feel reliable

Acceptance Criteria:
- [x] A measurable startup budget is defined (auth complete, permission resolved, first interactive hub render).
- [x] Hub permission resolution avoids duplicate round trips and unnecessary re-fetches on initial load.
- [x] Loading state communicates progress without flashing incorrect module availability.
- [x] Startup telemetry records P50/P95 timings for auth bootstrap, user fetch, and permission filtering.
- [x] Performance regressions above agreed thresholds fail CI or release gates.
- [x] Improvement is validated on desktop and mobile viewport flows.

Implementation Evidence (2026-04-26):
- Added startup telemetry framework with explicit budgets and percentile summaries:
  - `src/lib/startup-telemetry.ts`
  - supporting guide: `startup-budget-and-gate-US-O32.md`
- Added runtime startup metric capture points:
  - `src/context/AuthContext.tsx` records `auth_bootstrap_ms`
  - `src/context/UserContext.tsx` records `user_fetch_ms`
  - `src/app/page.tsx` records `permission_filter_ms` and `hub_interactive_ms`
- Improved warm-path behavior:
  - in-flight user bootstrap de-duplication for identical identity keys
  - 60-second warm cache for startup user/permission resolution
- Updated hub loading copy to communicate startup phases:
  - `Checking sign-in…`
  - `Loading permissions…`
- Added regression gate test that fails on startup budget breaches:
  - `tests/e2e/frontend-smoke.spec.ts`
  - `hub startup telemetry records budgeted auth and permission warm-path timings`
- Added QA workflow startup gate entry:
  - `src/tech-debt/deep-qa-workflow.md`
