# oliver-app Design System

**Canonical source of truth.** Every color, size, space, radius, shadow, and transition in the app MUST come from a token defined in `src/app/tokens.css`. No raw hex, rgba, or px values anywhere outside `tokens.css`.

Last audit: 2026-04-20. Verified zero raw values in all CSS files.

---

## 1. Files

| File | Role |
|------|------|
| `src/app/tokens.css` | Canonical token definitions. Only place where raw values live. |
| `src/app/globals.css` | Global resets + body styling. |
| `src/app/components-base.css` | Buttons, cards, chips, badges, forms, section headers. |
| `src/app/components-layout.css` | Sidebar, topbar, coming-soon. |
| `src/app/components-interactive.css` | Popovers, modals, pickers, inline forms. |
| `src/app/accounts.css` | Accounts page specifics. |
| `src/app/chatbot.css` | Oliver chatbot panel. |
| `src/app/hr/hr.css` | HR/Hiring specifics. |
| `src/app/sdr/sdr.css` | SDR specifics. |
| `src/app/crm/crm.css` | CRM specifics. |
| `src/app/design-system/ds.css` | Visual token reference page. |

Legacy aliases at the bottom of `tokens.css` (`--pink`, `--gray`, etc.) are retained for back-compat and redirect to semantic tokens. New code must use semantic tokens.

---

## 2. Color

### Brand
| Token | Value | Usage |
|---|---|---|
| `--color-white` | `#FEFFFF` | Inverted text, card surface |
| `--color-brand-purple` | `#171433` | Sidebar/topbar bg, secondary button, status badges |
| `--color-brand-pink` | `#dc0170` | Primary button, accents, links |
| `--color-brand-pink-light` | `#fce4f0` | View-toggle active bg, dashed-btn hover |

### Text
| Token | Value | Usage |
|---|---|---|
| `--color-text-primary` | `#1a1a1a` | Body text |
| `--color-text-secondary` | `#4a4a4e` | Labels, captions |
| `--color-text-placeholder` | `#4a4a4e` | Input placeholders |
| `--color-text-inverse` | `var(--color-white)` | Text on purple/pink |
| `--color-text-soft` | `#6b6a65` | HR-specific darker secondary |

### Backgrounds
| Token | Value | Usage |
|---|---|---|
| `--color-bg-page` | `#f5f5f6` | Body |
| `--color-bg-card` | `var(--color-white)` | Cards, inputs, popovers |
| `--color-bg-input` | `var(--color-white)` | Form fields |
| `--color-bg-hover` | `#f0f0f1` | Row/button hover |
| `--color-bg-overdue` | `rgba(220,1,112,.06)` | Overdue action rows |
| `--color-bg-required` | `rgba(220,1,112,.08)` | Required-field tint |

### Borders
| Token | Value | Usage |
|---|---|---|
| `--color-border` | `#e0e0e2` | Default card/input border |
| `--color-border-focus` | `var(--color-brand-pink)` | Focus ring |
| `--color-border-dashed` | `var(--color-brand-pink)` | Dashed CTA border |

### Overlays (modals, backdrops, tints)
`--color-modal-overlay`, `--color-backdrop-overlay`, `--color-cp-overlay`, `--color-danger-border`, `--color-danger-bg-hover`, `--color-pink-overlay`, `--color-pink-overlay-sm`, `--color-pink-overlay-30`, `--color-purple-overlay`, `--color-purple-overlay-legacy`, `--color-overlay-subtle`, `--color-overlay-border`.

### Navigation (dark sidebar + topbar)
`--color-nav-bg`, `--color-nav-bg-deep`, `--color-nav-border`, `--color-nav-divider`, `--color-nav-text`, `--color-nav-text-soft` (.75), `--color-nav-text-strong` (.8), `--color-nav-text-muted` (.7), `--color-nav-text-faint` (.4), `--color-nav-text-entry` (.65), `--color-nav-border-entry` (.28), `--color-nav-hover-bg`, `--color-nav-active-bg`, `--color-nav-accent`, `--color-nav-focus-ring`.

### Sentiment (people)
Pairs of `--color-sentiment-{kind}` and `--color-sentiment-{kind}-bg`. Kinds: `champion`, `supporter`, `neutral`, `detractor`, `unknown`.

