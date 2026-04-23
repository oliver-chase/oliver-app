---
ID: US-OLV-014
Title: Expose admin shortcuts
Status: Broken
Verified: false
Backdated: 2026-04-22
Milestone: Hub and module architecture

As a admin
I want quick links from the hub to admin and design-system surfaces
So that I can reach governance tools without hunting through routes

Acceptance Criteria:
- [ ] The hub shows admin-only links when the user is an admin.
- [ ] Those links navigate to the admin and design-system routes.

Notes: Broken in practice: the hub checks `isAdmin`, but `UserContext` currently always returns false because the provider is not mounted.
---
