# Oliver UX Audit Backlog (US-O1..US-O7)

Audit date: 2026-04-24  
Scope: current `oliver-app` codebase only (`src/`, `functions/`, `supabase/`, `tests/`)

## Status Summary

| ID | Title | Status | Scope |
| --- | --- | --- | --- |
| US-O1 | Pills Are Dropdowns — Not Click-Through Selects | Partial | Oliver App |
| US-O2 | Actions Page — Owner & Project Pills Must Match People Pills | Partial | Oliver App |
| US-O3 | Topbar Account Name Placeholder Text | Superseded | Oliver App |
| US-O4 | All Open Text Inputs Must Mirror One Source of Truth | Partial | Cross-repo dependency (canonical reference is Tesknota) |
| US-O5 | Social Page — Friend's Collection View Must Have Full Functionality | Missing | Tesknota (not Oliver App) |
| US-O6 | Wishlist Item — Click Opens Edit Modal with Full Design Style | Missing | Tesknota (not Oliver App) |
| US-O7 | Mobile Responsiveness Must Inherit Web Design System | Partial | Oliver App |

## Key Evidence

- Existing routes are operations-focused (`/accounts`, `/hr`, `/sdr`, `/crm`, `/admin`, `/design-system`) in [src/app](/Users/oliver/projects/oliver-app/src/app).
- No `collection`, `wishlist`, `compliments`, or `social` app surfaces are present in current route tree.
- Items that reference wishlist/social/compliments UX from your fragrance domain are explicitly flagged as Tesknota-scoped, not Oliver implementation work.
- Pill/dropdown behavior in Accounts actions is implemented via [ActionsSection.tsx](/Users/oliver/projects/oliver-app/src/components/accounts/ActionsSection.tsx), [Picker.tsx](/Users/oliver/projects/oliver-app/src/components/accounts/Picker.tsx), and [Popover.tsx](/Users/oliver/projects/oliver-app/src/components/accounts/Popover.tsx).
- Global badge/input styling source is in [components-base.css](/Users/oliver/projects/oliver-app/src/app/components-base.css) and [components-interactive.css](/Users/oliver/projects/oliver-app/src/app/components-interactive.css).

## Execution Model

Each `US-O*` file in this folder is a separate backlog item so work can be picked independently and shipped incrementally.
