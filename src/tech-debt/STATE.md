# OliverApp — Current State

**Snapshot:** 2026-04-23, branch `staging`, working tree may contain in-progress
changes; read `git status --short --branch` before assuming a clean baseline.

A brand-new task session should read this file end-to-end before touching code.
It answers: *what's shipped, what's load-bearing, what can I change freely, what
must I not regress, and where does each thing live.*

When this file gets stale, update it in the same commit as the change.

---

## 1. Repo & deploys

| Thing                  | Value                                                    |
|------------------------|----------------------------------------------------------|
| GitHub                 | `oliver-chase/oliver-app`                                |
| Default work branch    | `staging` (never commit directly to `main`)              |
| Staging URL            | `staging.oliver-app.pages.dev`                           |
| Production URL         | `oliver-app.pages.dev`                                   |
| Hosting                | Cloudflare Pages (auto-deploys per branch)               |
| Backend                | Supabase — `tjaowjiccowofzisdfhr.supabase.co`            |
| Framework              | Next.js 15 App Router, TypeScript strict, static export  |
| Build output           | `out/` (CF Pages build: `npm run build`, output: `out`)  |
| Node                   | 20 (pinned in CI)                                        |
| Package manager        | npm                                                      |
| AI provider            | Anthropic — `claude-haiku-4-5-20251001` (never upgrade   |
|                        | without explicit approval — baked into functions/api)    |

### Branch workflow
```
# push to staging (always)
git add -A && git commit -m "…" && git push origin staging

# merge to production (only when user says "merge staging")
git checkout main && git merge staging --no-edit && git push origin main && git checkout staging
```

Never force-push. Never skip hooks. Never use `--no-verify`.

---

## 2. CI

`.github/workflows/ci.yml` runs on push + PR to `main`/`staging`:

1. `npm ci` (uses existing lock file)
2. `npm run typecheck` → `tsc --noEmit`
3. `npm run check-tokens` → `scripts/check-tokens.mjs`
4. `npm run build` with dummy `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`

`permissions: contents: read`. No untrusted-input sinks. All green as of
`12209aa`.

**Scanner rules (`scripts/check-tokens.mjs`)**

Walks `src/**/*.css` and fails on:

- Raw hex (`#abc`, `#aabbcc`, `#aabbccdd`)
- Raw `rgba(…)` / `rgb(…)`
- Raw `font-size: Npx`

Exemptions:

- `src/app/tokens.css` (the token definitions themselves)
- Any line containing `url("data:image/svg+xml"` — SVG data URIs can't read CSS vars
- CSS block `/* … */` and inline comments

If you need a raw value, add a semantic token to `tokens.css` first. Never
inline. 16 stylesheets scan clean currently.

There are still no unit tests. Local verification now includes:
`npm run typecheck` + `npm run check-tokens` + `npm run build` +
`npm run test:smoke` (Playwright starts/uses local app on port `3001`). Deep-pass procedure
is documented in `src/tech-debt/deep-qa-workflow.md`.

---

## 3. Directory map — what's where

### Routes (`src/app`)
| Route              | Page component                                | Notes                                       |
|--------------------|-----------------------------------------------|---------------------------------------------|
| `/`                | `src/app/page.tsx`                            | Hub: module cards + admin links             |
| `/accounts`        | `src/app/accounts/page.tsx` → `AccountsApp`   | Portfolio / AccountView / sections           |
| `/hr`              | `src/app/hr/page.tsx`                         | Dashboard / Hiring / Directory / Onboarding / Offboarding / Inventory / Assignments / Tracks / Reports / Settings |
| `/sdr`             | `src/app/sdr/page.tsx`                        | Overview / Prospects / Drafts / Outreach + Prospect detail panel |
| `/admin`           | `src/app/admin/page.tsx`                      | UserManager / TokenEditor / ComponentLibrary |
| `/design-system`   | `src/app/design-system/page.tsx`              | Living token reference + dead-token audit    |
| `/crm`             | `src/app/crm/page.tsx`                        | Coming-soon stub; registers Oliver config    |

### Per-module command registries (emerging pattern)
Each route now ships a `commands.ts` listing its `OliverAction` metadata (id,
label, group, hint) as `CommandMeta[]` — the page component composes these
with live `run` closures when registering its Oliver config. Keeps the action
catalogue declarative and easy to diff.