### Status (opportunities, projects, actions)
Pairs of `--color-status-{kind}` and `--color-status-{kind}-bg`. Kinds: `active`, `complete`, `open`, `lost`, `identified`, `pursuing`, `won`, `success`.

### Account tier (left border)
`--color-tier-strategic` (green), `--color-tier-growth` (purple), `--color-tier-maintenance` (gray), `--color-tier-at-risk` (red).

### Semantic status colors
`--color-green` / `-light`, `--color-amber` / `-light`, `--color-red` / `-light`, `--color-blue` / `-light`.

**Rule:** never introduce a new color value. Reuse or request a palette extension via a token-only PR to `tokens.css`.

---

## 3. Typography

### Font families
| Token | Stack |
|---|---|
| `--font-family-base` | `'Aptos', system-ui, -apple-system, sans-serif` |
| `--font-family-mono` | `'DM Mono', ui-monospace, monospace` |

### Size scale
| Token | Value | Typical usage |
|---|---|---|
| `--font-size-3xs` | `9px` | Org chart axis ticks |
| `--font-size-2xs` | `11px` | Badges, chips, meta |
| `--font-size-xs` | `13px` | Labels, captions, caps headers |
| `--font-size-sm` | `14px` | Dense controls, HR body |
| `--font-size-base` | `15px` | Default body |
| `--font-size-md` | `16px` | — |
| `--font-size-lg` | `17px` | H3, section titles |
| `--font-size-xl` | `20px` | H2, overview stat values |
| `--font-size-2xl` | `24px` | H1 |
| `--font-size-display` | `26px` | Page title |
| `--font-size-hero-sm` | `36px` | Hub card title |
| `--font-size-hero` | `48px` | Landing display |

### Weights
`--font-weight-normal` 400, `--font-weight-medium` 500, `--font-weight-semibold` 600, `--font-weight-bold` 700.

### Line heights
`--line-height-tight` 1.25, `--line-height-compact` 1.4, `--line-height-base` 1.5, `--line-height-relaxed` 1.75.

### Letter spacing
`--letter-spacing-caps` 0.08em, `--letter-spacing-mid` 0.1em, `--letter-spacing-wide` 0.12em, `--letter-spacing-xwide` 0.28em.

### Scale mapping (h1..caption)
- h1 → `--font-size-2xl` / 700 / `--line-height-tight`
- h2 → `--font-size-xl` / 700
- h3 → `--font-size-lg` / 700
- body → `--font-size-base` / 400 / `--line-height-base`
- small body → `--font-size-sm` / 400
- caption → `--font-size-xs` / 500 / `--color-text-secondary`
- meta → `--font-size-2xs` / 500 / uppercase / `--letter-spacing-caps`

---

## 4. Spacing scale

| Token | Value | Semantic |
|---|---|---|
| `--spacing-2xs` | `2px` | Meta gap |
| `--spacing-3` | `3px` | Editable padding |
| `--spacing-xs` | `4px` | Inline caption, label→content |
| `--spacing-5` | `5px` | — |
| `--spacing-6` | `6px` | — |
| `--spacing-7` | `7px` | Sidebar item padding-y |
| `--spacing-sm` | `8px` | Tight micro gap |
| `--spacing-10` | `10px` | — |
| `--spacing-12` | `12px` | — |
| `--spacing-14` | `14px` | — |
| `--spacing-md` | `16px` | Sub-header gap, card padding |
| `--spacing-18` | `18px` | — |
| `--spacing-20` | `20px` | Page-top, topbar inset |
| `--spacing-lg` | `24px` | Card-group gap |
| `--spacing-xl` | `32px` | Section gap |
| `--spacing-2xl` | `48px` | — |
| `--spacing-56` | `56px` | DS swatch width |

**Rule:** for vertical rhythm use semantic names (`-xs`, `-sm`, `-md`, `-lg`, `-xl`, `-2xl`). Off-scale numeric tokens (`-6`/`-10`/`-12`/`-14`/`-18`) are for horizontal/control-internal padding only. See `margin-scale.md`.

---

## 5. Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `4px` | Editable inline chips |
| `--radius-md` | `8px` | Buttons, inputs |
| `--radius-lg` | `12px` | Cards, popovers, modals |
| `--radius-xl` | `16px` | Large panels |
| `--radius-pill` | `10px` | Chips, badges |
| `--radius-pill-lg` | `20px` | Large pill |
| `--radius-full` | `9999px` | Avatar, full-round badge |

