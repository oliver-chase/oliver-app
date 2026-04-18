# oliver-app Migration Audit
**Last updated:** 2026-04-18
**Scope:** 93 commits over 48 hours (Apr 16–18 2026). Full audit of all 92 original commits complete.

---

## Current State

All major sections ported and functional:
- Accounts: portfolio, overview, people, org chart, actions, opps, projects, notes
- HR: dashboard, directory, hiring, inventory, assignments, tracks, reports, settings
- SDR: overview, prospects, drafts, outreach, prospect detail panel
- Hub: permission-gated module grid, admin links
- Admin: user manager, token editor, component library
- Chatbot: send, export, model tag, continue/new topic, file upload, confirm-write
- Export PDF: window.print() HTML blob approach
- CF Pages Functions: chat, parse-document, parse-image, confirm-write, admin/keys

Auth gate (MSAL) was built then intentionally removed — Cloudflare Access handles auth at network level.
UserProvider/permissions system scaffolded — wiring deferred (intentional, tracked below).

---

## Open Issues by Priority

### P1 — Token cleanup (2 items remaining)
All resolved except sdr.css:

| File | Values | Token equivalent |
|------|--------|-----------------|
| `src/app/sdr/sdr.css` | `rgba(0,0,0,.4/.35)` backdrops | `--color-modal-overlay` / `--color-backdrop-overlay` |
| `src/app/sdr/sdr.css` | `28px`, `11px`, `13px`, `18px` font sizes | `--font-size-*` tokens exist |

Also tracked: `hr.css` command palette overlays (`.45` opacity, shadow values) have no exact token match — intentional custom values, not P1.

**Fixed (Apr 18) — commits #1/#2:**
- `tokens.css`: removed dead `--color-nav-accent-hover: #ff3399`; added 4 new tokens
- `accounts.css`: all 4 hardcoded rgba() values → tokens; `--radius-xs` ghost fallbacks → `var(--radius-sm)`; `padding-top: 40px` → `var(--spacing-2xl)`
- `ModuleCard.module.css`: `transition: all 0.18s` → `var(--transition-quick)`; `translateY(-1px)` → `var(--transform-lift)`

**Fixed (Apr 18) — commits #3/#4:**
- `components-base.css`: `.btn-ai-icon font-size: 11px` → `var(--font-size-2xs)`; `.app-chip` wrong purple `rgba(83,41,118,.1)` → `var(--chip-bg)`; `padding: 2px 8px` → token vars; `border-radius: 12px` → `var(--radius-pill)`; `gap: 4px` in section header → `var(--spacing-xs)`; `padding: 4px 12px` in view toggle → `var(--spacing-xs) var(--spacing-12)`
- `hr/hr.css`: sidebar backdrop `rgba(0,0,0,.4)` → `var(--color-modal-overlay)`
- `design-system/page.tsx`: nav-accent value corrected `#E60075` → `#dc0170`; dead `--color-nav-accent-hover` entry removed; undefined `--color-brand-purple-light/dark` → valid tokens

