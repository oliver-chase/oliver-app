---
ID: US-SLD-030
Title: Slide and Template Data Model With RLS
Status: Code Present
Verified: false
Backdated: 2026-04-24
---

As a backend engineer
I want canonical slide/template schemas with ownership and access policy
So the editor has durable storage with correct tenancy boundaries

Acceptance Criteria:
- [x] Supabase migrations add slide and template tables with explicit ownership metadata.
- [x] RLS policies enforce user/team visibility and write permissions for slides/templates.
- [x] Required indexes support common list/filter/sort access patterns used by library screens.
- [x] Type definitions are added for new entities and consumed in frontend data contracts.

