---
ID: US-SLD-084
Title: Auto-Font Embedding for PPTX Export
Status: Backlog
Verified: false
Backdated: 2026-04-26
---

As a presentation author
I want export to embed actual CSS font assets
So slides do not fall back to default fonts in PowerPoint

Acceptance Criteria:
- [ ] Export scans computed CSS/font-face declarations and resolves font file URLs used by slide content.
- [ ] PPTX package embeds resolved font files when licensing/availability allow.
- [ ] Font mapping preserves family/weight/style intent for heading/body text layers.
- [ ] Missing or blocked fonts degrade with deterministic fallback and explicit warnings.
- [ ] Regression fixtures verify no silent Arial/default fallback when embeddable font assets are available.
