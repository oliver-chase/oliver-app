---
ID: US-OLV-014
Title: Enforce app users RLS
Status: Code Present
Verified: false
Backdated: 2026-04-22
Milestone: Operationalize design system, CI, and security

As a security owner
I want app_users locked down with RLS
So that client-side anon access cannot mutate permission records

Acceptance Criteria:
- [ ] A migration enables RLS for app_users.
- [ ] Client anon/authenticated roles are denied direct access.
- [ ] Server-side proxy operations continue through SUPABASE_SERVICE_ROLE_KEY.

Notes: Implementation exists in migration/API; database application was not verified here.
---
