# QA: Filterbar

Component: `src/components/accounts/Filterbar.tsx`
CSS source: `accounts.css` lines 25-38
Run against: staging.oliver-app.pages.dev/accounts

---

## Structure

- [ ] Element: `<div class="filterbar" id="filterbar" role="search">`
- [ ] Child order: search input → reset button
- [ ] Visible only when an account is selected; hidden in portfolio view

---

## .filterbar (container)

| Property | Expected value | Check |
|---|---|---|
| Position | `fixed`, top:`var(--topbar-h)`=50px, left:`var(--sidebar-w)`=220px, right:0 | Sits directly below topbar |
| Background | `var(--surface)` = `#FEFFFF` | White |
| Border bottom | `1px solid var(--border)` = `#e0e0e2` | Thin gray separator |
| Padding | `8px 20px` | |
| Display | `flex`, `align-items:center`, `gap:8px` | Row of controls |
| Overflow-x | `auto` | Scrolls on small widths |
| z-index | `39` | Below topbar (40), below sidebar (50) |
| Height | `52px` (`--filterbar-h`) | |
| Visibility | `display:none` on portfolio view | Not visible until account selected |

---

## #filter-search (.filter-search)

| Property | Expected value | Check |
|---|---|---|
| Type | `text` input | |
| Placeholder | `Search…` (ellipsis entity) | |
| aria-label | `"Search accounts"` | |
| Font | `var(--font)` = Aptos | |
| Font size | `var(--font-size-sm)` = `14px` | |
| Padding | `6px 10px 6px 28px` | Left pad makes room for search icon |
| Border | `1px solid var(--border)` | |
| Border radius | `var(--radius)` = `8px` | |
| Background | White surface + SVG magnifier icon at `8px center` | Inline SVG icon on left |
| Width | `150px` | Fixed narrow width |
| Flex shrink | `0` | Never squishes |
| focus-visible | `box-shadow: 0 0 0 2px var(--color-border-focus)` = pink glow, `outline:none` | Pink ring, no default outline |
| Typing | Filters the account view in real-time | Results update immediately |

---

## #filter-reset (.filter-reset)

| Property | Expected value | Check |
|---|---|---|
| Element | `<button>` | |
| Text | `Reset` | |
| title | `"Reset all filters to default view"` | Tooltip on hover |
| aria-label | `"Reset all filters"` | |
| Font | `var(--font)` | |
| Font size | `var(--font-size-xs)` = `13px` | |
| Padding | `5px 10px` | |
| Border | `1px solid var(--border)` | |
| Border radius | `var(--radius)` = `8px` | |
| Background | `none` | Transparent |
| Color | `var(--gray)` = `#6c6c6f` | Muted |
| Hover bg | `var(--surface2)` = `#f5f5f6` | Light gray on hover |
| focus-visible | `2px solid var(--color-border-focus)`, `1px` offset | Pink ring |
| Click | Clears search field | Search empties, filter resets |

---

## Mobile (≤768px)

| Property | Expected value | Check |
|---|---|---|
| Left offset | `0` (no sidebar offset) | Full-width |
| Flex wrap | `wrap` | Controls wrap to next line |
| Gap | `6px` | Slightly tighter |
| Padding | `8px 12px` | |
| `.filter-reset` min-height | `44px` | Touch target |
| Padding-top/bottom | `10px` each | |

## Print

- [ ] Filterbar hidden (`display:none !important`)

---

## Interactions

1. Load portfolio — filterbar hidden
2. Select account — filterbar appears below topbar
3. Type in search — filter applies (currently wired to state, no visual feedback on sections yet)
4. Click Reset — search clears
5. Go back to portfolio — filterbar hides
