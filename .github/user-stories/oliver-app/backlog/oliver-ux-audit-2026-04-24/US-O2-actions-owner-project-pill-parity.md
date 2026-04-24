---
ID: US-O2
Title: Actions Page — Owner & Project Pills Must Match People Pills
Status: Partial
Verified: false
Backdated: 2026-04-24
---

Current state:
- Actions Owner/Project cells use `EngPickerBtn` in [ActionsSection.tsx](/Users/oliver/projects/oliver-app/src/components/accounts/ActionsSection.tsx).
- People section uses different control patterns (`Picker`, `Popover`, filter controls) in [PeopleSection.tsx](/Users/oliver/projects/oliver-app/src/components/accounts/PeopleSection.tsx).
- Dropdown overlay implementation differs:
  - `Picker` uses portal-based fixed overlay via [Popover.tsx](/Users/oliver/projects/oliver-app/src/components/accounts/Popover.tsx).
  - `EngPickerBtn` renders inline absolute `.app-popover` in-row.

Gap:
- Owner/Project pill visual and behavior are not guaranteed identical to People controls.
- Owner/Project dropdowns are not using the same overlay/portal strategy as canonical picker popovers.

Backlog acceptance:
- Unify Owner/Project pills to the same component and token treatment used by People.
- Move Owner/Project dropdown rendering to canonical portal overlay behavior.
- Add smoke assertions for overlay positioning and parity.

