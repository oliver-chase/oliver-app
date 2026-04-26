---
ID: US-CMP-BE-1802
Title: Public web research pipeline without platform APIs
Status: Not Started
Verified: false
Backdated: 2026-04-26
Ticket: CMP-BE-1802
Epic: CMP-E12: Social Calendar Intelligence Automation (No-API / No-Claude-Dependency)
---

As a strategist
I want social research based on publicly accessible web signals only
So planning works without private social platform APIs

Acceptance Criteria:
- [ ] Research pipeline ingests only approved public sources (web pages, RSS, public profile pages, public search results, public forums).
- [ ] System explicitly forbids private API credentials for LinkedIn/X/Instagram/TikTok/YouTube analytics ingestion in this epic.
- [ ] Every extracted insight stores source URL, fetch timestamp, extractor version, and snippet hash for traceability.
- [ ] Source normalization deduplicates near-identical pages and repeated syndications using canonical URL and text similarity thresholds.
- [ ] Pipeline performs language detection and tags each source with locale for downstream filtering.
- [ ] Pipeline applies robots/terms-aware fetch controls and records blocked domains with reason codes.
- [ ] Topic extraction produces ranked clusters with confidence scores and supporting citation counts.
- [ ] Pain-point extraction outputs structured entries (`problem`, `audience`, `evidence_count`, `sample_quotes`, `source_refs`).
- [ ] Competitor mention extraction differentiates direct competitor references from generic category mentions.
- [ ] Pipeline produces a bounded, reproducible dataset snapshot artifact that can be reloaded for deterministic regeneration.

Executable Delivery Requirements:
- [ ] Add migration for source evidence storage including normalized URL, fetch metadata, locale, and dedupe hash keys.
- [ ] Implement fetch + extract pipeline in server-side job code with explicit allowlist/denylist configuration.
- [ ] Expose deterministic snapshot artifact references to downstream planning and reporting surfaces.
- [ ] Add test fixtures for dedupe, locale detection, and blocked-domain handling.
- [ ] Add governance check that fails runs when prohibited source classes are fetched.
