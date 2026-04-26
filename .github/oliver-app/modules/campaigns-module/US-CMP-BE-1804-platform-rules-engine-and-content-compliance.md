---
ID: US-CMP-BE-1804
Title: Platform rules engine and content compliance
Status: Not Started
Verified: false
Backdated: 2026-04-26
Ticket: CMP-BE-1804
Epic: CMP-E12: Social Calendar Intelligence Automation (No-API / No-Claude-Dependency)
---

As a content lead
I want generated post drafts validated by platform-native rules
So output quality is enforceable and auditable per channel

Acceptance Criteria:
- [ ] A versioned rules registry exists per platform and content format (for example, LinkedIn text, LinkedIn carousel, TikTok short script).
- [ ] Rules include hard constraints (length limits, required sections, forbidden patterns) and soft quality heuristics.
- [ ] Validation returns machine-readable violations with rule id, severity, failing span, and remediation suggestion.
- [ ] Generation pipeline fails hard on unresolved critical violations and never auto-publishes non-compliant drafts.
- [ ] Rule evaluation stores compliance score and full violation report on each generated item.
- [ ] Rule overrides require explicit reviewer approval with reason and override metadata persisted.
- [ ] Hashtag, CTA, and hook checks are channel-specific and not shared as generic cross-platform defaults.
- [ ] Regression suite includes rule fixtures per platform to prevent accidental drift when rules are edited.
- [ ] Rules can be rolled back by version id, and prior generated runs remain linked to the rule version they used.
- [ ] Compliance summaries are queryable by month, platform, and rule id for operational reporting.

Executable Delivery Requirements:
- [ ] Add rules registry schema + migration with versioning and activation window fields.
- [ ] Implement rule evaluator service callable from generation pipeline and review surfaces.
- [ ] Persist violation payloads per generated post with normalized `rule_id` and `severity`.
- [ ] Add CI fixtures per platform/format validating pass/fail and rollback behavior by ruleset version.
- [ ] Add query endpoint for compliance rollups consumed by campaign reporting section.
