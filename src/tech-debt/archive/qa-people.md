# QA: PeopleSection

Component: `src/components/accounts/PeopleSection.tsx`
CSS source: `accounts.css` lines 153-230, `components-base.css` lines 98-256
Run against: staging.oliver-app.pages.dev/accounts → select account → People section

---

## Structure

- [ ] Section header: `<div class="app-section-header">`
- [ ] Title: `<div class="app-section-title">People</div>`
- [ ] Header row 2: `<div class="section-header-row2">`
- [ ] Left: `<div class="section-header-left"><button class="btn-ghost btn--compact" id="btn-add-person">+ Add person</button></div>`
- [ ] Actions: `<div class="section-actions">`
- [ ] Sort: `<select class="sort-select" id="people-sort">` with Name A–Z / Seniority / Department
- [ ] Filter wrapper: `<div class="people-filter-wrapper">`
- [ ] Filter chip: `<button class="filter-chip" id="people-filter-btn">Filters</button>`
- [ ] Filter panel: `<div class="people-filter-panel app-popover" id="people-filter-panel">` (shown when open)
- [ ] View toggle: `<div class="app-view-toggle" id="people-toggle">` with Cards/Org buttons
- [ ] Content: `<div id="people-body">`

---

## .filter-chip

| Property | Expected value | Check |
|---|---|---|
| Padding | `4px 12px` | |
| Border radius | `20px` | |
| Background (default) | `var(--surface)` | |
| Color (default) | `var(--gray)` | |
| Background (on) | `var(--purple)` | When filters active |
| Color (on) | `var(--white)` | |

---

## .app-view-toggle-btn

| Property | Expected value | Check |
|---|---|---|
| Padding | `4px 12px` | |
| Border radius | `20px` | |
| Background (default) | `var(--surface)` | |
| Background (active) | `var(--purple)` | |
| Color (active) | `var(--white)` | |

---

## Filter panel (.people-filter-panel)

| Element | Expected | Check |
|---|---|---|
| Position | `absolute; top:100%; right:0` | Below button |
| Executive checkbox | `#filter-exec-check` | |
| Incomplete checkbox | `#filter-incomplete-check` | |
| Closes on outside click | Yes | |

---

## .people-grid

| Property | Expected value | Check |
|---|---|---|
| Display | `grid` | |
| Columns | `repeat(auto-fill, minmax(280px, 1fr))` | |
| Gap | `var(--spacing-md)` = `16px` | |
| Mobile (≤768px) | Single column | |

---

## Pagination

| Property | Expected value | Check |
|---|---|---|
| Page size | 6 cards per page | |
| Shows | Only when total > 6 | |
| Buttons | ⟨ ← Page N of M → ⟩ | |
| Disabled | First/last button when at boundary | |
| Page resets | To 0 on sort change, filter change, add person | |

---

## .person-card

| Property | Expected value | Check |
|---|---|---|
| Background | `var(--surface)` | |
| Border | `1px solid var(--border)` | |
| Border radius | `var(--radius-lg)` = `12px` | |
| Padding | `16px` | |
| Position | `relative` | |

### .person-card-top

| Element | Expected | Check |
|---|---|---|
| Avatar `.avatar.client` | Initials in pink circle | |
| Avatar `.avatar.vtwo` | Initials in purple circle (V.Two org) | |
| Name div `.name` | `contentEditable`, bold | |
| Title row `.card-meta-row` | Label "Title:" + contentEditable span | |
| Dept row `.card-meta-row` | Label "Dept:" + contentEditable span | |
| Empty title | "Add title…" italic gray | |
| Empty dept | "Add department…" italic gray | |

### .person-card-body (collapsible)

| Element | Expected | Check |
|---|---|---|
| Owners block `.person-owners-block` | Primary + Secondary pickers | |
| Reports To row | `.card-owner-btn` picker, margin-top 14px | |
| Engagement row | `.person-eng-pill` multi-select, margin-top 14px | |
| Notes | `.card-section-label` "Notes" + `.card-notes-wrap` > `.card-body-text` | |
| Notes close btn | `.card-notes-close` ×, only visible when expanded | |

### Expand button (.card-expand-btn)

| State | Expected | Check |
|---|---|---|
| Collapsed with overflow | Shows ▾, body collapsed | |
| No overflow | Hidden | |
| Expanded | Shows ▴, body expanded | |

### Delete button (.project-delete)

| Property | Expected | Check |
|---|---|---|
| Symbol | × | |
| Position | Absolute top-right of card | |
| Click | Confirm dialog → deletes on confirm | |

---

## New-card (inline add)

| Property | Expected | Check |
|---|---|---|
| Border | `1.5px dashed var(--pink)` | |
| Class | `person-card new-card` | |
| Name field | `.name.field-required-highlight` (pink tint), placeholder "Full name…" | |
| Pink highlight | Removed once name entered | |
| Save trigger | Name blur → upsertStakeholder | |
| Discard | × button or Escape key | |
| Outside click with name | Saves | |
| Outside click without name | Discards | |
| Auto-focus | Name field on mount | |

---

## Interactions

1. Sort "Name A–Z" → alphabetical; "Seniority" → title alpha; "Department" → dept alpha
2. "Filters" chip → panel opens; Executive filter → only exec=true cards shown
3. Incomplete filter → only cards missing dept/primary_owner/secondary_owner/reports_to
4. Filter chip turns purple when any filter on
5. Click "Cards" toggle → card grid shown
6. Click "Org" toggle → org chart stub shown
7. Edit name → blur saves, avatar updates with new initials
8. Edit title → blur saves; empty → reverts to "Add title…" italic
9. Click owner picker → popover with team names + None
10. Click engagement pill → multi-select popover
11. Expand button shown only when body content overflows collapsed height
12. Click ▾ → body expands, button becomes ▴
13. Focus notes → body auto-expands
14. 7+ people → pagination row shown; ⟨←→⟩ navigate pages
