---
ID: US-O32
Title: Improve Startup Performance and Permission Warm Path
Status: Not Started
Verified: false
Backdated: 2026-04-25
---

As an Oliver user
I want the app to load quickly and resolve module permissions without lag
So sign-in, refresh, and first action feel reliable

Acceptance Criteria:
- [ ] A measurable startup budget is defined (auth complete, permission resolved, first interactive hub render).
- [ ] Hub permission resolution avoids duplicate round trips and unnecessary re-fetches on initial load.
- [ ] Loading state communicates progress without flashing incorrect module availability.
- [ ] Startup telemetry records P50/P95 timings for auth bootstrap, user fetch, and permission filtering.
- [ ] Performance regressions above agreed thresholds fail CI or release gates.
- [ ] Improvement is validated on desktop and mobile viewport flows.

