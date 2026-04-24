---
ID: US-OLV-119
Title: Import HR candidate lists with AI intake
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Introduce shared OliverDock and upload flows

As a HR operator
I want to upload CSV, Excel, or image candidate lists into the HR pipeline
So that bulk candidate intake can start from recruiter source files

Acceptance Criteria:
- [ ] Candidate Intake accepts .csv, .xlsx, .xls, jpeg, png, gif, and webp files through the hidden file input.
- [ ] CSV, plain text, and Excel uploads are parsed into candidate rows without mutating HR data before confirmation.
- [ ] Excel uploads are converted to CSV before parsing and reject workbooks with no sheets.
- [ ] Image uploads are sent to the image parse API using the JSON imageBase64 and mediaType contract expected by that endpoint.
- [ ] Parsed candidates are shown for review before the user confirms insertion into Supabase.
- [ ] Parse errors move the modal to the error phase and the Try Again button returns to the file-pick phase.

Notes: Tabular candidate files are parsed client-side; image candidate lists still rely on the image parse API and configured AI provider access.
---
