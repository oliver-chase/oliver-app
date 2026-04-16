# QA: AccountView

Component: `src/components/accounts/AccountView.tsx`
CSS source: `accounts.css` lines 195-250
Run against: staging.oliver-app.pages.dev/accounts (select any account)

---

## Structure

- [ ] Outer wrapper: `<div id="account-content">` (no class)
- [ ] Header row: `<div class="account-header-row">`
- [ ] Name heading: `<div id="account-name-heading" class="account-name-heading" contenteditable title="Click to edit account name">`
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
| Margin bottom | `var(--spacing-md)` = `16px` | |

---

## .account-name-heading

| Property | Expected value | Check |
|---|---|---|
| Font size | `var(--font-size-xl)` = `20px` | |
| Font weight | `var(--font-weight-bold)` = `700` | |
| Color | `var(--text)` = `#1a1a1a` | |
| Cursor | `text` | |
| Outline on focus | `none` | |
| Min width | `120px` | |

---

## .account-header-actions

| Property | Expected value | Check |
|---|---|---|
| Display | `flex` | |
| Gap | `var(--spacing-sm)` = `8px` | |
| Align items | `center` | |

---

## .btn-acct-action

| Property | Expected value | Check |
|---|---|---|
| Font size | `var(--font-size-sm)` = `14px` | |
| Padding | `6px 14px` | |
| Border radius | `var(--radius)` | |
| Border | `1px solid var(--border)` | |
| Background | `var(--surface)` | |
| Color | `var(--text)` | |
| Cursor | `pointer` | |
| Hover background | `var(--surface2)` | |

### .btn-acct-action.danger

| Property | Expected value | Check |
|---|---|---|
| Color | `var(--red)` = `#c0392b` | |
| Border color | `var(--red)` | |
| Hover background | `#fdecea` or similar red tint | |

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

1. Click account name → cursor appears, text editable
2. Type new name + blur → name saves (Supabase update), heading reflects new value
3. Press Enter in name → blurs (saves)
4. Clear name + blur → reverts to original (no empty save)
5. Click "Archive Account" → button text changes to "Unarchive Account", account status flips
6. Click "Unarchive Account" → reverts to Active, button text flips back
7. Click "Delete Account" → confirm dialog appears, on cancel: nothing; on confirm: navigates back to portfolio
8. All 6 section headings scroll-anchor correctly (topbar nav links work)
