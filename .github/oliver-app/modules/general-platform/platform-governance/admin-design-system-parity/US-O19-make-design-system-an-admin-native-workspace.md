---
ID: US-O19
Title: Make Design System an Admin-Native Workspace
Status: Not Started
Verified: false
Backdated: 2026-04-25
---

As an admin user  
I want Design System access to live within Admin navigation  
So privileged design tooling is entered through one coherent admin workspace instead of scattered shortcuts.

Current state:
- Hub exposes `Design System` directly in [src/app/page.tsx](/Users/oliver/projects/oliver-app/src/app/page.tsx:53).
- Admin currently exposes `Users`, `Design Tokens`, and `Components`, plus a separate `Open Design System` link in [src/app/admin/page.tsx](/Users/oliver/projects/oliver-app/src/app/admin/page.tsx:98).
- Admin nav metadata already groups `Admin Dashboard` and `Design System` together in [src/modules/admin-nav.ts](/Users/oliver/projects/oliver-app/src/modules/admin-nav.ts:8), but the experience is not yet one integrated IA.

Acceptance Criteria:
- [ ] The hub no longer exposes a direct `Design System` button.
- [ ] Design System is reachable through Admin-only navigation and not as a separate privileged shortcut on the hub.
- [ ] Admin information architecture presents Users, Design System, Components, and related subsections as one coherent admin navigation model.
- [ ] Design-system-specific controls are not mixed into unrelated admin surfaces unless their grouping is explicit and intentional.
- [ ] The user can move between Admin subsections without losing the primary admin navigation/filter bar.
- [ ] Chatbot/admin commands can navigate to the Design System subsection without dead-end prompts or ambiguous route changes.

Notes:
- Route implementation is flexible. The requirement is user-facing integration into Admin IA, whether that remains a dedicated route or becomes a nested admin subsection.
