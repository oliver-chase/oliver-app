---
ID: US-CMP-QA-1812
Title: Source traceability, governance, and evidence gates
Status: Not Started
Verified: false
Backdated: 2026-04-26
Ticket: CMP-QA-1812
Epic: CMP-E13: Social Automation Orchestration and Governance
---

As a release approver
I want strict evidence and governance gates for automated social outputs
So published plans are explainable, reviewable, and compliant with internal standards

Acceptance Criteria:
- [ ] Every generated recommendation references one or more stored evidence records with URL, timestamp, and extractor metadata.
- [ ] Governance checks enforce prohibited-content filters before artifacts can be approved.
- [ ] QA gate blocks release if evidence coverage drops below configured threshold per pillar/platform.
- [ ] QA report includes hallucination-risk flags for unsupported claims and unsupported competitor assertions.
- [ ] Human approval workflow records approver identity, decision, decision rationale, and artifact version hash.
- [ ] Evidence pack export bundles narrative brief, audit, competitor matrix, calendar outputs, compliance reports, and run logs.
- [ ] Gate outcomes are reproducible in CI for regression checks against fixture inputs.
- [ ] Security review confirms no private API keys or restricted platform API calls are required for passing baseline flow.
- [ ] Incident process defines rollback path to previous approved artifact set with one action.
- [ ] Release checklist requires successful completion of governance gate suite before production signoff.

Executable Delivery Requirements:
- [ ] Add evidence-pack schema and exporter with stable section ids and artifact checksums.
- [ ] Add CI gate suite for evidence coverage thresholds, unsupported-claim detection, and policy violations.
- [ ] Add release checklist template and machine-readable gate report artifact for signoff.
- [ ] Add rollback command and test proving previous approved artifact set can be restored atomically.
- [ ] Add security test confirming baseline flow runs without private social API secrets present.
