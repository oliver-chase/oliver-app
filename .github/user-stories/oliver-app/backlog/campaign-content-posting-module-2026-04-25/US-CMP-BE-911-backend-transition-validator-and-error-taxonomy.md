---
ID: US-CMP-BE-911
Title: Backend transition validator and error taxonomy
Status: Done
Verified: false
Backdated: 2026-04-25
Ticket: CMP-BE-911
Epic: CMP-E9: Auditability, Validation, and Error Recovery
---

As a frontend developer
I want stable error codes for invalid transitions so UI can show actionable feedback.
So retries and refresh behavior are reliable.

Acceptance Criteria:
- [ ] Invalid transitions return deterministic machine-readable code.
- [ ] Permission failures return forbidden code.
- [ ] Concurrency conflicts return conflict code.
- [ ] Not-found and already-processed states are differentiated.
- [ ] Tests cover valid/invalid transition matrices.
