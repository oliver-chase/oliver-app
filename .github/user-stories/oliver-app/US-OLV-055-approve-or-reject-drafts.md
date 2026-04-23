---
ID: US-OLV-055
Title: Approve or reject drafts
Status: Broken
Verified: false
Backdated: 2026-04-22
Milestone: Chatbot, voice, and module flows

As a SDR operator
I want draft approvals and rejections to be actionable from the app
So that outreach can move forward without leaving the module

Acceptance Criteria:
- [ ] The SDR workflow exposes approval and rejection actions for pending drafts.
- [ ] Those actions call backend routes that exist in the current repository and complete successfully.

Notes: Rejection writes directly to Supabase, but approval depends on `/api/sdr-approve`, which is not present here.
---
