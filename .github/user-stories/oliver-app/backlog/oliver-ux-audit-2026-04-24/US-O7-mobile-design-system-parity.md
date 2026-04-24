---
ID: US-O7
Title: Mobile Responsiveness Must Inherit Web Design System
Status: Partial
Verified: false
Backdated: 2026-04-24
---

Current state:
- Mobile breakpoints exist in multiple module styles (for example [hub.module.css](/Users/oliver/projects/oliver-app/src/app/hub.module.css), [sdr.css](/Users/oliver/projects/oliver-app/src/app/sdr/sdr.css), interactive styles in [components-interactive.css](/Users/oliver/projects/oliver-app/src/app/components-interactive.css)).
- Shared design tokens are centralized in [tokens.css](/Users/oliver/projects/oliver-app/src/app/tokens.css).

Gap:
- No explicit automated parity audit proving mobile always inherits same component system as web.
- Some module-specific component variants may drift without centralized enforcement.

Backlog acceptance:
- Add a mobile-vs-desktop parity checklist per module.
- Add browser smoke viewport coverage for key shared components.
- Enforce token/component consistency with lint/tests where possible.

