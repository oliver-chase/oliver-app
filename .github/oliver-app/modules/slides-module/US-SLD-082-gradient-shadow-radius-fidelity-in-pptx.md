---
ID: US-SLD-082
Title: Gradient, Shadow, and Border-Radius Fidelity in PPTX
Status: Backlog
Verified: false
Backdated: 2026-04-26
---

As a slide export user
I want modern CSS paint effects preserved in PPTX
So gradients, shadows, and rounded assets do not visually degrade

Acceptance Criteria:
- [ ] Linear/radial gradients map with preserved direction and color stop order where PPTX supports equivalent constructs.
- [ ] Box/text shadows map to closest editable PPTX effects with bounded visual drift.
- [ ] Border radius mapping avoids white-halo artifacts on rounded images and clipped containers.
- [ ] Unsupported effect combinations emit warnings that identify exact node/component ids.
- [ ] Visual regression fixtures assert parity for gradients, shadows, and rounded-image scenarios.