Legacy alias: `--radius` → `--radius-md`.

---

## 6. Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,.06)` | Tab active state |
| `--shadow-card` | `0 2px 8px rgba(0,0,0,.06)` | Card hover |
| `--shadow-card-hover` | `0 4px 16px rgba(0,0,0,.10)` | Lifted card |
| `--shadow-popover` | `0 4px 12px rgba(0,0,0,.12)` | Dropdown popovers |
| `--shadow-dropdown` | `0 8px 24px rgba(0,0,0,.12)` | Global search dropdown |
| `--shadow-drawer` | `0 8px 32px rgba(0,0,0,.16)` | Chatbot panel |
| `--shadow-modal` | `0 4px 20px rgba(0,0,0,.15)` | Modals |
| `--shadow-btt` | `0 1px 4px rgba(0,0,0,.10)` | Back-to-top pill |
| `--shadow-sidebar-panel` | `4px 0 20px rgba(0,0,0,.15)` | Mobile sidebar overlay |
| `--shadow-cp-content` | `0 8px 40px rgba(0,0,0,.18)` | Command palette |
| `--shadow-chatbot-pink` | `0 4px 12px rgba(230,0,117,.35)` | Pink chatbot trigger |

---

## 7. Transitions / motion

| Token | Value | Usage |
|---|---|---|
| `--transition-quick` | `180ms ease` | Hover lifts |
| `--transition-fast` | `150ms ease` | Button/input focus |
| `--transition-base` | `250ms ease` | Panel open/close |
| `--transition-slow` | `300ms ease` | Sync dot |
| `--transform-lift` | `translateY(-1px)` | Hub card hover |

---

## 8. Z-index

`--z-base` 1, `--z-org-svg` 0, `--z-dropdown` 20, `--z-sidebar` 50, `--z-topbar` `calc(--z-sidebar - 10)` = 40, `--z-popover` 100, `--z-modal` 200, `--z-toast` 300. HR CP overlay `400`, drag ghost `9999` — layout-internal, no token.

---

## 9. Layout

`--sidebar-w` 220px, `--topbar-h` 50px, `--filterbar-h` 52px, `--touch-target` 44px.

---

## 10. Components

### 10.1 Buttons (`components-base.css`)
Base: `.btn` — 44px min-height, `--radius-md`, `--spacing-sm`/`--spacing-md` padding, `--font-weight-medium`.

| Class | Style | When |
|---|---|---|
| `.btn-primary` | Pink bg, white text | Default CTA |
| `.btn-secondary` | Purple bg, white text | Alternate CTA (topbar, save) |
| `.btn-ghost` | Transparent bg, gray border | Cancel, back, edit |
| `.btn-danger` | Red bg, white text | Destructive |
| `.btn-dashed` | Transparent + dashed pink border, pink text | `+ Add` card/row triggers |
| `.btn-link` | No bg/border, pink text, xs, no underline | Topbar text actions, `+ Add person` |
| `.btn-ai-icon` | 11px icon prefix, 0.85 opacity | AI-entry buttons |

Variants: `.btn--compact` (dense: 0 min-height, 7×14 padding, sm font). Applies to `.btn-ghost`, `.btn-dashed`.

Focus: 2px `--color-border-focus` outline via global rule.
Hover: `.btn-primary` darkens to purple. `.btn-dashed` backgrounds pink-light.

### 10.2 Inputs (`components-base.css`)
`.app-input`, `.app-textarea` — 44px min-height, `--spacing-sm`/`--spacing-md` padding, `--radius-md`, 1px `--color-border`, base font-size, primary text, `--color-text-placeholder` placeholder.

Focus: border → `--color-border-focus`, `0 0 0 2px` ring same color.
Textarea: min-height = 88px, vertical resize.

Checkboxes / radios: native `input[type=checkbox/radio]` — 16px, accent color via native browser (no custom skin).

### 10.3 Dropdowns / pickers (`components-interactive.css`)
Custom popover pattern, NEVER `<select>`. Trigger is `.picker-btn` inside a `.picker-wrap`. Popover uses `.app-popover`, items `.app-popover-item`, active state via keyboard uses `--color-bg-hover`, check mark via `.app-popover-item-check` (14px). Empty state `.app-popover-empty`.

