---
ID: US-O14
Title: Slide Import Canvas Normalization to 1920x1080
Status: Code Present
Verified: true
Backdated: 2026-04-24
---

As a slide editor user  
I want imported coordinates normalized to a fixed 1920x1080 canvas  
So imported layouts align with Oliver's canonical editing space.

Acceptance Criteria:
- [x] Source canvas dimensions are detected from slide root width/height when present.
- [x] Imported component `x/y/width/height` are scaled into 1920x1080 coordinates when source dimensions differ.
- [x] Import result always reports a 1920x1080 canvas.
- [x] Import warns when normalization occurs from a non-1920x1080 source.
