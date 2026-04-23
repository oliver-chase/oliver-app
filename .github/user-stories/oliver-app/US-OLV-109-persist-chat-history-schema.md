---
ID: US-OLV-109
Title: Persist chat history schema
Status: In Progress
Verified: false
Backdated: 2026-04-22
Milestone: Add module chat flows and story backfill docs

As a operator
I want chat messages stored for OliverDock sessions
So that conversations can persist beyond one panel session

Acceptance Criteria:
- [ ] supabase/chat_messages.sql defines a chat_messages schema.
- [ ] Rows can represent module/page conversation messages.
- [ ] The schema can associate messages with user/session context.
- [ ] OliverDock reads/writes chat history through implemented code.

Notes: Schema file exists, but current OliverDock stores conversation in local component state only.
---
