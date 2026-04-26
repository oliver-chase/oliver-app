---
ID: US-SLD-056
Title: Surface Structured Import Warnings for Unsupported Features
Status: In Progress
Verified: false
Backdated: 2026-04-25
---

As a slide editor user
I want specific warnings for unsupported import features
So I can quickly judge fidelity risk and decide whether manual cleanup is needed

Acceptance Criteria:
- [ ] Import warnings are structured, specific, and non-blocking unless parse is impossible.
- [ ] Warning taxonomy includes at minimum: pseudo-elements not extracted, inaccessible external images, unsupported transforms, CSS animations, canvas elements, video elements, and unresolved external stylesheets.
- [ ] Warnings include fallback behavior details when approximation/skipping is applied.
- [ ] Unsupported style values are ignored with warning output, not silent failure.
- [ ] Import completes with warnings whenever core slide extraction is still possible.

Progress Notes (2026-04-26):
- Added explicit fallback-reporting warnings when parser must import top-level nodes as fidelity fallback.
- Fallback imported layers are now marked locked and labeled with `(fallback)` source metadata.
- Added regression coverage `SLD-FE-304` for fallback warning visibility + locked-layer contract.