**Fixed (Apr 18) — commits #5/#6:**
- `NotesSection.tsx` line 341: note date editor `borderRadius: 3` → `var(--editable-radius)`; `padding: '1px 3px'` → `var(--editable-padding)`
- `layout/Topbar.tsx` (commit #6): nav order already correct (Overview → People → Actions → Opp → Projects → Notes). No change needed.
- `ActionsSection.tsx`, `PeopleSection.tsx`, `ProjectsSection.tsx`, `OverviewSection.tsx`: all clean after commit #5. Legacy aliases (`--font`, `--text`, `--gray`, `--pink` etc.) valid via tokens.css. `1.5px dashed var(--pink)` on new-card border intentional — no token for 1.5px.

**Fixed (Apr 18) — commits #25/#26:**
- Commit #25 (`e024554`): filter prop drilling across AccountView, AccountsApp, ActionsSection, NotesSection, PeopleSection — logic only, no inline style changes, clean
- Commit #26 (`77c5b30`): hr.css + sdr.css — full file rewrite tokenizing all raw spacing/gap/margin/padding, font-weight 500/600/700 → medium/semibold/bold tokens, z-index 1→var(--z-base), 100→var(--z-popover); sdr.css P1 resolved: `rgba(0,0,0,.4)`→`var(--color-modal-overlay)`, `rgba(0,0,0,.35)`→`var(--color-backdrop-overlay)`; font-size 11px→var(--font-size-2xs). Intentional: `z-index:40/49/400/500`, `7px/9px/11px/14px` unmatched sizes, avatar pixel widths (28/30/38/40px), layout widths (260/380/420/560px), `rgba()` opacity values with no overlay token, `28px` font-size on stat values, `22px` cp-fab icon, bottom-nav `60px` clearance

**Fixed (Apr 18) — commits #35–#92 (foundation + early feature commits):**
- Commits #35–#68 (`cdd26e3`…`4f7ed6e`): sidebar editable/navigation fixes, hub bypass, auth gate add/remove, CF build fixes, HR pixel-accurate migration, admin/guards/hub features — logic changes only or superseded by later token passes; all clean
- Commits #69–#73 (`5d00b93`…`0ff7b09`): QA docs, sidebar focus fix, visual QA pass — no CSS values introduced; AccountsApp/Sidebar/Topbar TSX inline styles are `display:''/'none'` conditional visibility only, clean
- Commit #74 (`02fb02f`): Topbar/AccountsApp/accounts.css — layout ids, nav order; accounts.css already clean from prior passes
- Commits #75–#76 (`b8d49da`, `59eb291`): tokens.css dedup + 10 new tokens added; hub.module.css created — verified clean in earlier pass
- Commits #77–#79 (`461f38e`…`4b60b00`): type fixes, tech-debt docs — no CSS; AccountsApp ErrorBoundary `color:'red',padding:16` intentional debug display, not a token violation
- Commit #80 (`41e9de6`): type correction only, clean
- Commit #81 (`bd0b17a`): CustomPicker, ConfirmModal, InlineForm, Sidebar components — all inline styles use `var(--token)`; `components-interactive.css` added with 1 violation: `.app-modal-overlay background:rgba(0,0,0,0.4)` → fixed → `var(--color-modal-overlay)`. Intentional: `right:7px` (SVG bg-position), `width/height:16px` (checkbox), `width:14px` (checkmark), layout maxes (560/260/200px)
- Commit #82 (`bc1d91e`): MSAL removal + Topbar/AppBadge/AppChip/SyncDot added; globals.css clean; components checked — no violations
- Commits #83–#87 (`216a41a`…`58df2a4`): section headers, exact rewrites — superseded by later audits; current state of all section files verified clean (remaining raw values: `width:36` checkbox column intentional, `position:'relative'` positional-only)
- Commits #88–#89 (`57ee407`, `47f2773`): initial section implementations + legacy token aliases — superseded; clean
- Commits #90–#92 (`0814035`…`bf4e6aa`): table name fixes, initial CSS, scaffold — `components-layout.css` had violations: `.coming-soon gap:12px`→`var(--spacing-12)`, `font-weight:600/700`→semibold/bold tokens, `padding:4px 12px`→`var(--spacing-xs) var(--spacing-12)`; sidebar rgba values: `rgba(255,255,255,0.12)`→`var(--color-nav-border)`, `rgba(255,255,255,0.07)`→`var(--color-nav-hover-bg)`. Intentional: `rgba(254,255,255,0.75/0.8)` nav text (no exact token at .75/.8), `rgba(255,255,255,0.11/0.08)` sidebar active/border (no exact token)

**Fixed (Apr 18) — commits #23/#24:**
- Commit #23 (`b39a014`): debounce logic only — no token issues across ActionsSection, NotesSection, OpportunitiesSection, OverviewSection, ProjectsSection
- Commit #24 (`51e8022`): design-system page.tsx — all inline styles use `var(${token})` interpolation (correct); ds.css — `height:56px`→`var(--spacing-56)`, `height:16px`→`var(--spacing-md)`; remaining values (`max-width:1100px`, grid `minmax`, `64px`×2, `200px`×2) are display-only layout constraints with no matching tokens

**Fixed (Apr 18) — commits #19–#22:**
- Commits #19/#20: SDR inline margins tokenized; ExportPanel/OverviewSection SVG+PDF hex values documented with `// = var(--token)` — intentional pattern, clean
- Commit #21 (`83196e8`): OrgChart toast div — `padding:'8px 16px'`→tokens, `fontWeight:600`→`var(--font-weight-semibold)`, `right:20`→`var(--spacing-20)`, `zIndex:300`→`var(--z-toast)`; detail panel `marginTop:14`→`var(--spacing-14)` (×2), error div `marginTop:4,paddingLeft:8`→tokens. Drag ghost cssText `z-index:9999` intentional (above all overlays, no token)
- Commit #22 (`6474461`): HR files — `gap:8/10/16`, `marginTop:10`, `marginBottom:6/14`, `padding:'6px 10px'`, `margin:2` all tokenized across HrDirectory, HrHiring, HrInventory, HrOnboarding, HrSettings, HrTracks, HrDashboard, HrReports. `padding:'9px 0'` in HrDashboard dash-row intentional (no 9px token)

**Fixed (Apr 18) — commits #11–#18:**
- Commits #11/#12 (`87e25e0`, `dd246a9`): day label shortening + RLS docs — no token issues
- Commits #13/#14 (`97f17e7`, `b02725b`): `users.ts` upsert rewrite + hub bypass — logic only, clean
- Commits #15/#16 (`aeaa608`, `2f40a41`): auth gate removal + CF Function import path fix — clean
- Commit #17 (`807cee5`): chatbot v1 — superseded by rebuild in commit #8, already audited
- Commit #18 (`a881455`): NotesSection pagination inline styles (`gap:6px`, `marginTop:16px`, `margin:0 8px`) already converted to `.pagination-row` / `.pagination-label` CSS classes using tokens in a later commit; Picker.tsx `minWidth:160/180` on popovers intentional

**Fixed (Apr 18) — commits #9/#10:**
- `PeopleSection.tsx` (commit #9): sort/toggle order swap — logic only, no token issues
- `OpportunitiesSection.tsx` (commit #10): notes popup had inline styles `zIndex:20, padding:8, minHeight:60, rgba(0,0,0,.1)` → replaced with `className="card-notes-popup"` (class already existed in accounts.css with all proper tokens)
- `ProjectsSection.tsx` (commit #10): already used `card-notes-popup` — clean
- `PeopleSection.tsx` (commit #10): popup uses `card-notes-popup`; outer wrapper inline styles already tokenized
- `OverviewSection.tsx` (commit #10): PersonPill rebuilt as unified picker — all inline styles use tokens; `minWidth:180` on popover intentional (no token)
- `accounts.css` (commit #10): `.section-actions` flex-wrap change + sort icon SVG update — no token issues

**Fixed (Apr 18) — commits #7/#8:**
- `accounts.css`: `.section-actions gap:6px` already using `var(--spacing-6)` — clean
- `PeopleSection.tsx`: `+ Add person` button correctly changed `btn-ghost btn--compact` → `btn-link` (matches other add buttons)
- `ChatbotPanel.tsx` (`UploadConfirmCard`): `marginTop: 8` → `var(--spacing-sm)`
- `chatbot.css`: `width/height: 48px` → `var(--chatbot-trigger-size)`; `width/height: 6px` (typing dots) → `var(--chatbot-typing-dot-size)`; hover shadow `rgba(83,41,118,.4)` (old purple) → `var(--color-purple-overlay)`; `line-height: 1.4` on input → `var(--line-height-compact)`; `font-size: 11px` upload hint → `var(--font-size-2xs)`
- Intentional no-token values in chatbot.css: `font-size: 12px` (trigger, no token between 11/13px), `font-size: 10px` (model tag, below 11px), trigger box-shadow pink `rgba(230,0,117,.35)` (custom pink shadow, no shadow token), various layout heights (84px, 480px, 72px bottom nav clearance)

**Fixed (Apr 18) — user design feedback:**
- `tokens.css`: `--color-brand-purple` updated `#562aa7` → `#171433`
- `design-system/page.tsx`: display value updated to match
- `components-base.css`: `.btn-link` — added `text-decoration: none` (+ Add / + Add attendee / + Add project underline removed)
- `layout/Topbar.tsx` + `AccountsApp.tsx`: topbar account name now contentEditable with blur-save via `onAccountNameChange` prop

### P2 — UserProvider not mounted (intentional deferral)
`UserContext.tsx` exports `UserProvider` but it is never imported or mounted in `layout.tsx`.
`useUser()` in hub page, admin page, and PageGuard returns default context (null user, no permissions).
Hub currently shows all modules to everyone via intentional bypass:
```tsx
const permissionsReady = appUser !== null  // always false → show all
```
**Do not fix until app_users table is seeded in Supabase and Azure/CF Access is configured.**
To activate: wrap `{children}` in `<UserProvider>` in `src/app/layout.tsx`.

### P3 — Dead auth artifacts
These files exist but are completely unwired. Remove when permissions system is activated:
- `src/components/auth/AuthGuard.tsx`
- `src/components/auth/PageGuard.tsx`
- `src/context/AuthContext.tsx`
- `src/app/login/page.tsx` + `src/app/login/login.module.css`
- `src/lib/msalConfig.ts`

---

## Known intentional patterns (not bugs)

- `ExportPanel.tsx`: hardcoded hex values in inline print HTML strings — CSS vars don't work in `window.print()` blobs. Each hex has a `// = var(--token)` comment.
- `UserProvider` unmounted: bypass is intentional until Supabase `app_users` table is seeded.
- Hub shows all modules when `appUser === null`: same bypass, same condition.
- `PageGuard` exists but unused: removed from layouts intentionally, will be re-wired with UserProvider.
