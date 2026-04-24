---
ID: US-OLV-124
Title: Preserve primary navigation and action targets
Status: Code Present
Verified: true
Backdated: 2026-04-23
Milestone: Build HR workflows and harden QA

As a user
I want primary buttons, links, and tabs to lead to the right place
So that I can trust the application’s navigation and action surfaces

Acceptance Criteria:
- [x] Hub module cards route to their intended module pages.
- [x] Admin shortcut links route to the Admin and Design System pages without being blocked by layout overlap or pointer interception.
- [x] Module-local navigation controls such as sidebars, tabs, and back links change the visible page state or route as labeled.
- [x] Protected routes do not redirect away incorrectly once valid user state has loaded.
- [x] Browser QA can detect when a labeled primary control is present but does not navigate, redirects incorrectly, or is obscured by another element.

Notes: This story captures navigation-integrity checks added during the April 23 end-to-end QA pass; deeper workflow buttons still need broader coverage.
---
