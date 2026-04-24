---
ID: US-O5
Title: Social Friend Read-Only Functional Parity
Status: Missing
Verified: false
Backdated: 2026-04-24
Scope: Tesknota (not Oliver App)
---

As a social user  
I want friend collection views to preserve key browse interactions in read-only mode  
So I can explore another profile without edit permissions.

Current state:
- No Social/friend collection routes exist in this repository (`oliver-app`).
- Feature belongs to Tesknota scope.

Acceptance Criteria:
- [ ] Story is tracked in the correct repo backlog (Tesknota) with owner assignment.
- [ ] Friend read-only route supports search/filter/pagination parity with owner view.
- [ ] Authorization rules enforce read-only behavior for non-owners.
- [ ] Automated coverage validates blocked write actions in friend view.
