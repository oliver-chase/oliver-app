---
ID: US-CMP-BE-1805
Title: Calendar artifact builder (XLSX and JSON bundle)
Status: Not Started
Verified: false
Backdated: 2026-04-26
Ticket: CMP-BE-1805
Epic: CMP-E12: Social Calendar Intelligence Automation (No-API / No-Claude-Dependency)
---

As a campaign operations lead
I want standardized output artifacts for handoff and system reuse
So marketing, design, and automation jobs consume the same canonical calendar output

Acceptance Criteria:
- [ ] Calendar build produces both `.xlsx` and canonical `.json` artifacts for the same run id.
- [ ] JSON schema includes post-level ids, platform, format, copy fields, schedule window, pillar, compliance score, and evidence references.
- [ ] XLSX includes minimum sheets: overview, full calendar, per-platform tabs, and weekly breakdown.
- [ ] Artifact generation is deterministic from a pinned input snapshot and rule version set.
- [ ] Build includes integrity checks: row counts match between JSON and XLSX, required fields non-empty, and duplicate ids rejected.
- [ ] Artifact metadata records producer version, locale assumptions, timezone policy, and generation timestamp.
- [ ] Download endpoints enforce campaign permission and signed artifact ownership checks.
- [ ] Large calendars paginate/stream safely without memory spikes exceeding defined runtime limits.
- [ ] Artifact retention policy supports active window + archival window with recoverable references.
- [ ] Failed builds persist partial diagnostics and do not publish incomplete artifacts as successful outputs.

Executable Delivery Requirements:
- [ ] Add artifact manifest model (run id, artifact type, checksum, byte size, schema version, storage key).
- [ ] Add builder implementation in server-side pipeline with deterministic ordering and stable ids.
- [ ] Add integrity verifier step that runs before artifact status can transition to `completed`.
- [ ] Add download/list API contracts with permission checks consistent with existing campaign export endpoints.
- [ ] Add contract tests for schema conformance and row parity between JSON and XLSX.
