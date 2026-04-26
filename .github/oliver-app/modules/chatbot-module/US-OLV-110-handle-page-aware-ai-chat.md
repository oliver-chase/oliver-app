---
ID: US-OLV-110
Title: Handle page-aware AI chat
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Introduce shared OliverDock and upload flows

As a operator
I want Oliver to include module-specific context payloads
So that answers reflect the current workspace

Acceptance Criteria:
- [ ] Accounts context includes portfolio or selected account data.
- [ ] HR context includes current page and summary counts.
- [ ] SDR context includes current tab and summary counts.
- [ ] Admin context includes current tab.
- [ ] Chat requests send the current pageLabel as pageContext.

Notes: CRM has no contextPayload beyond static config.
---
