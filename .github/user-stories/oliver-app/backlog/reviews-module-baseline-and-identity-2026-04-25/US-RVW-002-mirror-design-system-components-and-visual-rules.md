---
ID: US-RVW-002
Title: Mirror Design System Components and Visual Rules
Status: Not Started
Verified: false
Backdated: 2026-04-25
---

As a design-system steward
I want the reviews module to mirror the shared design system and baseline visual rules
So every interaction feels consistent, intentional, and maintainable across projects

Acceptance Criteria:
- [ ] Reviews UI uses tokenized colors, spacing, typography, radius, and state styles; no raw visual values are introduced.
- [ ] Shared primitives are reused where applicable (`button`, `card`, `input`, `textarea`, `picker`, `badge`, `status states`), not reimplemented.
- [ ] Canonical spacing and margin scale is applied to all review sections and forms.
- [ ] Dropdown and picker interactions follow the existing custom picker contract; native visible `<select>` controls are not introduced.
- [ ] Error, warning, success, and disabled states match cross-module visual semantics.
- [ ] Focus-visible and keyboard navigation styles are present for all interactive controls.
- [ ] Any intentional visual divergence from the baseline is explicitly documented with rationale and follow-up plan.

