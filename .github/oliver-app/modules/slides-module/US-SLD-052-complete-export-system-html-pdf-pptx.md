---
ID: US-SLD-052
Title: Complete HTML, PDF, and PPTX Export Pipeline From SlideDocument JSON
Status: Backlog
Verified: false
Backdated: 2026-04-25
---

As a slide editor user
I want to export slides to HTML, PDF, and PPTX from my edited canvas state
So I can deliver outputs without format-specific rework

Acceptance Criteria:
- [ ] HTML export generates deterministic absolute-positioned slide markup with inline styles and embedded assets.
- [ ] HTML export visually matches canvas rendering within agreed tolerance.
- [ ] PDF export is generated from rendered HTML output and preserves layout fidelity.
- [ ] PDF export includes no major layout shifts against canvas.
- [ ] PPTX export maps text layers to editable text boxes.
- [ ] PPTX export maps shape layers to editable PPTX shapes where supported.
- [ ] PPTX export maps image/logo layers to image objects.
- [ ] Unsupported style mappings (for example complex gradients/shadows) surface explicit warnings.
- [ ] All export paths consume canonical SlideDocument JSON as source.

Notes:
- PPTX target is best-effort editability, not guaranteed pixel-perfect parity.
