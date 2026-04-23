---
ID: US-OLV-067
Title: Run SDR chat flows
Status: Code Present
Verified: false
Backdated: 2026-04-22
Milestone: Add module chat flows and story backfill docs

As a SDR operator
I want Oliver SDR flows for prospect and draft actions
So that I can work pipeline actions from the assistant

Acceptance Criteria:
- [ ] SDR page registers flows from buildSdrFlows.
- [ ] Flows receive prospects and approval items.
- [ ] Successful flow operations refetch SDR data.
- [ ] The dock context payload includes current tab and counts.

Notes: Specific flow behaviors should be verified against src/app/sdr/flows.ts.
---
