---
ID: US-OLV-034
Title: Parse local transcripts
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Chatbot, voice, and module flows

As a account operator
I want plain-text transcripts parsed locally when possible
So that simple uploads avoid unnecessary AI calls

Acceptance Criteria:
- [ ] Plain-text transcript uploads can be parsed client-side.
- [ ] The local parse result is shaped for later review and save flows.

Notes: The local parser is invoked from the accounts upload path; output quality was not validated against multiple transcript formats.
---
