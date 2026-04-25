---
ID: SLD-BE-430
Title: Long-Range Audit Export Jobs and Presets Contract
Status: Backlog
Verified: false
Backdated: 2026-04-25
---

As a platform maintainer
I want backend support for saved audit presets and long-range export jobs
So large compliance queries can run asynchronously without blocking UI workflows

Acceptance Criteria:
- [ ] Backend persists named filter presets with ownership and sharing policy.
- [ ] Export-job API supports asynchronous generation for long date windows and high row counts.
- [ ] Job status endpoint reports queued/running/succeeded/failed lifecycle with retry metadata.
- [ ] Export artifacts are downloadable via secure expiring links.
- [ ] Audit query performance remains bounded under preset and export workloads.
