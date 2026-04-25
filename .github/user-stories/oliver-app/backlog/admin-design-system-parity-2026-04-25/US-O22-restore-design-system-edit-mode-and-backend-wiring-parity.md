---
ID: US-O22
Title: Restore Design System Edit Mode and Backend Wiring Parity
Status: Not Started
Verified: false
Backdated: 2026-04-25
---

As a design admin  
I want Oliver's Design System to support Tesknota-style editing and persistence  
So token and component reference work is not read-only or split across disconnected tools.

Current state:
- Oliver has token editing in Admin via [TokenEditor](/Users/oliver/projects/oliver-app/src/components/admin/TokenEditor.tsx), but the Design System page is primarily a reference surface in [src/app/design-system/page.tsx](/Users/oliver/projects/oliver-app/src/app/design-system/page.tsx:558).
- Tesknota's admin design page supports reference/edit behavior and runtime patch wiring through its edit panel and `/patch-token` flow in [tesknota admin design page](</Users/oliver/projects/tesknota/app/(app)/admin/design/page.tsx>).
- Oliver runtime token loading already exists in [src/components/shared/TokenOverridesLoader.tsx](/Users/oliver/projects/oliver-app/src/components/shared/TokenOverridesLoader.tsx), but the privileged editing experience is fragmented.

Acceptance Criteria:
- [ ] Oliver Design System supports an edit mode or equivalent privileged editing affordance for mutable design tokens and related configuration.
- [ ] Edit actions are wired to a secure backend persistence contract instead of remaining local-only or manually copied.
- [ ] Draft, success, and failure states are visible and recoverable in the UI.
- [ ] Runtime previews reflect the edited value accurately without requiring a full reload where avoidable.
- [ ] Admin token editing and Design System editing are reconciled so they do not expose conflicting or duplicate mutation paths.
- [ ] Backend mutation paths are authenticated, authorized, and testable.
