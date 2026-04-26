---
ID: US-O31
Title: Harden Slides API Resilience and Client Degraded Mode
Status: Not Started
Verified: false
Backdated: 2026-04-25
---

As a slide editor user
I want backend failures to degrade safely with clear recovery
So editing is not blocked by opaque Cloudflare/worker exception payloads

Acceptance Criteria:
- [ ] All slides API failures return structured JSON envelopes with correlation identifiers (no raw HTML error page passthrough).
- [ ] Client error parser summarizes transport failures and surfaces correlation id/ray id when available.
- [ ] Autosave retry behavior classifies transient vs terminal failures and avoids infinite noisy retries.
- [ ] Library/audit/template endpoints fail independently without collapsing the full slides UI.
- [ ] Degraded mode path is defined (read-only or local draft mode) with clear user messaging and retry controls.
- [ ] Observability captures failure class, endpoint, actor, and correlation id for incident triage.

