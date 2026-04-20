# tech-debt/archive

Point-in-time QA and audit reports that have been superseded by the current
authoritative docs in `src/tech-debt/`:

- `STATE.md`           — current state snapshot (read this first)
- `locked.md`          — settled invariants; do not regress
- `migration-audit.md` — living audit log
- `margin-scale.md`    — canonical top-margin scale
- `design-system.md`   — design system reference

Files here are preserved for historical context only. Do not rely on them for
current state — they were accurate at the moment they were written and have
drifted since. Use the git log if you need to understand the path that got us
to the present tree.

## Archived 2026-04-20

- `qa-accounts.md` / `qa-sdr.md` / `qa-hr.md` / `qa-crm.md` — per-module QA
  checklists from the Apr 18 pixel-accurate migration sweep. All findings
  either landed on staging or rolled into `locked.md` / `migration-audit.md`.
- `qa-filterbar.md`, `qa-accountview.md`, `qa-sections.md`, `qa-overview.md`,
  `qa-people.md`, `qa-sidebar.md`, `qa-portfolio.md`, `qa-topbar.md`
  — per-component visual QA reports from the same sweep. Superseded by the
  current codebase.
- `token-violations.md` — pre-migration raw-value inventory. All entries
  marked "TOKENS ADDED" and the CI scanner (`scripts/check-tokens.mjs`) now
  gates drift automatically.
