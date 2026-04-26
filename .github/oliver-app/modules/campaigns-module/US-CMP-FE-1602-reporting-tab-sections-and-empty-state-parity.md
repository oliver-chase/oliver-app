---
ID: US-CMP-FE-1602
Title: Reporting tab sections and empty-state parity
Status: In Progress
Verified: false
Backdated: 2026-04-25
Ticket: CMP-FE-1602
Epic: CMP-PAR-E5: Operational Reporting and Throughput Clarity
---

As a campaign manager
I want the reporting tab to mirror required campaign progress, review ops, and publishing sections
So I can generate stakeholder-ready updates from one workspace view

Acceptance Criteria:
- [ ] Reporting tab includes explicit sections for Campaign Progress, Review Operations, and Publishing.
- [ ] Section cards and concise tables use consistent design-system layout and tokenized spacing.
- [ ] Empty states explain which operational data is missing and what action should happen next.
- [ ] Generate Report action communicates clear success/failure states and ties reports to campaign context.
- [ ] Report filters preserve state between tab switches and route transitions.
- [ ] Mobile behavior maintains readability for cards and summary tables.

Execution Update (2026-04-26):
- Added explicit report sections: `Campaign Progress`, `Review Operations`, and `Publishing`.
- Added report empty-state guidance when current filter range has no matching content.
- Added session-backed report filter persistence (`sessionStorage`) so report filters survive tab/route switches in campaign workspace.
