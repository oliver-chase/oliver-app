---
ID: US-SLD-005
Title: Include Slides in Coverage and Verification Audits
Status: Code Present
Verified: false
Backdated: 2026-04-24
---

As a maintainer
I want slide-module behavior explicitly listed in coverage and verification audits
So risk and test debt for slides are visible in the same way as other modules

Acceptance Criteria:
- [x] Coverage audit includes `/slides` route and parser behavior in its route/behavior summary.
- [x] Verification audit includes slide stories and verification strength entries.
- [x] Traceability matrix includes slide behavior rows tied to slide-specific stories.
- [x] Slides does not remain an implicit module with test evidence but without audit visibility.
