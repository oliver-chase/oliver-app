---
ID: US-O15
Title: Slide Import Sanitization Hardening for Unsafe Markup
Status: Code Present
Verified: true
Backdated: 2026-04-24
---

As a security reviewer  
I want imported HTML sanitized before component content is stored or rendered  
So unsafe scripts and event handlers cannot execute in the editor.

Acceptance Criteria:
- [x] `script/style/iframe/object/embed/link/meta` elements are stripped from imported component markup.
- [x] Inline event attributes (`on*`) are removed from imported nodes.
- [x] `javascript:` URLs in `href/src` are removed.
- [x] Sanitized markup is what appears in imported component JSON output.
