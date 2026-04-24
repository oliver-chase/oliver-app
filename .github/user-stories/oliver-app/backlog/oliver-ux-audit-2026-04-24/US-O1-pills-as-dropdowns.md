---
ID: US-O1
Title: Pills Are Dropdowns — Not Click-Through Selects
Status: Partial
Verified: false
Backdated: 2026-04-24
---

Current state:
- Accounts Actions status pills already open dropdowns via `Picker` in [ActionsSection.tsx](/Users/oliver/projects/oliver-app/src/components/accounts/ActionsSection.tsx).
- Owner/Project pills also open dropdowns via `EngPickerBtn` + `app-popover` in [ActionsSection.tsx](/Users/oliver/projects/oliver-app/src/components/accounts/ActionsSection.tsx).
- Badge/pill sizing is currently compact (`font-size-3xs`, small padding) in [components-base.css](/Users/oliver/projects/oliver-app/src/app/components-base.css).
- Some flows in HR still use native `<select>` controls (example in [device-flows.tsx](/Users/oliver/projects/oliver-app/src/components/hr/flows/device-flows.tsx)).

Gap:
- Behavior is not fully uniform across all pages/flows.
- Pill size requirement ("~10x current size") is not implemented.

Backlog acceptance:
- Replace remaining native `<select>` controls for pill-like status/category interactions with canonical custom dropdown behavior.
- Define one canonical pill token scale for tappable/readable status pills and apply consistently.
- Verify open/close behavior parity (open animation, click-away close, select-to-close).

