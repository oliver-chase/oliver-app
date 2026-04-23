---
ID: US-OLV-099
Title: Edit design token overrides
Status: Code Present
Verified: false
Backdated: 2026-04-17
Milestone: Add auth, permissions, admin, and HR migration

As a admin
I want to edit design tokens from the admin UI
So that visual tweaks can be managed without code changes

Acceptance Criteria:
- [ ] TokenEditor lists editable token values.
- [ ] Starting edit captures the current computed value.
- [ ] Saving calls upsertToken with token name, value, and category.
- [ ] Errors are shown in the token editor.

Notes: Access to Admin depends on current auth/admin wiring.
---
