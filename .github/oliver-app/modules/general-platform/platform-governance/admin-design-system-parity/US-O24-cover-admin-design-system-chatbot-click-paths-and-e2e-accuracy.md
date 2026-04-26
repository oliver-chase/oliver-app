---
ID: US-O24
Title: Cover Admin and Design System Chatbot, Click Paths, and E2E Accuracy
Status: Not Started
Verified: false
Backdated: 2026-04-25
---

As a release owner  
I want admin and design-system behavior covered by accurate chatbot, backend, and e2e verification  
So privileged flows ship with defensible evidence instead of manual guesswork.

Current state:
- Admin already registers Oliver flows and commands in [src/app/admin/page.tsx](/Users/oliver/projects/oliver-app/src/app/admin/page.tsx:53), but the backlog request expands navigation, sectioning, and edit behavior.
- Current smoke coverage verifies only a subset of Admin/Design System behaviors in [tests/e2e/frontend-smoke.spec.ts](/Users/oliver/projects/oliver-app/tests/e2e/frontend-smoke.spec.ts).
- The requirement now explicitly includes click-path accuracy, information display correctness, backend connection validity, and chatbot parity across the full privileged surface.

Acceptance Criteria:
- [ ] Chatbot flows and quick actions can navigate into Admin and Design System destinations without dead ends.
- [ ] E2E coverage verifies hub visibility rules for admin-only controls, including "hub only" scope for the Admin entry.
- [ ] E2E coverage verifies Admin subsection switching, Design System navigation, sticky filter behavior, and return-to-top behavior.
- [ ] E2E or integration coverage verifies privileged edit/persist flows against the real backend contract or a production-faithful test double.
- [ ] Browser coverage verifies information display and click targets are not obscured or misordered.
- [ ] Release evidence captures staging validation for admin access, design-system editing, and chatbot navigation.
