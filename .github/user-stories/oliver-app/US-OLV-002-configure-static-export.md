---
ID: US-OLV-002
Title: Configure static export
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Next.js scaffold + static export + Supabase wiring

As a deployment owner
I want the app to build as a static export for Cloudflare Pages
So that staging and production can ship without a Node server

Acceptance Criteria:
- [ ] The Next.js config sets static export behavior.
- [ ] Build output is compatible with Cloudflare Pages routing conventions.

Notes: The current config sets `output: export` and `trailingSlash: true`; deployment was not exercised here.
---
