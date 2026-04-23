---
ID: US-OLV-102
Title: Audit dead design tokens
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Operationalize design system, CI, and security

As a designer
I want to see potentially dead tokens in the design system page
So that token cleanup can be done deliberately

Acceptance Criteria:
- [ ] The design system page renders a dead-token audit card.
- [ ] The audit compares token definitions to usage where implemented.
- [ ] Empty or missing usage states do not crash the page.
- [ ] Results reflect the current CSS/token files at runtime or build-time data.

Notes: Implementation exists in page code; audit accuracy should be reviewed.
---
