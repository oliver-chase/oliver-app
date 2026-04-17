# QA: PortfolioView + AccountCard

Component: `src/components/accounts/PortfolioView.tsx`
CSS source: `accounts.css` lines 62-75, 320-327
Run against: staging.oliver-app.pages.dev/accounts (portfolio view)

---

## Structure

- [ ] Outer wrapper: `<div id="portfolio-view">` (no class)
- [ ] Section header inside: `<div class="app-section-header portfolio-section-header"><div class="app-section-title">All Accounts</div></div>`
- [ ] Grid: `<div class="portfolio-grid" id="portfolio-grid">`
- [ ] Empty state: `<div class="empty-state">No accounts yet.</div>` directly in grid
- [ ] Tier order inside grid: Strategic → Growth → Maintenance → At-Risk → [Archived separator] → Archived accounts

---

## .portfolio-grid

| Property | Expected value | Check |
|---|---|---|
| Display | `grid` | |
| Columns | `repeat(auto-fill, minmax(280px, 1fr))` | Responsive columns ≥280px |
| Gap | `var(--spacing-md)` = `16px` | |
| Padding top | `8px` | Cards start 8px below header |
| Mobile (≤768px) | `grid-template-columns: 1fr` | Single column |

---

## .portfolio-section-header

| Property | Expected value | Check |
|---|---|---|
| Padding top | `8px` | Small top space |

---

## Archived separator div (.portfolio-archived-sep)

| Property | Expected value | Check |
|---|---|---|
| Source equivalent | `<div style="...">Archived</div>` — inline styled in source, CSS class in oliver-app | |
| Width | `100%` | Full grid row |
| Grid column | `1 / -1` | Spans all columns |
| Padding | `12px 0 4px` | |
| Font size | `var(--font-size-xs)` = `13px` | |
| Font weight | `var(--font-weight-bold)` = `700` | |
| Letter spacing | `.06em` | Slightly spaced (no token — closest is `--letter-spacing-caps: .08em`) |
| Text transform | `uppercase` | "ARCHIVED" |
| Color | `var(--gray)` = `#6c6c6f` | Muted |
| Position | Appears between active and archived accounts | |

---

## .account-card

| Property | Expected value | Check |
|---|---|---|
| Background | `var(--surface)` = `#FEFFFF` | White |
| Border | `1px solid var(--border)` = `#e0e0e2` | |
| Border left | `4px solid transparent` default; overridden by tier class | Colored left edge |
| Padding | `18px 20px 18px 16px` | Asymmetric — less on left because of thick border |
| Border radius | `var(--radius-lg)` = `12px` | |
| Cursor | `pointer` | |
| Transition | `.15s` | Hover is fast |
| role | `button` | |
| tabIndex | `0` | Keyboard focusable |
| Hover border | `var(--pink)` = `#E60075` | All 4 sides turn pink |
| Hover shadow | `0 2px 8px rgba(0,0,0,.07)` | Subtle lift |
| Archived opacity | `0.5` | Dimmed cards |

### Tier left border colors

| Tier | Border color | Token |
|---|---|---|
| Strategic | `#1a9c6e` | `--color-tier-strategic` |
| Growth | `#1a6fb5` | `--color-tier-growth` |
| Maintenance | `#B0B1B5` | `--color-tier-maintenance` |
| At-Risk | `#c0392b` | `--color-tier-at-risk` |

---

## .account-card-name-row (invented class, source uses inline style)

| Property | Expected value | Check |
|---|---|---|
| Display | `flex` | |
| Align items | `center` | |
| Gap | `var(--spacing-sm)` = `8px` | |

---

## .account-card-name

| Property | Expected value | Check |
|---|---|---|
| Font size | `var(--font-size-base)` = `15px` | |
| Font weight | `700` | Bold |
| Color | `var(--text)` = `#1a1a1a` | |
| Margin bottom | `2px` | Tight |

---

## .badge-archived (invented class, source uses inline style)

| Property | Expected value | Check |
|---|---|---|
| Font size | `var(--font-size-xs)` = `13px` | |
| Font weight | `var(--font-weight-semibold)` = `600` | |
| Padding | `1px 6px` | |
| Border radius | `10px` | No exact token — slight violation noted |
| Background | `var(--surface2)` = `#f5f5f6` | Light gray |
| Color | `var(--gray)` = `#6c6c6f` | Muted |
| Visibility | Only appears on archived accounts | |

---

## .account-card-company

| Property | Expected value | Check |
|---|---|---|
| Font size | `var(--font-size-sm)` = `14px` | |
| Color | `var(--gray)` = `#6c6c6f` | |
| Margin bottom | `8px` | |
| contentEditable | Yes | Inline edit of company name |
| Click stops propagation | Yes | Clicking company doesn't open account |
| Blur saves | Calls onUpdateAccount with new company name | |
| contentEditable hover | `background: var(--accent-light)` = `#fce4f0` | Pink tint |
| contentEditable focus | `background: var(--accent-light)`, `box-shadow: 0 0 0 2px rgba(230,0,117,.15)` | Pink tint + glow |

---

## .account-card-stats

| Property | Expected value | Check |
|---|---|---|
| Display | `flex` | |
| Gap | `12px` | |
| Flex wrap | `wrap` | |
| Margin top | `8px` | |

### .account-stat (each stat item)

| Property | Expected value | Check |
|---|---|---|
| Font size | `var(--font-size-xs)` = `13px` | |
| Color | `var(--gray)` = `#6c6c6f` | |
| `<strong>` color | `var(--text)` = `#1a1a1a` | |
| `<strong>` weight | `600` | |
| Format | `{N} stakeholder(s)`, `{N} action(s)`, `{N} project(s)` | Plural when ≠1 |
| Counts | Stakeholders exclude V.Two org members | |

---

## .account-card-note

| Property | Expected value | Check |
|---|---|---|
| Font size | `var(--font-size-xs)` = `13px` | |
| Color | `var(--gray)` = `#6c6c6f` | |
| Margin top | `6px` | |
| Content | `Last updated {Month DD, YYYY}` or `Last updated Never` | |

---

## .last-updated-tip

| Property | Expected value | Check |
|---|---|---|
| Font size | `var(--font-size-xs)` = `13px` | |
| Color | `var(--gray)` = `#6c6c6f` | |
| Margin top | `4px` | |
| Font style | `italic` | |
| Content | `Team: Name1, Name2, ...` or empty string | Always rendered (even if empty) |

---

## Interactions

1. Load portfolio — cards grouped by tier (Strategic first, then Growth, Maintenance, At-Risk)
2. Archived accounts appear after "ARCHIVED" separator, dimmed to 50% opacity
3. Click card body → opens account detail
4. Click company name → activates inline edit (pink bg), stops card-open propagation
5. Edit company name → blurs → saves via onUpdateAccount
6. Keyboard Enter/Space on card → opens account (same as click)
7. Hover card → pink border + shadow
8. Hover company contentEditable → pink light bg
9. No accounts → "No accounts yet." message in grid
