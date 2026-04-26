# Oliver App Module Context

Last verified against code: 2026-04-25.

This file is the fast context map for humans and coding agents. Module-level details live in `docs/modules/*.md`.

## Source-of-truth files
- Module metadata and hub visibility: `src/modules/registry.ts`
- Module-level access guard behavior: `src/modules/use-module-access.ts`
- Chatbot conversation scopes: `src/lib/chatbot-conversation-paths.ts`
- Permission type definitions: `src/types/auth.ts`
- Hub entrypoint: `src/app/page.tsx`
- Admin and design system workspaces: `src/app/admin/page.tsx`, `src/app/design-system/page.tsx`

## Module inventory
| Surface | Route | Permission key | Status | Hub visibility |
| --- | --- | --- | --- | --- |
| Hub | `/` | n/a | Active | n/a |
| Accounts | `/accounts` | `accounts` | Active | Visible |
| HR | `/hr` | `hr` | Active | Visible |
| SDR | `/sdr` | `sdr` | Active | Visible |
| Slides | `/slides` | `slides` | Active | Visible |
| Campaigns | `/campaigns` | `campaigns` | Active | Visible |
| Reviews | `/reviews` | `reviews` | Coming soon (admin-only while `comingSoon: true`) | Hidden by default |
| CRM | `/crm` | `crm` | Backlog/coming soon (`enabledByDefault: false`) | Hidden by default |
| Admin | `/admin` | role-based (`admin`) | Active | Not a hub module |
| Design System | `/design-system` | role-based (`admin`) | Active | Not a hub module |

## Runtime module toggles
- `NEXT_PUBLIC_DISABLED_MODULES` disables listed module IDs.
- `NEXT_PUBLIC_ENABLED_MODULES` force-enables listed module IDs, including modules disabled by default.
- `NEXT_PUBLIC_HUB_VISIBLE_MODULES` forces specific modules to appear in hub visibility checks.

## Where to read next
- Module index: `docs/modules/README.md`
- Individual module docs: `docs/modules/<module>.md`
- Agent execution rules: `docs/MODULE_INSTRUCTIONS.md`
