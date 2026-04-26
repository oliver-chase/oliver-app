---
ID: US-CMP-ARCH-001
Title: Register campaigns module and route shell
Status: Not Started
Verified: false
Backdated: 2026-04-25
Ticket: CMP-ARCH-001
Epic: CMP-E0: Module Foundation and Access
---

As an authorized user
I want to open a campaign module from the hub so I can use campaign workflows inside Oliver App.
So campaign execution lives inside the existing application shell.

Acceptance Criteria:
- [ ] `campaigns` module appears in module registry with route `/campaigns`.
- [ ] Hub card visibility follows assigned permissions.
- [ ] Unauthorized users are redirected by `useModuleAccess` behavior.
- [ ] Module route uses shared shell classes and responsive sidebar/topbar behavior.
- [ ] Module route registers Oliver config and scoped conversation path.
