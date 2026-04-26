---
ID: US-O28
Title: Add Template Delete, Undo, and Restore Lifecycle Parity
Status: Not Started
Verified: false
Backdated: 2026-04-25
---

As a slide template manager
I want template deletion to support undo and restore flows
So accidental deletion does not cause data loss and behavior matches other modules

Acceptance Criteria:
- [ ] Template delete is soft-delete first, with a time-bound inline undo affordance immediately after delete.
- [ ] Deleted templates move to a recoverable state (trash/archive) with restore and permanent-delete actions.
- [ ] Restore brings back template metadata, visibility, and collaborator links unless explicitly removed.
- [ ] Permission rules for delete/restore/permanent-delete align with owner/admin governance rules.
- [ ] Delete, undo, restore, and permanent-delete actions are all audited with actor and outcome fields.
- [ ] UX copy and interaction pattern mirror existing destructive-action parity patterns used in Accounts.

