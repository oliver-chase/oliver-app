---
ID: US-O10
Title: Account Strategy Naming Source of Truth (Page Header, Not Topbar)
Status: Code Present
Verified: true
Backdated: 2026-04-24
---

As an account strategy user  
I want account naming edits to happen in the page header fields  
So topbar context stays stable and account naming is edited in one clear place.

Acceptance Criteria:
- [x] Topbar no longer presents selected account short name (e.g., NCL) as editable context.
- [x] Account short name in the page header is editable.
- [x] Account long/company name field remains editable.
- [x] Editing either field persists through existing account update handlers.
- [x] Topbar keeps section nav/export/sync affordances without account-name edit behavior.
