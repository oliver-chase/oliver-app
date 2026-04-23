---
ID: US-OLV-049
Title: Parse local transcripts
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Introduce shared OliverDock and upload flows

As a account manager
I want plain text transcript uploads parsed in the browser
So that meeting notes can be imported without an AI call

Acceptance Criteria:
- [ ] .txt uploads read with FileReader.readAsText.
- [ ] parseTranscript extracts metadata, notes, decisions, actions, and gaps.
- [ ] The parse result summary states it was parsed client-side.
- [ ] Unsupported or oversized files are rejected before parsing.

Notes: Parser output is designed to match /api/parse-document schema.
---
