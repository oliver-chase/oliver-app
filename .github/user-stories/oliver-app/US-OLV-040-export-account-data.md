---
ID: US-OLV-040
Title: Export account data
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Port Accounts UX and complete module hub shell

As a account manager
I want to export account details into a printable report
So that I can share account status outside the app

Acceptance Criteria:
- [ ] ExportPanel opens from the selected account context.
- [ ] The export includes key account sections and selected notes.
- [ ] Escape closes the export panel.
- [ ] Generate creates printable HTML and invokes browser print/download behavior.

Notes: Uses browser APIs rather than a server-side PDF renderer.
---
