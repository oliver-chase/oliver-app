# QA: Topbar

Component: `src/components/layout/Topbar.tsx` + `src/components/shared/SyncDot.tsx`
CSS source: `accounts.css` lines 9-24, 56
Run against: staging.oliver-app.pages.dev/accounts

---

## Structure

- [ ] Root element: `<header class="topbar">`
- [ ] Child order: hamburger → account name → sep → engagement → nav → topbar-right
- [ ] topbar-right child order: Export Plan button → sync-dot → sync-text

---

## .topbar (container)

| Property | Expected value | Check |
|---|---|---|
| Position | `fixed`, top:0, left:`var(--sidebar-w)` (220px), right:0 | Stays pinned, offset by sidebar |
| Height | `50px` (`--topbar-h`) | |
| Background | `#FEFFFF` (`--color-bg-card` / `--surface`) | White |
| Border bottom | `1px solid var(--border)` (`#e0e0e2`) | Thin gray separator |
| Padding | `0 20px` | |
| z-index | `var(--z-topbar)` = `calc(50 - 10)` = 40 | Below sidebar overlay |
| Display | `flex`, `align-items: center`, `gap: 10px` | Items in a row |

---

## #btn-hamburger (.topbar-hamburger)

| Property | Expected value | Check |
|---|---|---|
| Display | `none` by default (desktop), `flex` at `≤768px` | Hidden on wide screens |
| Width/Height | `32px × 32px` | Small square |
| Color | `var(--gray)` (`#6c6c6f`) | Muted icon |
| Font size | `var(--font-size-lg)` = `17px` | ☰ symbol size |
| Background | `none` | Transparent |
| Border | `none` | No border |
| Border radius | `var(--radius)` = `8px` | Rounded |
| aria-label | `"Open navigation"` | |
| aria-expanded | `"false"` initially, `"true"` when sidebar open | |
| aria-controls | `"sidebar"` | |
| focus-visible | `2px solid var(--color-border-focus)` = `#E60075` outline, `1px` offset | Pink ring |

---

## #topbar-account (.topbar-account)

| Property | Expected value | Check |
|---|---|---|
| Font size | `var(--font-size-sm)` = `14px` | |
| Font weight | `var(--font-weight-bold)` | Bold |
| Color | `var(--text)` | Dark |
| White space | `nowrap` | Never wraps |
| Overflow | `hidden` + `text-overflow:ellipsis` | Truncates past max-width |
| Min width | `0` | Allows flex shrink |
| Max width | `260px` | Bounds width so nav labels stay left-aligned |
| Content (portfolio view) | `"All Accounts"` | Default when no account selected |
| Content (account view) | Account name from data, or `"Account"` fallback | Name of selected account |

---

## #topbar-sep (.topbar-sep)

| Property | Expected value | Check |
|---|---|---|
| Element | `<span>` | |
| Font size | `var(--font-size-sm)` = `14px` | |
| Color | `var(--gray-light)` = `#8c8c8f` | Light gray |
| Content | `/` | Forward slash |
| Display | `none` when no engagement, `""` (visible) when engagement present | |

---

## #topbar-engagement (.topbar-engagement)

| Property | Expected value | Check |
|---|---|---|
| Font size | `var(--font-size-sm)` = `14px` | |
| Color | `var(--gray)` = `#6c6c6f` | Muted |
| White space | `nowrap` | |
| Overflow | `hidden`, text-overflow `ellipsis` | Long names truncate |
| Display | `none` when no engagement name | |

---

## #topbar-nav (.topbar-nav)

| Property | Expected value | Check |
|---|---|---|
| Display | `none` when portfolio view, `flex` when account selected | |
| Gap | `2px` | Tight gap between links |
| Margin left | `6px` | Small offset from engagement |
| Nav order | Overview → People → Opportunities → Projects → Actions → Notes | Exact order — verify all 6 present |

### Nav link styles (.topbar-nav a)

| Property | Expected value | Check |
|---|---|---|
| Font size | `var(--font-size-xs)` = `13px` | |
| Font weight | `500` | |
| Color | `var(--gray)` = `#6c6c6f` | Muted |
| Text decoration | `none` | No underline |
| Padding | `5px 10px` | |
| Border radius | `var(--radius)` = `8px` | |
| Transition | `0.12s` | Fast |
| Hover bg | `var(--surface2)` = `#f5f5f6` | Light gray |
| Hover color | `var(--text)` = `#1a1a1a` | Dark |
| Active class bg | `var(--accent-light)` = `#fce4f0` | Pink-light |
| Active class color | `var(--accent-text)` = `#532976` | Purple |
| Active class weight | `600` | Semibold |

---

## .topbar-right

| Property | Expected value | Check |
|---|---|---|
| Margin left | `auto` | Pushes to right edge |
| Display | `flex`, `align-items: center`, `gap: 6px` | Row of items |
| Flex shrink | `0` | Never squishes |

---

## #btn-export-plan (.btn-link)

| Property | Expected value | Check |
|---|---|---|
| Display | `none` when portfolio view, visible when account selected | |
| Font size | `var(--font-size-xs)` = `13px` | |
| Padding | `5px 10px` | |
| Appearance | Looks like a text link (btn-link class) | No background or border |
| Text | `Export Plan` | |
| Click | No-op currently (TODO: wire export) | Does not throw an error |

---

## #sync-dot (.sync-dot)

| Property | Expected value | Check |
|---|---|---|
| Element | `<div>` (not `<span>`) | |
| Width/Height | `7px × 7px` (`--sync-dot-size`) | Small circle |
| Border radius | `50%` | Round |
| Default color | `var(--color-text-placeholder)` = `#767679` | Gray when idle |
| `.syncing` color | `var(--color-amber)` = `#b86c0a` | Amber/yellow |
| `.ok` color | `var(--color-green)` = `#1a9c6e` | Green |
| `.err` color | `var(--color-red)` = `#c0392b` | Red |
| Transition | `var(--transition-slow)` = `300ms ease` | Smooth color change |

---

## #sync-text (.sync-text)

| Property | Expected value | Check |
|---|---|---|
| Font size | `var(--font-size-xs)` = `13px` | |
| Color | `var(--color-text-secondary)` = `#6c6c6f` | |
| aria-live | `polite` | Screen reader announces changes |
| aria-atomic | `true` | |
| Content when syncing | `Saving…` | |
| Content when ok | `Synced` | |
| Content when error | `Error` | |

---

## Mobile (≤768px)

| Check |
|---|
| `#btn-hamburger` becomes visible (flex) |
| `.topbar-nav` hidden (`display:none !important`) |
| `.topbar` left offset becomes `0` (no sidebar offset) |

---

## Interactions to run

1. Load portfolio view — topbar shows "Account Strategy", nav hidden, Export Plan hidden
2. Select an account — topbar shows account name, nav appears, Export Plan appears
3. Hover each nav link — light gray bg
4. Scroll to a section — correct nav link gets `.active` class (pink-light bg)
5. Data loading — sync-dot amber + "Saving…" text
6. Data saved — sync-dot green + "Synced" text
7. Data error — sync-dot red + "Error" text
8. Resize to mobile — hamburger shows, nav hides
9. Click hamburger — sidebar slides in
