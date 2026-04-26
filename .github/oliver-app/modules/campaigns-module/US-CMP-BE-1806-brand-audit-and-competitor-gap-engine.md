---
ID: US-CMP-BE-1806
Title: Brand audit and competitor gap engine
Status: Not Started
Verified: false
Backdated: 2026-04-26
Ticket: CMP-BE-1806
Epic: CMP-E12: Social Calendar Intelligence Automation (No-API / No-Claude-Dependency)
---

As a strategy owner
I want brand audit and competitor gap outputs generated from public signals
So calendar recommendations are informed by measurable context and whitespace analysis

Acceptance Criteria:
- [ ] Brand audit output includes profile completeness, publishing cadence estimate, content-mix estimate, and consistency checks per channel.
- [ ] Audit scoring rubric is explicit, weighted, versioned, and included with each report artifact.
- [ ] Competitor engine supports provided competitor list and discovery mode with reviewer confirmation step.
- [ ] Competitor matrix includes comparable dimensions (format mix, posting frequency proxy, messaging themes, engagement proxy signals).
- [ ] Gap analyzer outputs ranked whitespace opportunities with evidence references and confidence scores.
- [ ] Full-suite mode composes outputs in fixed order: audit -> competitor -> calendar, with provenance links between phases.
- [ ] Reports are emitted as markdown + JSON with stable section ids for downstream rendering.
- [ ] Engine marks unavailable metrics as `not_observable_publicly` instead of fabricating numbers.
- [ ] Re-run supports `diff against previous run` to show strategy shifts over time.
- [ ] Reviewers can accept/reject opportunities, and accepted opportunities flow into calendar pillar planning inputs.

Executable Delivery Requirements:
- [ ] Add scoring config model with versioned rubric and weighted dimensions.
- [ ] Add competitor matrix persistence model with confidence metadata per metric.
- [ ] Add recommendation decision model (`accepted`, `rejected`, `deferred`) linked to reviewer identity and rationale.
- [ ] Add full-suite orchestrator contract that threads outputs across phases with provenance links.
- [ ] Add seeded tests proving unavailable metrics are tagged `not_observable_publicly` and never fabricated.
