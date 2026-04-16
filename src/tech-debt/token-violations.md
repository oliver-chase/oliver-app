# Token Violations

Pre-existing violations found during component migration. Do not fix inline —
add the missing tokens first, then update the CSS. No value changes, tokenize only.

---

## components-base.css — AppChip (.app-chip)
Source: components-base.css:226
Violations found during AppChip migration — these are pre-existing in the source, not introduced:
- padding: 2px 8px — 2px has no spacing token (closest: --spacing-xs is 4px)
- background: rgba(83,41,118,0.1) — not in tokens (closest is --color-status-active-bg: #ece3f3 but value differs)
- border-radius: 12px — should be var(--radius-lg) which is also 12px — safe to alias, not a value change

Action needed before ship: add --chip-bg: rgba(83,41,118,0.1) and --chip-padding-y: 2px to tokens.css,
then update components-base.css. Do not change values, only tokenize them.

---

## accounts.css — SyncDot (.sync-dot)
Source: accounts/accounts.css:20–23
Violations found during SyncDot migration — pre-existing:
- width:7px; height:7px — should be var(--sync-dot-size) (token already exists at 7px)
- background:var(--gray-light) — legacy alias; semantic equivalent: var(--color-text-placeholder)
- transition:.3s — 300ms has no token (--transition-base=250ms, --transition-fast=150ms are closest)
- .syncing uses var(--amber) — legacy alias; semantic: var(--color-amber)
- .ok uses var(--green) — legacy alias; semantic: var(--color-green)
- .err uses var(--red) — legacy alias; semantic: var(--color-red)

Action needed before ship:
- Add --transition-slow: 300ms ease to tokens.css (or accept --transition-base as close enough)
- Update accounts.css: replace hardcoded 7px with var(--sync-dot-size), replace legacy color aliases
  with semantic equivalents, replace .3s with token. No value changes except transition if aligned.

---

## tokens.css — missing semantic color names for status states
During SyncDot migration, accounts.css uses var(--amber), var(--green), var(--red).
Semantic equivalents referenced in violation log do not currently exist as
--color-amber, --color-green, --color-red in tokens.css.
The values exist under --amber: #b86c0a, --green: #1a9c6e, --red: #c0392b (legacy names).
Action: add semantic aliases to tokens.css:
  --color-amber: var(--amber);
  --color-green: var(--green);
  --color-red:   var(--red);
Also add --transition-slow: 300ms ease for the .sync-dot transition value.

---

## accounts.css — Topbar (.topbar, .topbar-nav)
Source: accounts/accounts.css:9–19
Violations found during Topbar migration — pre-existing:
- padding: 0 20px — 20px not tokenized (between --spacing-md:16px and --spacing-lg:24px)
- gap: 10px on .topbar — not tokenized (between --spacing-sm:8px and --spacing-md:16px)
- z-index: 40 — no token; workaround in component: calc(var(--z-sidebar) - 10) = 40
- margin-left: 6px on .topbar-nav — not tokenized
- transition: .12s on .topbar-nav a — not tokenized (--transition-fast is 150ms)
- padding: 5px 10px on #btn-export-plan — not tokenized

Action needed before ship:
- Add --spacing-5: 20px and --spacing-2h: 10px (or similar) to fill gaps in scale, OR
  accept nearest tokens (--spacing-lg / --spacing-sm) if pixel-perfect match is not required
- Add --z-topbar: calc(var(--z-sidebar) - 10) to tokens.css
- Add --transition-quick: 120ms ease or alias .12s to --transition-fast in accounts.css

---

## Topbar.tsx — deferred props
- accountName is rendered as plain text; source makes it contentEditable.
  Add onAccountNameChange: (name: string) => void prop when porting that feature.
- engagementName not yet wired; add engagementName?: string prop when
  engagement support is ported.

---

## components-layout.css — Sidebar
Source: components-layout.css:10–90

- .app-sidebar-nav gap: 2px — not tokenized (no --spacing-2xs exists)
  Action: add --spacing-2xs: 2px to tokens.css
- .app-sidebar-item padding: 7px var(--spacing-md) — 7px not tokenized
  Action: add --spacing-7: 7px to tokens.css or accept --spacing-sm (8px) as close enough
- .app-sidebar-section-label letter-spacing: 0.08em — not tokenized
  Action: add --letter-spacing-caps: 0.08em to tokens.css

## accounts.css — sidebar-add-btn
- margin: 8px 12px 4px — 12px and 4px not tokenized as a combined shorthand
  (8px = --spacing-sm, 12px = no token, 4px = --spacing-xs)
  Action: add --spacing-3: 12px to tokens.css or use calc()

---

## pickers.js (source) — inline styles throughout
Source: accounts/js/pickers.js — all panel/item/checkmark styles are inline style.cssText
These have been tokenized into components-interactive.css in the oliver-app:
- .picker-wrap { position:relative; display:inline-block; width:100% } — added
- .app-popover-item.active { background: var(--color-bg-hover) } — added (keyboard hover)
- .app-popover-item-check { width:14px; ... } — added
- .app-popover-empty { ... } — added
Remaining inline violations in source (pickers.js) not relevant to Next.js component.

## pickers.js (source) — group heading inline styles
Source: pickers.js:145 — group header row uses inline style.cssText with font-size, color, etc.
Not yet tokenized because CustomPicker.tsx does not yet support optgroup options.
Action: add --font-size-xs/color-text-secondary/spacing classes and implement group headers
when optgroup support is needed.

---

## CustomPicker.tsx — deferred features
- Optgroup / grouped options not implemented. Source pickers.js supports
  { group: string; items: Array<{ value: string; label: string }> } shape.
  Used in: People section (reports-to picker groups by org), Notes section
  (attendee picker). Add OptionsGroup type and render a section label row
  before grouped items before migrating those sections.
- Multi-select implemented from spec — verify against source behavior in
  Overview (team members), People (engagement pills), Actions (owner) before
  shipping those sections.

---

## API routes — not ported (ship blocker for chatbot section)
Source has 5 Cloudflare Pages Functions with no Next.js equivalent yet.
Create as src/app/api/*/route.ts before shipping the chatbot panel:
- POST /api/chat             → chatbot panel
- POST /api/parse-document   → chatbot file upload
- POST /api/parse-image      → chatbot image upload
- POST /api/confirm-write    → chatbot data write confirmation
- GET/POST/PATCH/DELETE /api/admin/keys → admin key management panel
Note: Next.js API routes with output: 'export' are not supported on static
export. These must use Next.js middleware or be served as Cloudflare Pages
Functions placed in /functions/api/ (same as source). Verify CF Pages
Functions work alongside Next.js static output before implementing.

---

## db.ts — write semantics differ from source (verify before ship)
Source (ops-dashboard/shared/db.js): DELETE-all + INSERT-all per table on save.
oliver-app (src/lib/db.ts): upsert per record.
Risk: upsert leaves stale rows if a record is deleted locally but the delete
is not synced before an upsert of another record in the same table.
Action needed before ship:
- Verify upsert produces identical results for all 8 tables under normal flow.
- Test soft-delete flow: delete a record, refresh, confirm it does not reappear.
- If stale-row risk is confirmed, switch to deleteRecord() + upsert or add
  a server-side sync that mirrors the source DELETE-all + INSERT-all pattern.

---

## HubPage (src/app/page.tsx) — untokenized transparency values
- rgba(255,255,255,.06) — card badge background overlay, no token exists
- rgba(255,255,255,.18) — card hover border overlay, no token exists
Action: add to tokens.css:
  --color-overlay-subtle:  rgba(255,255,255,.06);
  --color-overlay-border:  rgba(255,255,255,.18);
Then update page.tsx to use the tokens.
