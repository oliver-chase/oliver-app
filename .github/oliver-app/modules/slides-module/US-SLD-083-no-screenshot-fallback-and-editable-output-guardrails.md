---
ID: US-SLD-083
Title: No Screenshot Fallback and Editable Output Guardrails
Status: Backlog
Verified: false
Backdated: 2026-04-26
---

As a presentation author
I want exports to stay editable instead of flattening to screenshots
So downstream teams can modify deck content natively in PowerPoint

Acceptance Criteria:
- [ ] Text, shape, and supported media nodes export as native PPTX objects by default.
- [ ] Screenshot/raster fallback is disallowed for supported node types.
- [ ] Any unavoidable rasterization is constrained to unsupported nodes and clearly reported in warnings.
- [ ] Export summary reports editable object count vs fallback object count.
- [ ] Contract tests fail if supported node types regress to screenshot fallback.
