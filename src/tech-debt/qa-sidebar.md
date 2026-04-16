# QA: Sidebar

Component: `src/components/accounts/Sidebar.tsx`
CSS source: `components-layout.css`, `accounts.css`
Run against: staging.oliver-app.pages.dev/accounts

---

## Structure

- [ ] Root element is `<aside>` (not `<nav>`) with classes `app-sidebar` + `open` when expanded
- [ ] `id="sidebar"` present on the aside
- [ ] Child order: logo → back link → All Accounts section → Accounts section → Add Account button
- [ ] `<div class="sidebar-backdrop" id="sidebar-backdrop">` exists outside the aside

---

## .app-sidebar (container)

| Property | Expected value | Check |
|---|---|---|
| Position | `fixed`, top-left corner | Does not scroll with page |
| Width | `220px` (`--sidebar-w`) | Matches content column offset |
| Height | `100vh` | Full viewport height |
| Background | `#532976` (`--color-brand-purple`) | Deep purple, not dark navy |
| Color | `#FEFFFF` (`--color-text-inverse`) | White text |
| z-index | `50` (`--z-sidebar`) | Sits above topbar |
| Overflow | `auto` (scrollable) | Long account lists scroll inside sidebar |

---

## .app-sidebar-logo

| Property | Expected value | Check |
|---|---|---|
| Padding | `16px` all sides | Comfortable spacing |
| Font size | `14px` (`--font-size-sm`) | |
| Font weight | `700` (bold) | "Account Strategy" is bold |
| Bottom border | `1px solid rgba(255,255,255,0.12)` | Faint white separator below logo |
| Text | `Account Strategy` | Exact string |

---

## .sidebar-back (Back to Hub link)

| Property | Expected value | Check |
|---|---|---|
| Display | `block` (full-width tap target) | Spans full sidebar width |
| Padding | `4px 16px 8px` (`--spacing-xs` / `--spacing-md` / `--spacing-sm`) | |
| Bottom border | `1px solid rgba(255,255,255,0.08)` | Very faint separator |
| Font size | `13px` (`--font-size-xs`) | Smaller than nav items |
| Color | `rgba(254,255,255,0.75)` | Slightly muted white |
| Text | `← Back to Hub` (left arrow entity) | Exact string, no extra spaces |
| Hover color | `#FEFFFF` | Full white on hover |
| Focus visible | `2px solid rgba(255,255,255,0.8)` outline, `1px` offset | Keyboard nav ring visible |
| Navigation | Clicking navigates to `/` (hub page) | Does not trigger account select |

---

## .app-sidebar-section (All Accounts)

| Property | Expected value | Check |
|---|---|---|
| Padding | `0 8px` (`--spacing-sm`) | |
| Margin bottom | `4px` (`--spacing-xs`) | Small gap between sections |
| Contains exactly | One `.app-sidebar-item#sidebar-all` | No label above it |

---

## .app-sidebar-item (All Accounts row)

| Property | Expected value | Check |
|---|---|---|
| Min height | `44px` (`--touch-target`) | Meets WCAG 2.5.5 |
| Padding | `7px 16px` | |
| Font size | `14px` (`--font-size-sm`) | |
| Font weight | `500` (medium) default, `700` (bold) when active | |
| Color | `rgba(254,255,255,0.8)` default | Slightly muted |
| Border left | `2px solid transparent` default | No visible left border |
| Active state | `background: rgba(255,255,255,0.11)`, `border-left: 2px solid #E60075`, full white text, bold | Pink left bar + lighter bg |
| Hover state | `background: rgba(255,255,255,0.07)`, full white text | Subtle highlight |
| id | `sidebar-all` | |
| role | `button` | |
| tabIndex | `0` | Keyboard focusable |
| Click | Calls `onSelectAll`, closes sidebar | Portfolio view loads |
| Enter/Space | Same as click | Keyboard accessible |

---

## .app-sidebar-section (Accounts section)

