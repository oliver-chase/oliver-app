---
ID: SMK-CMP-007
Title: Restore Campaign Sidebar Design-System Parity
Status: Not Started
Verified: false
Backdated: 2026-04-26
---

As a campaigns module user
I want the campaigns sidebar and related shell elements to match the approved preset design-system components
So navigation looks correct, consistent, and trustworthy across modules

Source Signal:
- User-reported UI drift on 2026-04-26: campaigns sidebar appears incorrect and non-conformant with preset design-system styling/component mapping.

Scope Notes:
- Sidebar navigation layout, spacing, typography, token usage, active/hover/focus states, and icon/button treatments.
- Related shell fragments that visually diverged from preset design-system primitives.

Acceptance Criteria:
- [ ] Campaign sidebar structure uses approved design-system primitives/tokens instead of ad hoc styles.
- [ ] Sidebar visual behavior (default, hover, active, focus, disabled) matches current design-system contract.
- [ ] Desktop and mobile sidebar render consistently with module-level navigation expectations.
- [ ] Existing campaign smoke tests are updated only when contract intentionally changes; otherwise behavior remains test-compatible.
- [ ] Design QA evidence captured with before/after screenshots and mapped token/component references.

QA / Evidence:
- [ ] Attach screenshot artifacts for desktop and mobile sidebar states.
- [ ] Attach focused smoke/e2e command output covering campaign sidebar navigation.
- [ ] Document any intentional selector/copy contract changes and linked test updates.

