---
ID: US-OLV-121
Title: Handle token override load failures
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Operationalize design system, CI, and security

As a operator
I want the app to keep rendering if runtime token overrides fail to load
So that a design-token backend issue does not block the whole app

Acceptance Criteria:
- [ ] RootLayout mounts TokenOverridesLoader before application content.
- [ ] TokenOverridesLoader calls applyTokenOverrides exactly from a client effect after mount.
- [ ] If listTokenOverrides throws, TokenOverridesLoader catches the error and logs a message prefixed with [TokenOverridesLoader].
- [ ] A token override load failure does not set React state, redirect, or prevent child routes from rendering.
- [ ] Successful overrides write token_name and token_value pairs to document.documentElement.style.

Notes: Failure path is console-only; there is no in-app alert for token override load failures.
---