| Property | Expected value | Check |
|---|---|---|
| Contains | `.app-sidebar-section-label` + `#sidebar-accounts` div | Label above list |

## .app-sidebar-section-label

| Property | Expected value | Check |
|---|---|---|
| Padding | `16px 8px 4px` (`--spacing-md` top, `--spacing-sm` sides, `--spacing-xs` bottom) | |
| Font size | `13px` (`--font-size-xs`) | Smallest permitted size |
| Font weight | `700` (bold) | |
| Letter spacing | `0.08em` | Visibly spaced caps |
| Text transform | `uppercase` | "ACCOUNTS" not "Accounts" |
| Color | `rgba(254,255,255,0.75)` | Muted white |
| Text | `Accounts` (renders as `ACCOUNTS`) | |

---

## Account items (.app-sidebar-item with rename span)

| Property | Expected value | Check |
|---|---|---|
| Same sizing/color as All Accounts row | Yes | Consistent |
| Active account | Pink left border, lighter bg, bold | Matches selected account |
| `.app-sidebar-item-label` span | `flex: 1`, truncates with ellipsis, `outline: none`, `border-radius: 3px`, `padding: 0 2px` | Long names truncate, no focus ring on span itself |
| Rename: click span | `contentEditable` activates, background becomes `rgba(255,255,255,0.15)` (`--color-bg-sidebar-focus`) | Editable highlight visible on dark bg |
| Rename: blur | Background clears, name saves if changed | No visual artifact left |
| Rename: blur empty | Reverts to original name | No empty item |

---

## .sidebar-add-btn (Add Account button)

| Property | Expected value | Check |
|---|---|---|
| Margin | `8px 12px 4px` | Inside sidebar, not flush to edge |
| Width | `calc(100% - 24px)` | Full-width minus margins |
| Padding | `6px 10px` | |
| Font size | `13px` (`--font-size-xs`) | |
| Font weight | `500` | |
| Color | `rgba(254,255,255,0.65)` | Dimmed white |
| Border | `1px dashed rgba(255,255,255,0.28)` | Dashed white border |
| Background | `none` | Transparent, not solid |
| Text | `+ Add Account` | Exact string |
| Hover | `background: rgba(255,255,255,0.07)`, full white text | Subtle highlight |
| Focus visible | `2px solid rgba(255,255,255,0.8)`, `1px` offset | Shared rule with `.sidebar-back` |
| Click | Opens browser `prompt()` for account name | Prompt appears |

---

## .sidebar-backdrop

| Property | Expected value | Check |
|---|---|---|
| Default | `display: none` | Not visible when sidebar closed |
| `.open` class | `display: block` | |
| Background | `rgba(0,0,0,0.35)` | Semi-transparent dark overlay |
| z-index | `49` | Below sidebar (`50`), above content |
| Coverage | `position: fixed; inset: 0` | Covers full viewport |
| Click | Closes sidebar, backdrop disappears | |

---

## Mobile (max-width: 768px)

| Check |
|---|
| Sidebar hidden by default (`display: none !important`) |
| Hamburger button visible in topbar |
| Sidebar slides in when `.open` class added (`transform: translateX(0)`) |
| Backdrop appears over content when sidebar open |
| Tapping backdrop closes sidebar |
| `.sidebar-add-btn` min-height becomes `44px` (touch target rule) |

---

## Interactions to run

1. Load `/accounts` — sidebar visible on desktop, hidden on mobile
2. Click "All Accounts" — becomes active (pink bar), portfolio loads
3. Select an account — account item becomes active, All Accounts deactivates
4. Click on account name span — edit mode activates (lighter bg), type new name, blur saves
5. Blur with empty input — original name restored
6. Click "+ Add Account" — prompt appears
7. Click "← Back to Hub" — navigates to hub page
8. Resize to <768px — sidebar hides, hamburger appears
9. Click hamburger — sidebar slides in, backdrop appears
10. Click backdrop — sidebar closes
