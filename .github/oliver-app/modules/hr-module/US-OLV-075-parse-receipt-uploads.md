---
ID: US-OLV-075
Title: Parse receipt uploads
Status: Code Present
Verified: false
Backdated: 2026-04-20
Milestone: Introduce shared OliverDock and upload flows

As a HR operator
I want device receipt text parsed into structured fields
So that inventory records can be created from purchase receipts

Acceptance Criteria:
- [ ] parseReceipt extracts purchase date, serial, IMEI, device type/name, customer, price, and order id when present.
- [ ] receiptToSummary returns a readable summary.
- [ ] Missing fields do not throw parser errors.
- [ ] Parsed fields can be reviewed before being used in HR workflows.

Notes: Parser is heuristic and should be tested with real receipts.
---