- `src/app/accounts/commands.ts` → `ACCOUNTS_COMMANDS` (add-account, import-transcript, view-org-chart, export-data, change-pw)
- `src/app/hr/commands.ts` → `HR_COMMANDS`
- Add analogous files when wiring new modules. Keep the metadata declarative;
  keep the `run` closures in the page component where they can capture state.

### Shared components
- `src/components/shared/OliverDock.tsx` — single chatbot mounted once in
  root layout. Renders trigger button + popup panel with messages, fuzzy
  suggestions, and optional upload zone (when `config.upload` is set).
  Exports `triggerOliverUpload()` so page actions can fire the file picker.
- `src/components/shared/OliverContext.tsx` — `OliverProvider` + `useRegisterOliver(config)`.
  Each route registers its own `OliverConfig` (pageLabel, placeholder, greeting,
  actions, quickConvos, contextPayload, upload, onChatRefresh).
- `src/components/shared/TokenOverridesLoader.tsx` — client effect mounted in
  root layout; calls `applyTokenOverrides()` so admin-saved token edits persist
  across page loads.
- `src/components/shared/AppModal.tsx` — `useAppModal()` hook returning
  `{ modal, showModal }`. Every HR / accounts dialog uses this.
- `src/components/shared/CustomPicker.tsx` — **the only dropdown**. Never use
  native `<select>` in the visible UI. Supports single + multi + searchable.
- `src/components/shared/ConfirmModal.tsx` / `DeleteConfirmModal.tsx` /
  `InlineForm.tsx` / `MessageToast.tsx` / `UndoToast.tsx` / `AppChip.tsx` /
  `AppBadge.tsx` / `SyncDot.tsx`.

### Hooks
- `src/hooks/useAccountsData.ts` — loads all accounts tables in parallel.
- `src/hooks/useSoftDelete.ts` — optimistic delete with 5s undo toast. Used
  by HR candidate / employee / device deletes and accounts notes.

### Libraries
| File                           | Purpose                                                          |
|--------------------------------|------------------------------------------------------------------|
| `src/lib/supabase.ts`          | Browser Supabase client (uses `NEXT_PUBLIC_*` env).              |
| `src/lib/db.ts`                | Accounts/engagements/stakeholders/etc. upsert + cascading delete. Every write destructures `error` and throws. |
| `src/lib/db-helpers.ts`        | `dbWrite(query, label)`, `dbWriteMulti(ops, label)`, `runWrites(setSync, ops, label)`. Use these for *every* supabase write. Never write `try { await supabase.from(x).op() } catch` — the catch never fires; supabase-js v2 doesn't throw. |
| `src/lib/users.ts`             | `app_users` CRUD. Throws on error.                               |
| `src/lib/tokens.ts`            | `listTokenOverrides`, `upsertToken`, `applyTokenOverrides`.      |
| `src/lib/fuzzy.ts`             | Lightweight fuzzy scorer — substring + Levenshtein, no deps. Used by OliverDock for command suggestions. |
| `src/lib/parsers/transcript-parser.ts` | Client-side `.txt` transcript → structured notes/decisions/actions. Produces same schema as `/api/parse-document`. |
| `src/lib/parsers/receipt-parser.ts`    | Client-side Best Buy text receipt → device record. |

### Cloudflare Pages Functions (`functions/api/`)
| Endpoint             | File                      | Purpose                             |
|----------------------|---------------------------|-------------------------------------|
| `/api/chat`          | `chat.js`                 | Haiku-backed chat per page context. |
| `/api/parse-document`| `parse-document.js`       | `.docx`/`.pdf` → structured schema. |
| `/api/parse-image`   | `parse-image.js`          | Image (vision) → org/people extract.|
| `/api/confirm-write` | `confirm-write.js`        | Conflict check + bulk Supabase write. `dryRun:true` for the check-only pass. |
| `/api/admin/keys`    | `admin/keys.js`           | `ai_config` CRUD (admin only).      |
| `_shared/ai.js`      | Helpers                   | `getAiConfig`, `callAnthropic`. Haiku only. Retries fallback key on 401/429. |

### Design system
- `src/app/tokens.css` — canonical values. *Every* color, size, space, radius,
  shadow, transition lives here.
