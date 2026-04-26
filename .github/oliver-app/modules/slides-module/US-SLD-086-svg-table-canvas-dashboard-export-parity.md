---
ID: US-SLD-086
Title: SVG, Table, and Canvas Dashboard Export Parity
Status: Backlog
Verified: false
Backdated: 2026-04-26
---

As an analytics/dashboard user
I want SVG, HTML table, and canvas/chart surfaces to export reliably
So operational decks can be generated from modern web dashboard views

Acceptance Criteria:
- [ ] SVG nodes export as editable vector-friendly output when supported by PPT target format.
- [ ] HTML tables export with preserved row/column structure, text values, and basic cell styling.
- [ ] `<canvas>` chart surfaces export with stable visual parity and documented editability limits.
- [ ] Export pipeline supports common dashboard chart libraries (for example ECharts/Chart.js) through deterministic fallback behavior.
- [ ] Regression fixtures cover mixed dashboard slides containing SVG + table + canvas content.
