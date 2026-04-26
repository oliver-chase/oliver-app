---
ID: US-OLV-003
Title: Wire Supabase browser client
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Bootstrap static Next app and Accounts foundation

As a operator
I want the browser app to read and write Supabase data
So that module screens can load shared operations records

Acceptance Criteria:
- [ ] The Supabase client reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
- [ ] Accounts data loaders fetch all required account tables.
- [ ] Failed Supabase reads surface an error state rather than silently rendering stale data.

Notes: Client-side Supabase access is intentional for most module data.
---
