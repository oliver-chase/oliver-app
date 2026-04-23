---
ID: US-OLV-011
Title: Enforce app users RLS
Status: Code Present
Verified: false
Backdated: 2026-04-22
Milestone: Security and deployment hardening

As a security owner
I want client access to `app_users` denied by policy
So that browser credentials cannot read or mutate the access-control table

Acceptance Criteria:
- [ ] The migration enables an explicit deny policy for anon and authenticated client roles.
- [ ] The intended server-side bypass path is documented alongside the policy.

Notes: The SQL policy exists; I did not verify it against a live Supabase project.
---
