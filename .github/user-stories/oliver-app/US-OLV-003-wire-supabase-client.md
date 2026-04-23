---
ID: US-OLV-003
Title: Wire Supabase client
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Next.js scaffold + static export + Supabase wiring

As a frontend module
I want a shared Supabase client built from public env vars
So that all data surfaces can read and write against the existing backend

Acceptance Criteria:
- [ ] A shared browser Supabase client is exported from the app library.
- [ ] Modules can import the same client instead of creating their own instances.

Notes: Env presence and live connectivity were not verified in this pass.
---
