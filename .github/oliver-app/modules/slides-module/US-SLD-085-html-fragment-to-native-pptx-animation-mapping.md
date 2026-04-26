---
ID: US-SLD-085
Title: HTML Fragment to Native PPTX Animation Mapping
Status: Backlog
Verified: false
Backdated: 2026-04-26
---

As a presenter using progressive reveals
I want fragment-style HTML reveal steps mapped to native PPT animations
So my slide timing/sequence is preserved without manual reauthoring

Acceptance Criteria:
- [ ] Reveal-style fragment ordering maps to native PPT entrance animations (for example fade/fly-in) with deterministic sequence.
- [ ] Animation mappings are configurable by effect profile (default, conservative, disabled).
- [ ] Unsupported animation semantics degrade to static output with explicit warning entries.
- [ ] Exported deck opens with valid animation timelines in desktop PowerPoint.
- [ ] Coverage includes multi-fragment slides with mixed text/shape targets.
