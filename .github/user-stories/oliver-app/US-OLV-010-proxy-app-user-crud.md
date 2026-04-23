---
ID: US-OLV-010
Title: Proxy app user CRUD
Status: Code Present
Verified: false
Backdated: 2026-04-22
Milestone: Security and deployment hardening

As a admin tooling
I want all `app_users` reads and writes to go through a serverless API
So that the browser never talks directly to the protected table

Acceptance Criteria:
- [ ] A function route exposes list, fetch, upsert, and patch behavior for app users.
- [ ] Frontend user-management code calls the function route rather than direct Supabase table access.

Notes: Implemented via `/api/users`; request authorization assumptions were not audited beyond the code path.
---