- `src/app/components.css`, `components-base.css`, `components-layout.css`,
  `components-interactive.css` — shared component CSS (btn, pill, card,
  modal, sidebar).
- `src/app/globals.css` — resets + base.
- `src/app/chatbot.css` — OliverDock styles.
- Per-module styles: `accounts.css`, `hr/hr.css`, `sdr/sdr.css`, `crm/crm.css`,
  `design-system/ds.css`.

### Scripts
- `scripts/check-tokens.mjs` — CI token-drift scanner (see §2).

---

## 4. Locked invariants — read `src/tech-debt/locked.md` before changing these

Quick summary of what's locked. The full rationale is in `locked.md` — this
list is a pointer, not a replacement.

- **Top-margin scale** = 36px below topbar (`calc(spacing-md + spacing-20)`).
  Applied via `.page` padding-top and `.section-header` padding-top. Accounts
  achieves it through `.main` + `.account-header-row`. Do not re-tune per page.
- **HR page shell** = `.page.page--split > .section-header + .page-body` (or
  `+ .split-layout` for Hiring/Directory/Tracks which need a side-detail
  panel). Every HR route anchors identically. Dashboard/Onboarding/Offboarding/
  Inventory/Assignments/Reports/Settings use `.page-body` as the scroll container.
- **HR table standard** = `.table-wrap > table`. No flush variants.
- **No avatar initials** anywhere. No `.person-av` circles, no `ini()` helpers.
- **Hub `visibleModules` must be memoized** — inlining `.filter()` into render
  destabilises `oliverConfig` and loops `useRegisterOliver`. Keep the comment
  at the top of `src/app/page.tsx`.
- **OliverDock is mounted once** in `src/app/layout.tsx`. Each page registers
  via `useRegisterOliver`. Do not spawn additional chatbot components.
- **Retired components** — never re-introduce: `CommandPalette`,
  `HrAgentPanel`, `ChatbotPanel`, `ChatbotUpload`, `#cp-fab`.
- **Auth and users API** — MSAL/AuthGuard/login route are active again.
  `UserContext` is mounted and resolves the signed-in Azure user through
  `/api/users`, auto-upserting a default `app_users` row when that backend is
  available. Hub/Admin still need seeded `app_users` data for real permission
  and admin behavior.
- **JSX unicode-escape hygiene** — `\uXXXX` only appears inside JS string
  contexts (expressions, string literals), never as raw JSX text.
- **Design-system runtime color resolution** — `<ResolvedValue token fallback>`
  reads `getComputedStyle(document.documentElement).getPropertyValue(token)`.
  Never hand-edit swatch hex strings; edit `tokens.css`.
