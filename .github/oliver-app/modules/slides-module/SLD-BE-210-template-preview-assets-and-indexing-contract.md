---
ID: SLD-BE-210
Title: Template Preview Assets and Indexing Contract
Status: Backlog
Verified: false
Backdated: 2026-04-25
---

As a platform maintainer
I want persisted template preview assets with queryable metadata
So template libraries can serve visual selection quickly and reliably

Acceptance Criteria:
- [ ] Template record contract includes preview asset reference and freshness metadata.
- [ ] Backend generates and stores preview snapshots on publish/update operations.
- [ ] Query responses include preview URLs/keys with cache-safe invalidation semantics.
- [ ] Visibility rules apply to preview assets consistently with template ACL.
- [ ] Missing/stale preview regeneration path is available for owner/admin actions.
