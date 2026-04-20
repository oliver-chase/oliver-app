# Locked / Done

Items marked locked are settled. Future audits should skip them unless a regression is proven.
If re-opening, add a dated note under the entry with the reason.

---

## Locked 2026-04-20

### Top-margin scale canonical = 36px (`spacing-md` + `spacing-20`)
- Source: `src/tech-debt/margin-scale.md`.
- Applied in Accounts (`.main` + `.account-header-row`) and HR (`.page` padding-top + `.section-header` padding-top in `hr.css`).
- All HR pages (Dashboard, Hiring, Directory, Onboarding, Offboarding, Inventory, Assignments, Tracks, Reports, Settings) render through `.page` or `.page--split > .section-header` and inherit the 36px.
- Do not re-tune individual pages with inline `marginTop`.

### OliverDock unification (one chatbot, every page)
- Shell: `src/components/shared/OliverDock.tsx`.
- Context: `src/components/shared/OliverContext.tsx` with `OliverProvider` + `useRegisterOliver`.
- Mounted once in `src/app/layout.tsx`.
- Wired on Hub (`src/app/page.tsx`), HR (`src/app/hr/page.tsx`), Accounts (`src/components/accounts/AccountsApp.tsx`), SDR (`src/app/sdr/page.tsx`), Admin (`src/app/admin/page.tsx`).
- Upload pipeline (parse → dryRun → commit) preserved on pages that set `config.upload`.
- Post-write UI refresh: `config.onChatRefresh?.()` fires after commit (closes tech-debt #13 from Audit #2).
- ID collisions resolved via component-scoped `useRef(0)`.
- `Cmd/Ctrl+K` opens dock in command mode; `Esc` closes; `/` still drives HR `GlobalSearch` (separate surface, kept).

### Retired components (do not re-introduce)
- `src/components/hr/CommandPalette.tsx` — merged into OliverDock command mode.
- `src/components/hr/HrAgentPanel.tsx` — replaced by OliverDock.
- `src/components/accounts/ChatbotPanel.tsx` — replaced by OliverDock.
- `src/components/accounts/ChatbotUpload.tsx` logic — folded into OliverDock chat mode upload zone.
- `#cp-fab` FAB + related CSS — removed.

### Dead auth artifacts (intentional bypass confirmed)
- Deleted in commit `b37e602`: `AuthGuard`, `PageGuard`, `AuthContext`, `msalConfig`, `src/app/login/`.
- `UserContext.tsx` rewritten to default-only (no provider mounted). `useUser()` returns `{ appUser: null, isAdmin: false, hasPermission: ()=>false }`.
- Hub bypass: `src/app/page.tsx` uses `permissionsReady = appUser !== null` to show all modules when bypass is active.
- Admin bypass: `src/app/admin/page.tsx` renders when `appUser === null` OR `isAdmin === true`. Redirect only fires when a real non-admin user is loaded.
- To activate real permissions: mount `UserProvider` around `children` in `src/app/layout.tsx`, seed Supabase `app_users`, wire actual admin.

### JSX unicode-escape hygiene (Audit #1 issue #1)
- All `\uXXXX` usages now live in JS string contexts (JS string literals or JSX expression children `{ '…' }`), never raw JSX text or double-quoted attribute values.
- Grep `rg '\\\\u[0-9a-fA-F]{4}' --tsx` produces only valid JS-string occurrences.

### CommandPalette dispatchEvent race (Audit #1 issue #2)
- No longer reachable — CommandPalette deleted. Edit flows now run inline via `StepFlowRunner` + `requestEdit` page-level callback. No cross-page dispatch.

### Design-system runtime color resolution
- `src/app/design-system/page.tsx` uses `<ResolvedValue token={name} fallback={value} />` → reads `getComputedStyle(document.documentElement).getPropertyValue(token)`.
- Static fallback prevents SSR mismatch; computed value replaces on client.
- Do not hand-edit swatch hex strings to match tokens.css — they will drift. Edit tokens.css.

### SDR CSS token sweep
- Commit `475e16a` replaced remaining raw radius/spacing literals in `sdr.css` with tokens. No behaviour change.
- Any future raw px in `sdr.css` should be treated as a regression.

### Accounts portfolio editable `client_company`
- `src/components/accounts/PortfolioView.tsx` `AccountCard`: `contentEditable` on company row; `stopPropagation` on click + keydown to prevent card navigation; Enter blurs; `onBlur` persists via `onUpdateCompany` only when value actually changed.
- Placeholder rendered via `[data-placeholder]:empty::before` when company string is empty.

### SDR prospect detail queued-drafts badge + refresh
- `src/components/sdr/SdrProspectDetail.tsx`: `queuedCount = pQueued.length` where `pQueued = approvalItems where status in {pending, approved}`.
- Footer refresh button gated by `refreshing` state + optional `onRefresh` prop (set to SDR page `loadData`).

---

## Out of scope / separate tasks (flag only)
- Design-system page rebuild to Tesknota layout + live-usage data — tracked as task #3.
- `sdr.css` remaining minor token cases (if any surface).
- Live-chat backend (Intercom/Crisp). OliverDock currently falls back to `mailto:support@v-two.com` in no-match state.
- Mounting `UserProvider` and seeding `app_users` — unblocks real permissions; requires Supabase DDL + CF Access work.