- **Supabase error surfacing** — all writes in `src/` use `dbWrite` /
  `runWrites` / explicit `{ error } = await` + throw. Dead `try/catch` pattern
  is a banned anti-pattern (catch never fires; supabase-js v2 doesn't throw).
- **CI gate** = typecheck + check-tokens + build. Don't bypass.

---

## 5. What's shipped (module status)

### Hub (`/`)
- Permission-aware module grid (bypass active until `app_users` seeded).
- Admin links visible when `isAdmin`; this now depends on `app_users` data resolving through `/api/users`.
- Registers Oliver config (navigation + quickConvos). No upload.

### Accounts (`/accounts`)
- Portfolio view with per-tier grouping + archived section.
- `AccountCard` has editable `client_company` via `contentEditable` + onBlur
  persistence; click + keydown stop propagation to keep card nav working.
- AccountView with Overview / People / Org Chart / Opportunities / Projects /
  Actions / Notes sections.
- Export PDF via `window.print()` HTML blob (ExportPanel.tsx).
- Upload pipeline on every account: `/api/parse-image`, `/api/parse-document`,
  `/api/confirm-write`. `.txt` uploads parsed client-side via
  `transcript-parser.ts` (no API call).
- OliverDock wired: `ACCOUNTS_COMMANDS` (new, `src/app/accounts/commands.ts`
  — add-account, import-transcript, view-org-chart, export-data, change-pw).
  `onChatRefresh` calls account `loadData`.

### HR (`/hr`)
- 10 sections all functional. Pages restructured (commit `5cfa270`) so every
  one uses the same `.section-header + .page-body`/`.split-layout` shell.
- Hiring Pipeline: kanban + table views, kanban-card click, inline +Add
  Candidate, receipt-upload flow (text Best Buy receipts parsed client-side
  via `receipt-parser.ts` → device creation). Promote-to-Hired lifts candidate
  to Employee + flips stage/status.
- Directory: table-only, inline add via `CustomPicker` for dept/manager.
  Soft-delete with 5s undo.
- Onboarding / Offboarding: single component `HrOnboarding` with `type` prop.
  Start Run modal, per-employee progress cards, task toggle.
- Inventory / Assignments / Tracks / Reports / Settings: standard.
- AI Intake modal on Hiring: `.xlsx`/`.xls` → CSV via dynamic `xlsx` import,
  POST to `/api/parse-document` as `text/plain`.
- `GlobalSearch` (HR-only) bound to `/` key in `hr/page.tsx`.
- StepFlowRunner + 11 quick-flows (cand/emp/device edit/delete/status/etc.).
  Flows correctly use `if (res.error) throw` pattern.
- OliverDock: 17 actions (search, ai-intake, 3 quick-adds, 11 quick-flows, +
  navigate via NAV array).

### SDR (`/sdr`)
- Overview / Prospects / Drafts / Outreach tabs.
- SdrProspectDetail panel shows status badge + "Queued N" when prospect has
  pending/approved approvalItems. Footer has refresh button gated by
  `refreshing` state.
- OliverDock: tab-switch actions + quickConvos about the pipeline.

### Admin (`/admin`)
- Renders under intentional bypass (`appUser !== null && !isAdmin` → null;
  null appUser → shows admin UI). Once real auth lands, redirect to `/` fires
  for genuine non-admins.
- **UserManager**: listUsers / updateUserRole / updateUserPermissions —
  all surface errors via inline red banner.
- **TokenEditor**: listTokenOverrides loads saved tokens on mount and applies
  them to CSS; `upsertToken` writes back; errors surface in red banner.
- **ComponentLibrary**: static reference.
- OliverDock: 3 tab-switch actions.

### Design System (`/design-system`)
- Anchor nav (sticky pill links) jumps to Colors / Typography / Spacing /
  Effects / Components / Layout.
- **Live dead-token audit card** at top — computes from `COLOR_USAGES` /
  `SPACING` / `LAYOUT_BARS` whether any token has zero tracked consumers.
  Green ✓ when clean. Click-to-expand when not.
- Color tokens: swatch click expands to "Used by" panel.
- Typography: expandable rows with specimen + usages.
- Spacing: expandable rows with usages.
- Layout: dimension diagrams with inline usages.
- Components: button states (default/compact/inline/**disabled**/hover-note).
  AppChip / AppBadge / SyncDot / CustomPicker / AppModal galleries.
- `ResolvedValue` component reads computed CSS values at runtime.

### CRM (`/crm`)
- Coming-soon stub. Sidebar + topbar + "Coming Soon" block.
- Registers Oliver config with backlog-facing greeting + quickConvos. No
  actions, no upload.

### OliverDock (shared)
- **Current shape (post-restructure):** single chat input at the bottom.
  Cmd/Ctrl+K toggles. `fabActions` = top 4 from `config.actions`. Live fuzzy
  suggestions (`src/lib/fuzzy.ts`) as user types — top 3 shown; Enter
  executes the top match or falls through to chat.
- Chat history kept in component state; posted to `/api/chat` with
  `pageContext` + `accountData` (from `contextPayload`). Model tag per reply.
- Upload zone appears when `config.upload` is set; `triggerOliverUpload()` is
  a module-level function page actions can call (e.g. `import-transcript`
  fires it). Parse → dryRun → commit flow preserved. `onChatRefresh` fires
  after successful commit so page data reloads without refresh.
- Export conversation = download `.txt` of the session.

---

## 6. Latest commits (newest first, last ~30)

| SHA       | Summary                                                           |
|-----------|-------------------------------------------------------------------|
| e645929   | feat: design-system state matrix + token editor live preview + remove MSAL |
| 256c1a4   | docs(tech-debt): STATE.md current-state snapshot + archive stale QA |
| 586d518   | feat(oliver): unified dock layout, per-page commands, fuzzy-to-chat fallback |
| 3926fe5   | fix: modal/dropdown global positioning spec                        |
| 12209aa   | docs(tech-debt): close P1 tokens + lock CI gate                    |
| 03754af   | fix(css): tokenize remaining raw font-size px; extend scanner      |
| 6b21e9c   | ci: add CSS token-drift scanner                                    |
| 0b61de0   | fix: surface read errors + wire token overrides app-wide           |
| bcc3944   | chore(oliver): hoist GROUP_ORDER to module scope                   |
| 35277ff   | ci: add GitHub Actions typecheck + build pipeline                  |
| 785884e   | fix: complete supabase silent-failure sweep across HR + lib        |
| 3cc7328   | fix(hr/quick-adds): surface supabase errors + revert optimistic    |
| 0741829   | fix(admin): surface supabase errors in user manager                |
| 1e1d4e4   | feat(design-system): button disabled state row + hover/focus note  |
| 572968e   | feat(design-system): live dead-token audit card                    |
| 34d97c0   | feat(upload): client-side parsers + per-page upload guidance       |
| 2c7bb75   | pill: remove pill--xs modifier, one pill type everywhere           |
| 9dcc565   | docs(design-system): refresh 3xs / 2xs usage entries post pill resize |
| 6575ff1   | feat(design-system): layout token usages inline in diagram card    |
| b28ad6e   | pill: font-size xs→3xs everywhere, bump padding across all pills   |
| 540e14b   | feat: CRM Oliver config + spacing token usages                     |
| d52c0fb   | feat(design-system): color token usages + clickable swatches       |
| a688ae2   | shrink pill font-size xs→3xs (2 steps smaller)                     |
| e66a482   | fix(hr/tracks): add section-header for shell parity                |
| 64ad7ab   | feat(oliver): restructure CommandMode — greeting at top            |
| 1aeff48   | fix(sdr+hr): apply split+section-header shell to SDR               |
| 2b5b38e   | feat(oliver): FAB quick-command row + per-page command isolation   |
| 3342f2b   | fix(layout): align Accounts/SDR/CRM top padding with HR (36px gap) |
| 5cfa270   | fix(hr): unify page shell — every HR page uses split + section-header + body |
| 5df4c34   | fix(hub+hr): unblock hub navigation + Directory/Onboarding standards |
| 7fd3cd7   | feat(design-system): Tesknota-style anchor nav + typography usages |
| 60ce530   | fix(hr+admin): top-margin parity + admin render regression + locked.md |
| c6f1f3b   | docs(tech-debt): log Apr 20 OliverDock + cleanup sweep             |
| b37e602   | chore(auth): remove dead MSAL + guard scaffolding                  |

---

## 7. Open work (pick from here)

### Product (needs product decision)
- **Live-chat backend**. OliverDock falls back to `mailto:support@v-two.com`.
  Pick a vendor (Intercom / Crisp / Plain) or build in-house. Wire into
  `OliverDock` empty state.
- **CRM module content**. `/crm` is a coming-soon stub. Schema, data layer,
  components all need design + build.
- **User permissions seed**. Supabase `app_users` DDL is written but not
  seeded. CF Access needs to be wired. When ready:
  1. Run `scripts/setup-app-users.sql` (if present) or write it.
  2. Seed at least one admin row and verify role/permission resolution.
  3. Configure CF Access at network edge if network-layer gating is required.
  4. Remove the remaining compatibility fallback once `/api/users` is guaranteed.

### Task #3 — Design-system Tesknota parity (complete as of e645929)
What's shipped: anchor nav, dead-token audit card, token usages for colors /
typography / spacing / layout, button disabled state row, hover/focus note,
non-button state matrix (inputs default/disabled/focus, CustomPicker disabled,
AppChip focus note, AppBadge hover note), token editor live preview (CSS var
applied on each keystroke, reverts on cancel, preview banner active while editing).

### Latent / minor
- MSAL packages and route guards are active again in the current tree; treat earlier auth-removal notes as historical only.
- Historical `qa-*.md` + `token-violations.md` already moved to
  `src/tech-debt/archive/` with a `README.md` explaining archival.
- No tests. All verification is TSC + scanner + browser dogfood on staging.
  When there's budget, set up Playwright E2E against the staging URL.

### Intentional deferrals / known-OK
- `UserProvider` is mounted, but compatibility fallback still exists when
  `/api/users` cannot resolve the signed-in user. Hub falls back to the
  unrestricted module view in that case.
- `--spacing-3` (3px) has 10+ consumers in `accounts.css` — design-system
  page's hand-curated usages array catalogues them.
- SDR `.sdr-stat-value` rounded 28→26 and `.sdr-detail-close` 18→17 in
  `03754af`. Tiny visual shift.

---

## 8. Working rules (from CLAUDE.md, excerpted)

- **RULE 1**: Plan first. Write a plan. Get approval. No exceptions for
  multi-file tasks.
- **RULE 2**: Migrations/feature changes = rewrite, not patch. Produce a
  deletion list before writing the replacement.
- **RULE 3**: Simplify after every change — drop duplication, dead imports,
  unused vars. Flatten nesting. Early returns.
- **RULE 4**: Consider edge cases, failure modes, and pattern fit during
  planning — not after code.
- **RULE 5**: Scope discipline. Flag out-of-scope issues; do not fix them.
- **RULE 6**: CI-first testing. CI owns verification. Don't `npm test`
  locally as a gate. Check `gh run list --limit 3` at session start.
- **RULE 7**: No planning phase by default. Execute directly unless asked
  otherwise. Do not load `superpowers:executing-plans` or
  `superpowers:brainstorming` skills unless explicitly asked.
- **Style**: no sycophantic openers/closers, no em-dashes, no smart quotes,
  no Unicode decoration. Plain hyphens + straight quotes. Code first,
  explanation only when non-obvious. Don't dump full files — targeted edits.
- **End of session**: commit + push + verify CI picked it up. The session is
  done when CI is running, not when code is written.

---

## 9. Documentation map

| File                                   | Purpose                                                            |
|----------------------------------------|--------------------------------------------------------------------|
| `src/tech-debt/STATE.md`               | **This file.** Read first.                                         |
| `src/tech-debt/locked.md`              | Settled invariants. Do not regress without a same-commit rationale.|
| `src/tech-debt/migration-audit.md`     | Living audit log. Historical detail on every major refactor.       |
| `src/tech-debt/margin-scale.md`        | Canonical top-margin scale (36px total below topbar).              |
| `src/tech-debt/design-system.md`       | Design system canonical spec.                                      |
| `src/tech-debt/archive/`               | Point-in-time QA reports, superseded. See archive/README.md.       |
| `CLAUDE.md`                            | Session operating rules.                                           |
| `AGENTS.md`                            | Next.js version compatibility reminder.                            |
| `MEMORY.md` (user's global)            | Cross-project memory — project status, brand, conventions.         |

---

## 10. Common gotchas

- **supabase-js v2 never throws.** Writes must use `dbWrite`/`runWrites` or
  an explicit `const { error } = await …; if (error) throw`. A bare
  `try { await supabase.from(x).insert(…) } catch` block is a bug — the
  catch will never fire and the green sync dot will lie.
- **Static export, no server runtime.** Next.js runs with `output: 'export'`.
  No server components with async/DB calls. CF Pages Functions in
  `functions/api/` handle anything that needs server execution.
- **Custom dropdown only.** `<select>` is never rendered to the user. Use
  `<CustomPicker>`. Filter bars, modals, forms, everywhere.
- **Nav icons, not emoji.** SVGs in `NAV` arrays. No emoji in UI unless
  user explicitly asks.
- **No nested template literals.** Use string concat or extracted vars.
- **No new CSS values.** If `tokens.css` doesn't have an exact value, pick
  the closest token and accept a ≤2px visual shift, or add a new semantic
  token to `tokens.css` first.
- **Keep `UserProvider` mounted.** Current Hub/Admin behavior depends on it. Compatibility fallback still exists while `app_users` seeding and `/api/users` rollout are incomplete.
- **Don't re-introduce retired components.** Section §4 lists them.

---

## 11. How to verify work

```sh
# From repo root
npm run typecheck       # tsc --noEmit
npm run check-tokens    # scripts/check-tokens.mjs
npm run build           # Next.js static export — prerenders 10 routes

# After push
gh run list --limit 3 --repo oliver-chase/oliver-app
gh run view <id> --log-failed   # if red
```

Browser dogfood: `staging.oliver-app.pages.dev`, sign in via CF Access when
live. Every code path needs a human check on staging — there are no tests.
