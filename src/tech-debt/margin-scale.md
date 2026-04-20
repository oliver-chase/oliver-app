# Top-Margin Scale (canonical)

Source of truth: Accounts page (`src/app/accounts.css`).
Applies to: Accounts, HR (Dashboard, Hiring, Reports, Directory, Onboarding, Inventory, Assignments, Tracks, Settings), SDR, CRM, Admin.

| Role | Token | Value | Use |
|---|---|---|---|
| Page top padding | `--spacing-20` | 20px | First header row `padding-top` (e.g. `.account-header-row`) |
| Page section gap | `--spacing-xl` | 32px | `margin-bottom` between top-level `.section` blocks |
| Card group gap | `--spacing-lg` | 24px | Vertical gap between card clusters / grouped cards |
| Sub-header gap | `--spacing-md` | 16px | Heading → content; action button after form |
| Tight micro gap | `--spacing-sm` | 8px | Sub-label, stat sub, filter label |
| Inline caption | `--spacing-xs` | 4px | Single-line caption under heading |
| Meta/dot gap | `--spacing-2xs` | 2px | Time-ago text, dash-row-sub, meta lines |

## Rules

1. Never use literal pixel values for top margins. Always use a token.
2. Never introduce an off-scale token for vertical gap (e.g. `--spacing-10`, `--spacing-12`, `--spacing-18`). Use the scale above.
3. Page-section separation uses `margin-bottom` on the section block (not `margin-top` on the next). Mirrors `.section{margin-bottom:var(--spacing-xl)}` in `accounts.css`.
4. Card groups inside a section use `margin-top:var(--spacing-lg)` on the follower card or `gap:var(--spacing-lg)` on the flex/grid container.
5. Sub-headers inside a card use `margin-bottom:var(--spacing-md)` on the heading (or `margin-top:var(--spacing-md)` on the content).
6. Do not use inline `style={{marginTop: ...}}` when a class already exists. If no class fits, extract a class into the page's CSS file — do not hard-code in component.

## Anchors

- Accounts: `.section`, `.account-header-row`, `.app-section-header`, `.overview-stat-sublabel`, `.pagination-row`
- HR: `.page-header`, `.page-subtitle`, `.stat-sub`, `.dash-card-sub`, `.section-sublabel`, `.completed-section`
