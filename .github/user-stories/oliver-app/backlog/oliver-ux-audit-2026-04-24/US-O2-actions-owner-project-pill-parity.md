---
ID: US-O2
Title: Actions Owner/Project Pills Match People Controls
Status: Partial
Verified: false
Backdated: 2026-04-24
---

As an account strategy user  
I want Owner and Project pills in Actions to behave like People controls  
So I get one predictable interaction pattern for assignment edits.

Current state:
- Actions Owner/Project cells use `EngPickerBtn` in [ActionsSection.tsx](/Users/oliver/projects/oliver-app/src/components/accounts/ActionsSection.tsx).
- People controls use picker/popover patterns in [PeopleSection.tsx](/Users/oliver/projects/oliver-app/src/components/accounts/PeopleSection.tsx).
- Overlay strategy differs (`EngPickerBtn` inline vs `Picker` portal-based popover).

Acceptance Criteria:
- [ ] Owner and Project pills share the same visual token treatment as People picker controls.
- [ ] Owner and Project dropdowns use the canonical overlay strategy (portal/fixed popover behavior).
- [ ] Keyboard navigation and focus behavior match People picker behavior.
- [ ] Smoke coverage validates placement and parity for Owner and Project dropdowns.
