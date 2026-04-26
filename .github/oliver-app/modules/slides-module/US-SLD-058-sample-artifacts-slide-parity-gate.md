---
ID: US-SLD-058
Title: Pass Sample Artifact Slide Visual Parity Gate (`slide-10-artifacts.html`)
Status: Backlog
Verified: false
Backdated: 2026-04-25
---

As a slide editor user
I want the known artifact sample to import with high visual parity
So I can start editing immediately instead of rebuilding structure manually

Acceptance Criteria:
- [ ] Imported canvas shows dark navy/purple gradient background (not default editor background).
- [ ] Imported layout preserves left/right two-column structure.
- [ ] Left headline renders large white text with correct wrapping.
- [ ] Expected text layers are present exactly once for: `What We Leave Behind`, main headline, body paragraph, `2-week`, delivery-cycle line, and each card number/title/description.
- [ ] Four artifact cards render on right with rounded dark containers.
- [ ] Card text does not duplicate or overlap itself.
- [ ] Cyan `2-week` metric appears in lower-left region.
- [ ] Bottom-right V logo imports as image layer and remains positioned correctly.
- [ ] `.art` card structure imports as card/background layer (or group-equivalent) with nested `.an`, `.al`, `.ad` text layers.
- [ ] `.art::before` accent bars import as thin shape layers when supported; otherwise warning is emitted without import failure.
