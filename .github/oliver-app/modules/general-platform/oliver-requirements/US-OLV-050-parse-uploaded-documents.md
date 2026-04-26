---
ID: US-OLV-050
Title: Parse uploaded documents
Status: Code Present
Verified: false
Backdated: 2026-04-16
Milestone: Port Accounts UX and complete module hub shell

As a account manager
I want doc/pdf meeting material parsed through an API
So that structured notes and actions can be imported from source files

Acceptance Criteria:
- [ ] Non-image non-plain-text uploads call /api/parse-document.
- [ ] The API rejects invalid JSON and missing text.
- [ ] Successful responses return a result and model.
- [ ] Parse errors are shown inside OliverDock.

Notes: Actual docx/pdf text extraction quality depends on browser readAsText and API behavior.
---
