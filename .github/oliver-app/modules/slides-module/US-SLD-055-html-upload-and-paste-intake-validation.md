---
ID: US-SLD-055
Title: Validate HTML Upload and Paste Intake With Shared Parser Path
Status: Backlog
Verified: false
Backdated: 2026-04-25
---

As a slide editor user
I want reliable upload and paste intake validation before parsing
So invalid inputs fail fast with clear actionable errors

Acceptance Criteria:
- [ ] Upload control accepts `.html` and `.htm` files.
- [ ] Empty files are rejected with explicit validation messaging.
- [ ] Files above configured size limit are rejected with explicit validation messaging.
- [ ] Non-HTML markup payloads are rejected with explicit validation messaging.
- [ ] Paste input accepts full HTML documents and partial HTML fragments.
- [ ] Empty pasted input is rejected.
- [ ] Plain text without markup is rejected.
- [ ] Upload and paste both converge to the same parser pipeline after validation.
