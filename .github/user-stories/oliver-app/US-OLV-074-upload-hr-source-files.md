---
ID: US-OLV-074
Title: Upload HR source files
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Introduce shared OliverDock and upload flows

As a HR operator
I want to upload resumes or receipts from HR workflows
So that source files can seed candidate or device records

Acceptance Criteria:
- [ ] HR Oliver commands can trigger the shared file picker.
- [ ] Upload guidance reflects the current HR context.
- [ ] Resume/device upload commands are available from HR command metadata.
- [ ] Parse failures remain in the dock without mutating HR data.

Notes: Receipt parsing is client-side; resume parsing behavior depends on configured flows.
---
