---
ID: US-OLV-104
Title: Store AI provider keys
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Port Accounts UX and complete module hub shell

As a admin
I want to manage AI provider keys through an API
So that chat and parsing can be configured without redeploying

Acceptance Criteria:
- [ ] /api/admin/keys GET returns masked key config.
- [ ] POST validates required provider/model/key fields before insert.
- [ ] PATCH updates an existing ai_config row.
- [ ] DELETE removes a selected ai_config row.
- [ ] Missing Supabase config returns 503.

Notes: Function uses Supabase anon key per current implementation; admin gating should be verified.
---
