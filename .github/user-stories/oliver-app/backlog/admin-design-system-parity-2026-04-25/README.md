# Oliver Admin + Design System Parity Backlog (2026-04-25)

Scope: `oliver-app` implementation with parity reference from `tesknota`  
Primary reference: [tesknota admin design page](</Users/oliver/projects/tesknota/app/(app)/admin/design/page.tsx>)

## Validated Existing Coverage

- `US-OLV-011`, `US-OLV-012`, and `US-OLV-017` cover baseline admin access and hub session controls.
- `US-OLV-099`, `US-OLV-101`, and `US-OLV-103` cover baseline token editing, design-system browsing, and component previews.
- `US-OLV-122`, `US-OLV-123`, `US-OLV-124`, and `US-OLV-125` cover broad QA and consistency expectations.
- Those stories do not capture the newer requirement that Admin/Design System navigation, layout behavior, sticky controls, edit mode, and parity structure must be reworked together.

## Net-New / Changed Direction Stories

| ID | Title | Status | Refines / Extends |
| --- | --- | --- | --- |
| US-O18 | Hub-Only Admin Entry with Correct Placement and Styling | Not Started | Refines `US-OLV-011`, `US-OLV-017` |
| US-O19 | Make Design System an Admin-Native Workspace | Not Started | Refines `US-OLV-012`, `US-OLV-101`, `US-OLV-103` |
| US-O20 | Mirror Tesknota Design System Dynamic Structure and Inventories | Not Started | Extends `US-OLV-101`, `US-OLV-103` |
| US-O21 | Sticky Compact Control Bars and Scroll Return for Admin and Design System | Not Started | Extends `US-OLV-123`, `US-OLV-124`, `US-OLV-125` |
| US-O22 | Restore Design System Edit Mode and Backend Wiring Parity | Not Started | Extends `US-OLV-099`, `US-OLV-100`, `US-OLV-121` |
| US-O23 | Standardize Admin and Design System Shell Components and Information Order | Not Started | Extends `US-OLV-123`, `US-OLV-125` |
| US-O24 | Cover Admin and Design System Chatbot, Click Paths, and E2E Accuracy | Not Started | Extends `US-OLV-122`, `US-OLV-110`, `US-OLV-111` |

## Requirement To Story Traceability

| Requirement Theme | Story Coverage |
| --- | --- |
| Remove Admin and Design System links from hub right rail; right rail returns to email + Sign out only | `US-O18` |
| Show Admin only on the hub, only for admins, on the left side, using the canonical right-rail button styling | `US-O18` |
| Admin button must not persist across module pages | `US-O18` |
| Design System must live within Admin navigation instead of as a separate hub shortcut | `US-O19` |
| Admin must stop mixing Design System-specific controls into unrelated admin surfaces | `US-O19`, `US-O23` |
| Design System should mirror Tesknota dynamic data, structure, and information architecture | `US-O20` |
| Top filter bars should persist while scrolling, top spacing should be tighter, and a safe return-to-top control is needed | `US-O21` |
| Oliver needs Tesknota-style edit functionality and backend persistence for design-system work | `US-O22` |
| Shared topbar/components/order/dropdown grouping should match the rest of the product where possible | `US-O23` |
| Chatbot, click paths, data wiring, and every admin/design-system e2e flow must be verified | `US-O24` |

## Current-State Evidence Anchors

- Hub session rail currently renders `Design System` and `Admin` on the right beside `Sign out`: [src/app/page.tsx](/Users/oliver/projects/oliver-app/src/app/page.tsx:47)
- Global admin chip is mounted at the app root and therefore persists across module pages: [src/app/layout.tsx](/Users/oliver/projects/oliver-app/src/app/layout.tsx:24), [src/components/admin/AdminEntryButton.tsx](/Users/oliver/projects/oliver-app/src/components/admin/AdminEntryButton.tsx:8)
- Admin currently exposes `Users`, `Design Tokens`, `Components`, plus an `Open Design System` link instead of one integrated admin IA: [src/app/admin/page.tsx](/Users/oliver/projects/oliver-app/src/app/admin/page.tsx:96)
- Design System currently lives as a separate standalone page with its own anchor nav and reference layout: [src/app/design-system/page.tsx](/Users/oliver/projects/oliver-app/src/app/design-system/page.tsx:534)
- Admin nav inventory already models `Admin Dashboard` and `Design System` as related destinations, which can be consolidated instead of duplicated in multiple shells: [src/modules/admin-nav.ts](/Users/oliver/projects/oliver-app/src/modules/admin-nav.ts:8)
- Tesknota parity target already includes sticky top controls, reference/edit mode, dynamic gallery sections, and runtime token patch wiring: [tesknota admin design page](</Users/oliver/projects/tesknota/app/(app)/admin/design/page.tsx>)

## Validation

- Story docs must pass `npm run lint` (`check-stories`) after edits.
- Implementation work from this bundle should not be considered done until privileged click paths and chatbot flows are covered by explicit browser tests.
