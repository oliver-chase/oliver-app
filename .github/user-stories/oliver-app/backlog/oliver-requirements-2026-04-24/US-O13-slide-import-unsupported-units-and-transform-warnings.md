---
ID: US-O13
Title: Slide Import Warnings for Unsupported Units and Transform Features
Status: Code Present
Verified: true
Backdated: 2026-04-24
---

As a slide editor user  
I want unsupported CSS units and transforms called out during HTML import  
So I can correct layout drift before saving or exporting.

Acceptance Criteria:
- [x] Import warns when `left/top/width/height` use non-px units (for example `%`, `vw`, `vh`).
- [x] Import warns when transform functions are unsupported (for example rotate/scale/matrix).
- [x] Import continues with best-effort parsing after warning.
- [x] Warning text is visible in Slide Editor results.
