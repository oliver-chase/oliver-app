---
ID: US-O4
Title: Open Text Inputs Use One Canonical Source of Truth
Status: Partial
Verified: false
Backdated: 2026-04-24
Scope: Cross-repo dependency (Oliver implementation, Tesknota canonical reference)
---

As a product/design maintainer  
I want all open text inputs to follow one canonical style system  
So users get consistent input behavior and typography across routes.

Current state:
- Canonical input classes exist in [components-base.css](/Users/oliver/projects/oliver-app/src/app/components-base.css) and [components-interactive.css](/Users/oliver/projects/oliver-app/src/app/components-interactive.css).
- Module-specific variants still exist (example in [sdr.css](/Users/oliver/projects/oliver-app/src/app/sdr/sdr.css)).

Acceptance Criteria:
- [ ] Canonical input source-of-truth is explicitly documented in-repo.
- [ ] Deviant module input classes are inventoried and either removed or justified.
- [ ] Placeholder typography/color parity is validated against canonical tokens.
- [ ] Shared input behavior is covered by smoke checks for at least Accounts, HR, and SDR.
