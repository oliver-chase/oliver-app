# QA: OverviewSection

Component: `src/components/accounts/OverviewSection.tsx`
CSS source: `accounts.css` lines 290-320, `components-base.css` lines 98-120, 179-255
Run against: staging.oliver-app.pages.dev/accounts → select account → Overview section

---

## Structure

- [ ] Row 1 (`.overview-row`): Account Team card + Meeting Cadence card side by side
- [ ] Stats row (`.overview-stats`): Next Meeting | Last Activity | Current Year Projected Revenue | Prior Year Closed Revenue
- [ ] Row 3 (`.overview-row`): Revenue History chart card + Account Notes card

---

## .overview-row

| Property | Expected value | Check |
|---|---|---|
| Display | `grid` | |
| Grid template columns | `1fr 1fr` | |
| Gap | `12px` | |
| Align items | `stretch` | |
| Mobile (≤768px) | Single column | |

---

## Account Team card (.app-card.overview-card-col)

| Property | Expected value | Check |
|---|---|---|
| Display | `flex` + `flex-direction: column` | |
| Label "Account Director" | `.app-card-label` | |
| Director picker | `.overview-stat-val.picker-btn.overview-picker-btn` | Faded class when empty |
| Label "Account Manager" | `.app-card-label` with `margin-top: 10px` | |
| Manager picker | Same class pattern as director | |
| Label "Account Team (V.Two)" | `.app-card-label` with `margin-top: 10px` | |
| Team pills | `.overview-chip-row` with `.app-chip` items | |
| Chip remove button | `.app-chip-remove` with × | |
| Add button | `.btn-link` | |

### Picker options
- [ ] Lists all known team names
- [ ] Includes "None" option
- [ ] Includes "+ Add person…" option
- [ ] "+ Add person…" → window.prompt for name → saves to account_team + sets field

---

## Meeting Cadence card (.app-card.overview-card-col.overview-meeting-card)

| Property | Expected value | Check |
|---|---|---|
| Header | `.overview-stat-label` "MEETING CADENCE" | |
| Summary line | Cadence text (e.g. "Every Mon") or "Not set" (italic) | |
| Edit/Done button | Pink, top-right, toggles cadence editor | |
| Cadence editor | Shows when cadenceOpen; bordered top, padding-top 8px | |

### Cadence editor

| Element | Expected | Check |
|---|---|---|
| Frequency picker | Options: Does not repeat / Weekly / Every 2 weeks / Monthly / Quarterly | |
| Interval row | "Every [N] week(s)" — only shown when frequency set | |
| Day picker | 7 round buttons (S M T W T F S), purple when selected | Only weekly/biweekly |
| Meeting title field | `.overview-field-label` + `.overview-stat-val` contentEditable | |
| Recurring Attendees | `.overview-chip-row` pills + add button | |

---

## .overview-stats row

| Property | Expected value | Check |
|---|---|---|
| Display | `flex` (from source overview-stats class) | |
| Gap | `var(--spacing-md)` = `16px` | |
| Flex wrap | `wrap` | |

### Next Meeting stat (.overview-stat)

| State | Expected display | Check |
|---|---|---|
| Override set (future) | Date + "Override" + × clear button | |
| Computed (cadence + last note) | Date + "Projected" sublabel | |
| Neither | "Not scheduled" (italic, gray) | |
| "Set date →" button | Shows when no override; opens date input on click | |
| Date input | `type="date"`, autoFocus, saves on change, closes on blur | |

### Last Activity stat

| State | Expected display | Check |
|---|---|---|
| Notes exist | Most recent note date formatted `Mon DD, YYYY` | |
| No notes | "No activity" (faded) | |

### Revenue stats

| Stat | Expected | Check |
|---|---|---|
| CURRENT YEAR PROJECTED REVENUE | ContentEditable, placeholder "e.g. $450K" | |
| PRIOR YEAR CLOSED REVENUE | ContentEditable, placeholder "e.g. $380K" | |
| Both | `.overview-stat-val`; faded when empty, normal when set | |
| Save trigger | onBlur → upsertBackground | |

---

## Revenue History chart (.overview-chart-card)

| Property | Expected value | Check |
|---|---|---|
| Card class | `.overview-chart-card` | |
| Legend | "Projected" (teal/chart-bar color) + "Closed" (purple) | |
| Empty state | SVG with "No revenue data — click bars to add" message | |
| With data | SVG bar chart, projected bars left, closed bars right per year | |
| Y-axis labels | $Xk or $XM format | |
| Click bar | Inline input appears positioned near bar, pink border | |
| Hover bar | Tooltip shows year + type + value | |
| "+ Add historical year" | Pink link, opens HistoricalYearForm | |

### HistoricalYearForm

| Element | Expected | Check |
|---|---|---|
| Year select | Dropdown of years 2018–(current-1) | |
| Projected input | Text, placeholder "Projected (e.g. $450K)" | |
| Closed input | Text, placeholder "Closed (e.g. $380K)" | |
| Save button | `.btn-primary.btn--compact` | |
| Cancel button | `.btn-ghost.btn--compact` | |

---

## Account Notes card (.app-card.overview-card-col)

| Property | Expected value | Check |
|---|---|---|
| Label | "Account Notes" in `.app-card-label` | |
| Text area | `.overview-notes-text` — contentEditable, multi-line | |
| Min height | `80px` | |
| Save trigger | onBlur → saves to `strategic_context` field | |
| White-space | `pre-wrap` (preserves newlines) | |

---

## Interactions

1. Load account with no background → all fields empty/faded, chart shows "No revenue data"
2. Click Account Director picker → popover opens with team names + None + "+ Add person…"
3. Select team member from picker → saves immediately, picker updates
4. Select "+ Add person…" → window.prompt → new name added to team + set as director
5. Click "Edit" on cadence → editor expands
6. Select "Weekly" frequency → day picker row appears
7. Click day button → turns purple, summary text updates
8. Click "Done" → editor collapses, summary line shows computed text
9. Click "Set date →" on Next Meeting → date input appears
10. Pick date → override saves, "Override" label + × appears
11. Click × on override → clears, falls back to computed or "Not scheduled"
12. Edit revenue stat field → blur saves, chart re-renders
13. Click "+ Add historical year" → form appears inline
14. Fill form + Save → chart re-renders with new bar
15. Click existing bar → inline input appears near bar
16. Type new value + Enter → bar updates height and tooltip
17. Add team member pill → chip appears with × remove button
18. Remove chip → chip disappears, field saves
