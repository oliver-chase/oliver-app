---
ID: US-OLV-013
Title: Proxy app user CRUD
Status: Code Present
Verified: false
Backdated: 2026-04-22
Milestone: Operationalize design system, CI, and security

As a admin
I want app user reads and writes to go through a serverless API
So that the browser never receives the service role key

Acceptance Criteria:
- [ ] /api/users lists all app_users via service role headers.
- [ ] POST upserts a user by user_id or email.
- [ ] PATCH validates role and page_permissions before updating.
- [ ] Missing service role config returns a 503 response.

Notes: Direct client access is intentionally avoided in src/lib/users.ts.
---
