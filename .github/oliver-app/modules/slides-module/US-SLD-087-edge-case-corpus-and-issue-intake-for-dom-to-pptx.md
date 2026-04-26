---
ID: US-SLD-087
Title: Edge-Case Corpus and Issue Intake for DOM→PPTX
Status: Backlog
Verified: false
Backdated: 2026-04-26
---

As a platform maintainer
I want reproducible HTML/CSS edge-case intake tied to regression fixtures
So real-world export failures become trackable, testable, and non-regressing fixes

Acceptance Criteria:
- [ ] Issue intake template requires minimal repro HTML/CSS snippet and expected vs actual PPTX behavior.
- [ ] Submitted edge cases can be converted into fixture assets used by contract/e2e export tests.
- [ ] Corpus tags include at minimum: deep flex, unusual gradients, nested transforms, font embedding, and dashboard canvas.
- [ ] New edge-case fixture failures block release until mapped stories are resolved or explicitly waived.
- [ ] Module docs include triage guidance for fidelity mismatch reporting.
