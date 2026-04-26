---
ID: US-CMP-ARCH-1810
Title: Social automation governance epic charter
Status: Not Started
Verified: false
Backdated: 2026-04-26
Ticket: CMP-ARCH-1810
Epic: CMP-E13: Social Automation Orchestration and Governance
---

As a release authority
I want a governance-focused epic charter for automation operations
So recurring social automation can run safely with auditability and compliance evidence

Acceptance Criteria:
- [ ] Epic defines story sequence and dependency order: `1811 -> 1812`.
- [ ] Epic defines required operational controls: idempotency keys, retries, dead-letter handling, replay policy, and cancellation semantics.
- [ ] Epic defines governance controls: source traceability, evidence coverage thresholds, approval records, and release gates.
- [ ] Epic defines required observability outputs: run dashboard counters, failure-class metrics, and exportable audit logs.
- [ ] Epic defines security boundaries: permission checks, no private social API secrets in baseline path, and explicit credential scanning gate.
- [ ] Epic defines CI gates: contract tests, fixture-based reproducibility tests, policy checks, and seeded e2e execution evidence.
- [ ] Epic defines incident handling requirements: rollback to prior artifact set and post-incident evidence pack generation.
- [ ] Epic defines data retention and archival policy for run logs, artifacts, and source evidence references.
- [ ] Epic defines production rollout phases and controls (internal-only, pilot brands, broad rollout).
- [ ] Epic defines measurable success criteria (run success rate, false-positive governance flags, and manual override rates).

Execution Notes (Accuracy / Executable Scope):
- Build on existing campaign jobs conventions and permission boundaries already present in `/api/campaigns` and `/api/campaign-jobs` patterns.
- Treat governance artifacts as first-class outputs that must be storable and downloadable through existing module auth patterns.
