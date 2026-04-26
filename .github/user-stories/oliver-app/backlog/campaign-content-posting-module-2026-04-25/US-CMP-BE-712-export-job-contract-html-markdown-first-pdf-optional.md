---
ID: US-CMP-BE-712
Title: Export job contract (HTML/markdown first, PDF optional)
Status: Done
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-712
Epic: CMP-E7: Reporting and Export
---

As a stakeholder
I want shareable exports so I can send status without manually rewriting metrics.
So campaign communication scales.

Acceptance Criteria:
- [ ] Export request stores `campaign_report_exports` job record.
- [ ] Export output includes selected filters and required summary sections.
- [ ] HTML/markdown export ships as MVP baseline.
- [ ] PDF output is optional and feature-flagged by runtime capability.
- [ ] Export actions are logged and permission-protected.
