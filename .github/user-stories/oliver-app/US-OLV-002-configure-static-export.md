---
ID: US-OLV-002
Title: Configure static export
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Bootstrap static Next app and Accounts foundation

As a release operator
I want the app configured for static export
So that Cloudflare Pages can deploy the generated out/ directory

Acceptance Criteria:
- [ ] next.config.ts sets output to export.
- [ ] The build produces static assets without requiring a Next.js runtime server.
- [ ] Route paths work with trailing slash behavior on Cloudflare Pages.

Notes: Cloudflare Pages Functions still provide API endpoints separately from the static app.
---
