# oliver-app Migration Audit
**Last updated:** 2026-04-18
**Scope:** 93 commits over 48 hours (Apr 16–18 2026). Full 50-commit deep audit of most recent commits completed.

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
