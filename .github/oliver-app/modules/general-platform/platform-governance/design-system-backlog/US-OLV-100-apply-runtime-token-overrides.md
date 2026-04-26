---
ID: US-OLV-100
Title: Apply runtime token overrides
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Operationalize design system, CI, and security

As a operator
I want saved token overrides applied on app load
So that admin design changes persist across page loads

Acceptance Criteria:
- [ ] RootLayout mounts TokenOverridesLoader.
- [ ] TokenOverridesLoader calls applyTokenOverrides in a client effect.
- [ ] applyTokenOverrides reads token overrides from Supabase.
- [ ] Each override is applied to document.documentElement style.

Notes: Requires Supabase design_tokens data.
---
