---
ID: US-OLV-058
Title: Open OliverDock
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Introduce shared OliverDock and upload flows

As a operator
I want a shared floating Oliver assistant in modules
So that I can access commands and chat from any wired workspace

Acceptance Criteria:
- [ ] RootLayout mounts a single OliverDock inside OliverProvider.
- [ ] Modules register their OliverConfig through useRegisterOliver.
- [ ] The dock trigger opens and closes the panel.
- [ ] Cmd/Ctrl+K toggles the dock when a config is registered.

Notes: Locked invariant says not to mount extra chatbot components.
---
