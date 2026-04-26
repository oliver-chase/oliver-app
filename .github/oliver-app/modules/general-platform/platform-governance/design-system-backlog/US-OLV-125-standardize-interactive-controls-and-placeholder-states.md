---
ID: US-OLV-125
Title: Standardize interactive controls and placeholder states
Status: Code Present
Verified: true
Backdated: 2026-04-23
Milestone: Normalize design tokens and responsive behavior

As a user
I want dropdowns, modals, pills, placeholders, inline edit fields, and copy controls to behave consistently
So that similar controls feel predictable across modules and states

Acceptance Criteria:
- [x] Shared control patterns such as pickers, modal actions, copy buttons, inline edit fields, and status pills behave consistently across modules that reuse them.
- [x] Placeholder text is present where empty entry is expected and does not appear in places where a committed value should display instead.
- [x] Copy controls fail gracefully without uncaught runtime errors when clipboard APIs are unavailable.
- [x] Popup and popover controls open, focus, and close in a consistent way across pages that use the shared components.
- [x] Browser QA can validate representative control behavior for at least one picker, one modal, one copy action, and one tab or chip surface.

Notes: Shared clipboard fallback was added during the April 23 QA pass, but user-visible failure feedback is still limited in some flows.
---
