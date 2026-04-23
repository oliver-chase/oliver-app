---
ID: US-OLV-011
Title: Expose admin shortcuts
Status: Broken
Verified: false
Backdated: 2026-04-17
Milestone: Add auth, permissions, admin, and HR migration

As a admin
I want admin links to user management and design system tools
So that I can quickly reach governance surfaces from the hub

Acceptance Criteria:
- [ ] Hub renders Admin and Design System links only for admin users.
- [ ] Admin links do not render for non-admin users.
- [ ] Admin link styling matches the hub action buttons.

Notes: isAdmin comes from an unmounted/default UserContext, so these links are not expected to appear in normal current state.
---
