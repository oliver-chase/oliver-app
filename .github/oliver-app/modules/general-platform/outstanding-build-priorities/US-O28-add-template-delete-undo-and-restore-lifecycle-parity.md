---
ID: US-O28
Title: Add Template Delete, Undo, and Restore Lifecycle Parity
Status: Done
Verified: true
Backdated: 2026-04-25
---

As a slide template manager
I want template deletion to support undo and restore flows
So accidental deletion does not cause data loss and behavior matches other modules

Acceptance Criteria:
- [x] Template delete is soft-delete first, with a time-bound inline undo affordance immediately after delete.
- [x] Deleted templates move to a recoverable state (trash/archive) with restore and permanent-delete actions.
- [x] Restore brings back template metadata, visibility, and collaborator links unless explicitly removed.
- [x] Permission rules for delete/restore/permanent-delete align with owner/admin governance rules.
- [x] Delete, undo, restore, and permanent-delete actions are all audited with actor and outcome fields.
- [x] UX copy and interaction pattern mirror existing destructive-action parity patterns used in Accounts.

Implementation Evidence (2026-04-26):
- Added `/api/slides` support for `resource=archived-templates`, `action=restore-template`, and `action=permanent-delete-template`; archive no longer drops collaborator rows, preserving restore parity.
- Added client persistence APIs for archived template listing and permanent delete, with local fallback parity (`listArchivedTemplates`, `permanentlyDeleteTemplate`).
- Added Slides Template Library UX for:
  - immediate post-archive undo window (10s),
  - archived template section with `Restore Template` and `Delete Permanently` actions,
  - destructive confirmation copy for permanent delete.
- Added/updated automated verification:
  - `tests/contracts/slides-api.contract.test.mjs`:
    - `restore-template returns normalized template payload and audit metadata`
    - `permanent-delete-template enforces archived prerequisite and writes audit trail`
  - `tests/e2e/slides-regression.spec.ts`:
    - expanded `SLD-FE-400 and SLD-BE-400 support visibility controls and template ownership governance`
      to cover archive undo, restore from archive, and permanent delete.
