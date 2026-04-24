---
ID: US-O1
Title: Pills Are Dropdowns - Not Click-Through Selects
Status: Partial
Verified: false
Backdated: 2026-04-24
---

As an operations user  
I want all interactive pill controls to open canonical dropdown pickers  
So that status/category edits behave consistently across modules.

Current state:
- Accounts Actions status pills already open dropdowns via `Picker` in [ActionsSection.tsx](/Users/oliver/projects/oliver-app/src/components/accounts/ActionsSection.tsx).
- Owner/Project pills also open dropdowns via `EngPickerBtn` + `.app-popover` in [ActionsSection.tsx](/Users/oliver/projects/oliver-app/src/components/accounts/ActionsSection.tsx).
- Some HR step-flow controls still use native `<select>` controls in [device-flows.tsx](/Users/oliver/projects/oliver-app/src/components/hr/flows/device-flows.tsx).

Acceptance Criteria:
- [ ] Pill-like editable controls do not use native `<select>` in visible UI paths.
- [ ] Pill controls use the same open/close interaction model (click to open, click-away to close, select-to-close).
- [ ] Pill controls use one canonical typography/spacing token set across modules.
- [ ] Regression smoke coverage verifies at least one pill control in Accounts and one in HR.
