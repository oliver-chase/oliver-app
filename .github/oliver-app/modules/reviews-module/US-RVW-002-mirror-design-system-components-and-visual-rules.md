---
ID: US-RVW-002
Title: Mirror Design System Components and Visual Rules
Status: In Progress
Verified: false
Backdated: 2026-04-25
---

As a design-system steward
I want the reviews module to mirror the shared design system and baseline visual rules
So every interaction feels consistent, intentional, and maintainable across projects

Acceptance Criteria:
- [x] Reviews UI uses tokenized colors, spacing, typography, radius, and state styles; no raw visual values are introduced.
- [ ] Shared primitives are reused where applicable (`button`, `card`, `input`, `textarea`, `picker`, `badge`, `status states`), not reimplemented.
- [ ] Canonical spacing and margin scale is applied to all review sections and forms.
- [ ] Dropdown and picker interactions follow the existing custom picker contract; native visible `<select>` controls are not introduced.
- [ ] Error, warning, success, and disabled states match cross-module visual semantics.
- [ ] Focus-visible and keyboard navigation styles are present for all interactive controls.
- [ ] Any intentional visual divergence from the baseline is explicitly documented with rationale and follow-up plan.

QA / Evidence:
- [ ] Manual visual parity check for desktop reviews shell + forms against design-system token usage in a running browser session (screenshot/notes to be added).
- [ ] Manual interaction pass for focus-visible and keyboard navigation states on all interactive controls in `/reviews`.
- [ ] Confirm no native `<select>` controls are rendered for picker interactions.
- [ ] Confirm shared primitives (`button`, `card`, `input`, `textarea`) are consistently used in current markup.
- [x] Token guardrails pass via shared token/lint checks: `npm run lint` (`/tmp/reviews-lint-2026-04-26.log`, exit_code=0).

Outstanding Gate Notes:
- [ ] No acceptance-attested evidence is attached yet; this story remains `In Progress` until visual parity, interaction pass, and primitive coverage evidence are recorded.
- Gate remains blocked for this story until explicit design-visual and interaction checks are executed and documented.
