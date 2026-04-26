---
ID: US-OLV-051
Title: Parse org chart images
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Port Accounts UX and complete module hub shell

As a account manager
I want uploaded org chart images parsed into people records
So that stakeholder maps can be seeded from screenshots

Acceptance Criteria:
- [ ] Image uploads are read as base64.
- [ ] The client posts imageBase64 and mediaType to /api/parse-image.
- [ ] The summary lists extracted people, titles, departments, and reporting lines.
- [ ] API errors are surfaced in the chat panel.

Notes: Vision extraction requires configured AI provider keys.
---
