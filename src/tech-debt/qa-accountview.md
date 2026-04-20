# QA: AccountView

Component: `src/components/accounts/AccountView.tsx`
CSS source: `accounts.css` lines 51-63
Run against: staging.oliver-app.pages.dev/accounts (select any account)

---

## Structure

- [ ] Outer wrapper: `<div id="account-content">` (no class)
- [ ] Header row: `<div class="account-header-row">`
- [ ] Name heading: `<div id="account-name-heading" class="account-name-heading" aria-label="Account name">` (read-only plain text)
- [ ] Client company (editable): `<div id="account-client-company" class="account-client-company" contenteditable data-placeholder="Company Name">`
- [ ] Last updated: `<div class="page-last-updated" id="page-last-updated">`
- [ ] Actions container: `<div class="account-header-actions" id="account-header-actions">`
- [ ] Archive button: `<button class="btn-acct-action">` (text: "Archive Account" or "Unarchive Account")
- [ ] Delete button: `<button class="btn-acct-action danger">Delete Account</button>`
- [ ] Section order: Overview → People → Actions → Opportunities → Projects → Notes

---

## .account-header-row

| Property | Expected value | Check |
|---|---|---|
| Display | `flex` | |
| Justify content | `space-between` | |
| Align items | `flex-start` | |
| Gap | `var(--spacing-md)` | |
| Margin bottom | `var(--spacing-12)` = `12px` | |
| Padding top | `var(--spacing-20)` = `20px` | |

---

## .account-name-heading (read-only)

| Property | Expected value | Check |
|---|---|---|
| Font size | `var(--font-size-2xl)` | |
| Font weight | `var(--font-weight-bold)` = `700` | |
| Color | `var(--text)` = `#1a1a1a` | |
| Padding | `var(--editable-padding)` (alignment with editable below) | |
| Margin bottom | `var(--spacing-6)` | |

---

## .account-header-actions

| Property | Expected value | Check |
|---|---|---|
| Display | `flex` | |
| Gap | `var(--spacing-6)` = `6px` | |
| Align items | `center` | |
| Padding top | `var(--spacing-6)` | |
| Flex shrink | `0` | |

---

## .btn-acct-action

| Property | Expected value | Check |
|---|---|---|
| Font size | `var(--font-size-xs)` | |
| Padding | `var(--spacing-xs) var(--spacing-10)` | |
| Border radius | `var(--radius)` | |
| Border | `1px solid var(--border)` | |
| Background | `none` | |
| Color | `var(--gray)` | |
| Cursor | `pointer` | |
| Hover background | `var(--surface2)` | |

### .btn-acct-action.danger

| Property | Expected value | Check |
|---|---|---|
| Color | `var(--red)` | |
| Border color | `var(--color-danger-border)` | |
| Hover background | `var(--color-danger-bg-hover)` | |

---

## .section

| Property | Expected value | Check |
|---|---|---|
| Margin bottom | `var(--spacing-xl)` or similar | |
| Present | 6 sections: overview, people, actions, opportunities, projects, notes | |

---

## .app-section-header (inside #overview)

| Property | Expected value | Check |
|---|---|---|
| Contains | `<div class="app-section-title">Overview</div>` | |

---

## Section IDs

| Section | id | Check |
|---|---|---|
| Overview | `#overview` | |
| People | `#people` | |
| Actions | `#actions` | |
| Opportunities | `#opportunities` | |
| Projects | `#projects` | |
| Notes | `#notes` | |

---

## Interactions

1. Account name heading is plain read-only text; clicking does nothing
2. Click client company field → cursor appears, text editable
3. When client_company empty → placeholder "Company Name" visible (gray italic)
4. Type new client_company + blur → saves (Supabase update)
5. Press Enter in client_company → blurs (saves)
6. Clear client_company + blur → reverts to previous (no empty save)
7. Click "Archive Account" → button text changes to "Unarchive Account", account status flips
8. Click "Unarchive Account" → reverts to Active, button text flips back
9. Click "Delete Account" → confirm dialog appears, on cancel: nothing; on confirm: navigates back to portfolio
10. All 6 section headings scroll-anchor correctly (topbar nav links work)
