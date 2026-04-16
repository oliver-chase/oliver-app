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
