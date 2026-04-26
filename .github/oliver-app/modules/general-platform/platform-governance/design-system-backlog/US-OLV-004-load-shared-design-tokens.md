---
ID: US-OLV-004
Title: Load shared design tokens
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Bootstrap static Next app and Accounts foundation

As a designer
I want the app to use centralized CSS tokens
So that module migrations stay visually consistent

Acceptance Criteria:
- [ ] tokens.css defines color, spacing, typography, radius, shadow, and z-index variables.
- [ ] globals.css imports the token and shared component styles.
- [ ] Module CSS references token variables instead of isolated hardcoded values.

Notes: Later milestones harden token enforcement with CI.
---
