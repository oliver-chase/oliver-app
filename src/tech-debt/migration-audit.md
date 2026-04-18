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

### P1 — Token cleanup (3 items remaining)
Accounts.css and ModuleCard.module.css fully resolved (Apr 18). Remaining:

| File | Values | Token equivalent |
|------|--------|-----------------|
| `src/app/sdr/sdr.css` | `rgba(0,0,0,.4/.35)` backdrops | `--color-modal-overlay` / `--color-backdrop-overlay` |
| `src/app/sdr/sdr.css` | `28px`, `11px`, `13px`, `18px` font sizes | `--font-size-*` tokens exist |

**Fixed (Apr 18):**
- `tokens.css`: removed dead `--color-nav-accent-hover: #ff3399` (never referenced anywhere)
- `tokens.css`: added `--color-nav-focus-ring`, `--color-backdrop-overlay`, `--color-danger-border`, `--color-danger-bg-hover`
- `accounts.css`: all 4 hardcoded rgba() values replaced with new tokens
- `ModuleCard.module.css`: `transition: all 0.18s` → `var(--transition-quick)`; `translateY(-1px)` → `var(--transform-lift)`

### P1 — Design system page data bug
`src/app/design-system/page.tsx` line 123: hardcodes `value: '#E60075'` for `--color-nav-accent`.
Actual resolved value is `#dc0170` (via `var(--color-brand-pink)`). Display is wrong.

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
