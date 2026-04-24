---
ID: US-O4
Title: All Open Text Inputs Must Mirror One Source of Truth
Status: Partial
Verified: false
Backdated: 2026-04-24
---

Current state:
- Canonical reusable input classes exist (`.app-input`, `.app-modal-input`) in [components-base.css](/Users/oliver/projects/oliver-app/src/app/components-base.css) and [components-interactive.css](/Users/oliver/projects/oliver-app/src/app/components-interactive.css).
- Multiple module-specific input classes still exist (for example, SDR search/input styles in [sdr.css](/Users/oliver/projects/oliver-app/src/app/sdr/sdr.css)).

Constraint:
- Requested "Compliments > Log a Compliment" source of truth is not present in current `oliver-app` codebase.

Gap:
- Input styling is not fully centralized to one canonical class system across all open text entry points.

Backlog acceptance:
- Define the canonical input source in this repo (or import from shared package if applicable).
- Inventory all input classes and migrate deviants to canonical style tokens/classes.
- Add style-lint/test checks for placeholder typography/color parity.

