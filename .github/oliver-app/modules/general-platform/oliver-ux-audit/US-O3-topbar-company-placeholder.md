---
ID: US-O3
Title: Topbar Company Name Placeholder Semantics
Status: Superseded
Verified: false
Backdated: 2026-04-24
---

As an account strategy user  
I want account naming edits to happen in one clear location  
So topbar context remains stable and placeholder behavior is unambiguous.

Current state:
- Topbar now intentionally keeps stable context text (`Account Strategy`) in [Topbar.tsx](/Users/oliver/projects/oliver-app/src/components/layout/Topbar.tsx).
- Editable account short/long names are in page header fields in [AccountView.tsx](/Users/oliver/projects/oliver-app/src/components/accounts/AccountView.tsx).
- This request is superseded by [US-O10](/.github/oliver-app/modules/general-platform/oliver-requirements/US-O10-account-naming-source-of-truth.md).

Acceptance Criteria:
- [x] Topbar does not carry editable account-name placeholder behavior.
- [x] Account short and long names are editable in page-header fields.
- [x] Placeholder semantics for empty names are handled in page-header inputs, not the topbar.
- [x] Story is tracked as superseded to avoid duplicate implementation.
