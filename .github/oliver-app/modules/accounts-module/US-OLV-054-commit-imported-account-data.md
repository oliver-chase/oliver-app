---
ID: US-OLV-054
Title: Commit imported account data
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Port Accounts UX and complete module hub shell

As a account manager
I want reviewed import payloads written to Supabase
So that meeting notes, actions, and people records become part of the account

Acceptance Criteria:
- [ ] Confirm & Write calls /api/confirm-write with dryRun:false.
- [ ] The API writes notes when metadata plus notes or decisions exist.
- [ ] The API writes actions with Open status.
- [ ] The API writes people from updates.people or people arrays.
- [ ] The app refreshes chat/page data after successful write.

Notes: Uses anon key in confirm-write per current function implementation.
---
