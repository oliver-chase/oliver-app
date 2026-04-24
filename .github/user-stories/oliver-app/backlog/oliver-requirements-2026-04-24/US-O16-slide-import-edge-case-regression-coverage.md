---
ID: US-O16
Title: Slide Import Edge-Case Regression Coverage
Status: Code Present
Verified: true
Backdated: 2026-04-24
---

As a QA lead  
I want automated regression checks for HTML import edge cases  
So parser behavior stays stable as import logic evolves.

Acceptance Criteria:
- [x] Automated tests cover unsupported-unit warnings in Slide import.
- [x] Automated tests cover canvas normalization from non-1920x1080 inputs.
- [x] Automated tests cover sanitization of unsafe markup and URLs.
- [x] Automated tests cover simple translate transform behavior.
