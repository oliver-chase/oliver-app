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

### HR page shell = `.page.page--split > .section-header + .page-body`
- Every HR page (Dashboard, Hiring, Directory, Onboarding, Offboarding, Inventory, Assignments, Tracks, Reports, Settings) uses this exact structure.
- `.section-header` provides the visual band below the topbar (surface bg + border-bottom + 36px top padding) so every page anchors identically.
- `.page-body` is the scroll container (`flex:1; overflow-y:auto; padding:20px 24px 40px`).
- `.page` without `page--split` is no longer used in HR. Do not add new pages with the plain `.page` shell.
- Same-width filter-bar sits inside `.section-header` after `.page-header`.

### HR table standard = `.table-wrap > table`
- Single pattern across Directory, Hiring (table view), Assignments, Inventory row views.
- Inside `.split-list` (split pages) or direct child of `.page` (non-split). No flush variants, no inline padding overrides on `.split-list`.
- Rules: bordered, rounded (`--radius-lg`), 24px horizontal margin inherited from container. Headers use shared `th`/`th.sorted` + `.sort-arrow`. Cells use shared `td`.
- Any table not using `.table-wrap > table` is non-compliant and must be migrated.

### No avatar initials anywhere
- Removed `.person-av` (Directory) and `.onboard-av` (Onboarding) and `ini()` helpers.
- Tables and detail headers show name + sub-line only. No circles, no initial letters.
- Do not re-introduce on any page.

### Hub render loop fix
- `src/app/page.tsx` must memoize `visibleModules` with `useMemo`. Inlining the `.filter()` inside render creates a new array ref every render, which destabilises `oliverConfig` and causes `useRegisterOliver` to loop — Links stop firing, nav breaks.
- Keep comment block at top of file.

### OliverDock unification (one chatbot, every page)
- Shell: `src/components/shared/OliverDock.tsx`.
- Context: `src/components/shared/OliverContext.tsx` with `OliverProvider` + `useRegisterOliver`.
- Mounted once in `src/app/layout.tsx`.
- Wired on Hub (`src/app/page.tsx`), HR (`src/app/hr/page.tsx`), Accounts (`src/components/accounts/AccountsApp.tsx`), SDR (`src/app/sdr/page.tsx`), Admin (`src/app/admin/page.tsx`).
- Upload pipeline (parse → dryRun → commit) preserved on pages that set `config.upload`.
- Post-write UI refresh: `config.onChatRefresh?.()` fires after commit (closes tech-debt #13 from Audit #2).
- ID collisions resolved via component-scoped `useRef(0)`.
- `Cmd/Ctrl+K` opens dock in command mode; `Esc` closes; `/` still drives HR `GlobalSearch` (separate surface, kept).
- Chatbot shipping contract:
  - Every user-facing action ships with fuzzy aliases.
  - Every module route keeps a `conversationPath`.
  - Structured tasks collect required information in-chat via a flow before they are considered complete.
  - Redirects/popups are banned for chatbot actions unless the user is explicitly asking for profile/security settings.
  - Any frontend or user-flow change must update chatbot commands/flows/tests in the same change.

### Retired components (do not re-introduce)
- `src/components/hr/CommandPalette.tsx` — merged into OliverDock command mode.
- `src/components/hr/HrAgentPanel.tsx` — replaced by OliverDock.
- `src/components/accounts/ChatbotPanel.tsx` — replaced by OliverDock.
- `src/components/accounts/ChatbotUpload.tsx` logic — folded into OliverDock chat mode upload zone.
- `#cp-fab` FAB + related CSS — removed.

### Auth + permissions wiring (restored 2026-04-23)
- `AuthProvider`, `AuthGuard`, `msalConfig`, and `src/app/login/` are present and mounted again.
- `UserProvider` is mounted in `src/app/layout.tsx` and resolves the signed-in Azure user through `/api/users`.
- When `/api/users` is available, the provider auto-upserts a default `app_users` row keyed by Azure AD `oid` and enables real role/permission checks in Hub and Admin.
- When `/api/users` is unavailable, the hub falls back to the unrestricted module view for compatibility, and admin access remains config-dependent.
- Real admin behavior still requires at least one seeded admin row in `app_users`.

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
- Commit `03754af` tokenized the final two raw font-size:Npx (28→display, 18→lg). `check-tokens.mjs` now blocks any future raw px in CSS at CI time.

### CI gate
- `.github/workflows/ci.yml` runs on push + PR to main/staging: `npm ci → typecheck → check-tokens → build`.
- `scripts/check-tokens.mjs` walks src/**/*.css and fails on raw hex, rgba, or `font-size:Npx` outside tokens.css. Exemptions: tokens.css itself, SVG data URI lines, comments.
- Do not bypass CI. If a raw value is genuinely intentional, add a new semantic token to `tokens.css` and reference it — do not inline the value.

### Accounts portfolio editable `client_company`
- `src/components/accounts/PortfolioView.tsx` `AccountCard`: `contentEditable` on company row; `stopPropagation` on click + keydown to prevent card navigation; Enter blurs; `onBlur` persists via `onUpdateCompany` only when value actually changed.
- Placeholder rendered via `[data-placeholder]:empty::before` when company string is empty.

### SDR prospect detail queued-drafts badge + refresh
- `src/components/sdr/SdrProspectDetail.tsx`: `queuedCount = pQueued.length` where `pQueued = approvalItems where status in {pending, approved}`.
- Footer refresh button gated by `refreshing` state + optional `onRefresh` prop (set to SDR page `loadData`).

### Supabase error surfacing (complete)
- supabase-js v2 never throws on failure — it resolves with `{ error }`. All writes in `src/` now inspect `error` via one of these paths:
  - `src/lib/db-helpers.ts` `dbWrite(query, label)` for single writes.
  - `runWrites(setSyncState, ops, label)` for parallel HR batches (replaces the broken local `dbMulti` helper in 5 HR files).
  - Direct `if (res.error) throw` in flows + HrOnboarding (already had it).
  - `src/lib/db.ts` upsert/delete helpers destructure `error` and throw.
- Admin UserManager surfaces write errors via inline red `.errorBanner`.
- Do not reintroduce the `try { await supabase.from(x).op(...) } catch` pattern — the catch never fires.

---

## Out of scope / separate tasks (flag only)
- Design-system page rebuild to Tesknota layout + live-usage data — tracked as task #3.
- `sdr.css` remaining minor token cases (if any surface).
- Live-chat backend (Intercom/Crisp). OliverDock currently falls back to `mailto:support@v-two.com` in no-match state.
- Seeding `app_users` and validating `/api/users` in a live environment — required to prove real permissions/admin behavior end to end.
