---
ID: US-O3
Title: Topbar Account Name Placeholder Text
Status: Missing
Verified: false
Backdated: 2026-04-24
---

Current state:
- Topbar fallback title is `'Account'` / `'All Accounts'` in [Topbar.tsx](/Users/oliver/projects/oliver-app/src/components/layout/Topbar.tsx).
- `Company Name` placeholder exists in AccountView editable field, not topbar, in [AccountView.tsx](/Users/oliver/projects/oliver-app/src/components/accounts/AccountView.tsx).

Gap:
- Topbar does not show `Company Name` placeholder behavior when account name is empty/unset.
- Topbar editable label is not aligned to placeholder semantics requested.

Backlog acceptance:
- Implement explicit `Company Name` placeholder behavior in topbar account field when empty.
- Align typography/color treatment to canonical placeholder style tokens.

