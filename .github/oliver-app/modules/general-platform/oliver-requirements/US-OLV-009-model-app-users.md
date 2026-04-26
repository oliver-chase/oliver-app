---
ID: US-OLV-009
Title: Model app users
Status: Code Present
Verified: false
Backdated: 2026-04-17
Milestone: Add auth, permissions, admin, and HR migration

As a admin
I want an app_users table with role and page permissions
So that access can be managed separately from source data tables

Acceptance Criteria:
- [ ] A Supabase migration creates app_users with user_id, email, name, role, and page permissions.
- [ ] User types represent admin/user roles and module permissions.
- [ ] User lookup APIs can fetch by user_id or email.

Notes: Schema, users API, and mounted UserProvider exist; live validation still depends on Azure identity claims and the users API path.
---
