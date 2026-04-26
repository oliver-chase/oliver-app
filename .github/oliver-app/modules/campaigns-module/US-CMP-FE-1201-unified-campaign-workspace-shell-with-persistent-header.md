---
ID: US-CMP-FE-1201
Title: Unified campaign workspace shell with persistent header
Status: Done
Verified: false
Backdated: 2026-04-25
Ticket: CMP-FE-1201
Epic: CMP-PAR-E1: Workspace IA and Context Integrity
---

As a campaign operator
I want every campaign view to keep one persistent campaign header and tab navigation
So I always know campaign context while switching between workflows

Acceptance Criteria:
- [x] Campaign workspace uses one persistent header across Overview, Content, Review Queue, Calendar, Reminders, and Reporting.
- [x] Header includes campaign name, status, owner, date range, channels, and key operational metrics.
- [x] Switching workspace tabs retains campaign context and selected campaign identity.
- [x] All workspace tabs use the same container width, spacing, and structural rhythm.
- [x] Sidebar links resolve to route-backed campaign subpages and preserve active-state highlighting.
- [x] Mobile and tablet layouts keep header context visible without clipping or duplicate controls.

Execution Update (2026-04-26):
- Added a persistent `Campaign Workspace Context` shell above section content, including selected campaign controls, status chips, date/channel context, and lifecycle counts.
- Added route-backed tab links for Overview, Content, Review, Calendar, Reminders, and Reports that preserve active-state highlighting and selected campaign identity across route transitions.
