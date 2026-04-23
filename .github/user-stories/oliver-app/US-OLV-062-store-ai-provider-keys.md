---
ID: US-OLV-062
Title: Store AI provider keys
Status: Code Present
Verified: false
Backdated: 2026-04-17
Milestone: Security and deployment hardening

As a admin integration owner
I want a serverless API for AI provider key records
So that chat and parsing services can be configured without hardcoding secrets in the client

Acceptance Criteria:
- [ ] A function route exposes masked reads and write operations for AI config records.
- [ ] The key-management route never returns full stored API keys on reads.

Notes: The API exists in `functions/api/admin/keys.js`; I did not verify whether a full UI currently consumes it.
---
