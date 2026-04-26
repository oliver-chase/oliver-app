---
ID: US-OLV-109
Title: Persist chat history schema
Status: Code Present
Verified: false
Backdated: 2026-04-22
Milestone: Add module chat flows and story backfill docs

As a operator
I want chat messages stored for OliverDock sessions
So that conversations can persist beyond one panel session

Acceptance Criteria:
- [ ] supabase/chat_messages.sql defines a chat_messages schema.
- [ ] Rows can represent module/page conversation messages.
- [ ] The schema can associate messages with app-level user context and page/module context.
- [ ] OliverDock reads, rewrites, and clears chat history through implemented code.

Notes: Persistence now goes through `/api/chat-messages` plus local fallback; live validation still depends on the updated `chat_messages` schema being applied in Supabase.
---
