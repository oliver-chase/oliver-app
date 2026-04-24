---
ID: US-OLV-123
Title: Preserve cross-page shell and heading consistency
Status: Code Present
Verified: true
Backdated: 2026-04-23
Milestone: Normalize design tokens and responsive behavior

As a user
I want every major page to follow consistent shell and heading patterns
So that the app feels coherent and I can orient myself immediately when moving between modules

Acceptance Criteria:
- [x] Each major route exposes a visible page title or equivalent top-level heading that matches the page purpose.
- [x] Top-level shell elements such as back links, topbars, section headers, and route labels follow the same structural pattern within each module family.
- [x] Fixed decorative or informational elements do not block clicks on primary navigation or admin controls.
- [x] Cross-page shell differences are intentional module-specific choices, not accidental one-off markup or CSS drift.
- [x] Browser QA can detect when a major route renders without its expected identifying heading or shell structure.

Notes: The hub footer overlap bug and the design-system semantic heading gap were corrected during the April 23 QA pass.
---