### 10.4 Cards (`components-base.css` + `accounts.css`)
- `.app-card` — `--color-bg-card` bg, `--color-border`, `--radius-lg`, `--spacing-md` padding, hover adds `--shadow-card`.
- `.app-card-header`, `.app-card-body`, `.app-card-label`.
- Card anatomy (section cards): `.card-title`, `.card-meta-row`, `.card-meta-label`, `.card-section-label`, `.card-body-text`, `.card-action-link`, `.card-title-row`, `.card-status-wrap`.

### 10.5 Chips (sentiment)
`.app-chip` + kind class. Bg `--chip-bg` (default) or `--color-sentiment-{kind}-bg`. Padding `--chip-padding-y` / `--spacing-sm`, radius `--radius-pill`, xs font, medium weight.

### 10.6 Badges (status)
`.app-badge` + kind class. Padding 2px/10px, `--radius-full`, xs font, bold, uppercase. Pairs with `--color-status-*` tokens.

### 10.7 Section header
`.app-section-header` — flex column, xs gap, sm bottom margin.
`.app-section-title` — lg font, bold.
`.app-section-count` — sm font, secondary color, normal weight.

### 10.8 View toggle
`.app-view-toggle` — inline-flex, border, `--radius-md`, overflow hidden. `.app-view-toggle-btn` — xs font, medium weight, `--spacing-xs`/`--spacing-12` padding. Active = pink-light bg, purple text, bold.

### 10.9 Sidebar / topbar
Sidebar: `--sidebar-w`, purple bg, nav-text tokens. Items have `--touch-target` min-height, `--spacing-7`/`--spacing-md` padding, left border 2px transparent → pink on active, `--color-nav-active-bg` on active, `--color-nav-hover-bg` on hover.
Topbar: `--topbar-h` 50px, `--spacing-20` inset, `--spacing-10` gap, `--z-topbar`.

### 10.10 Modal
`.app-modal-overlay` — `--color-modal-overlay` bg, `--z-modal`.
`.app-modal` — `--color-bg-card`, `--radius-lg`, `--shadow-modal`.

### 10.11 Chatbot (`chatbot.css`)
Trigger: 48px round button, `--shadow-chatbot-pink`, pink bg → purple on hover (scale 1.08).
Panel: 360px × 480px, bottom-right, `--shadow-drawer`, `--radius-lg`.

### 10.12 Account tier left border
Portfolio cards use `--color-tier-*` as 3px left border.

---

## 11. Intentional raw values (documented)

These are the ONLY places raw values appear outside tokens.css, and each is justified:

1. **`ExportPanel.tsx`** (PDF print blob) — CSS vars don't resolve inside `window.print()` HTML strings. Each hex has inline `// = var(--token)` comment.
2. **`OverviewSection.tsx`** — SVG `setAttribute('fill', '#...')` — SVG DOM attributes don't interpolate CSS vars. Commented with var reference.
3. **`design-system/page.tsx`** — displays token values as data.
4. **`login/page.tsx`** — Microsoft logo (fixed brand colors).
5. **`OrgChart.tsx`** drag-ghost inline z-index `9999` — must sit above all app overlays, no token.
6. **HR CP overlay** `z-index:400`, `padding-top:80px`, `max-height:calc(100vh - 160px)` — layout-internal magic numbers, not design tokens.
7. **tokens.css** itself — raw values permitted (the definitions).

---

## 12. Governance

1. **No new values.** Changes to a color, spacing, or shadow value must be a one-line PR to `tokens.css` only.
2. **No raw hex/rgba/px in CSS.** Use `var(--token)`. Automated grep gate in CI (TODO).
3. **No inline styles in TSX unless:** (a) conditional `display: none/''`, (b) dynamic computed value with `var(--token)` interpolation, (c) intentional entry in §11.
4. **Legacy aliases** (`--pink`, `--gray`, `--font`, etc.) are retained — do not reference in new code, prefer semantic tokens.
5. **Visual QA.** `/design-system` page renders every token. Review after any token change.
6. **CSS files reference only.** New component CSS lives in `components-base.css` / `components-interactive.css` / `components-layout.css` first; page-specific only when truly page-specific.
