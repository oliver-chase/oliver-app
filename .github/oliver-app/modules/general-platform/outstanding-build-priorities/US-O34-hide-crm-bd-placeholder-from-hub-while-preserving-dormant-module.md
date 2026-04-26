---
ID: US-O34
Title: Hide CRM BD Placeholder from Hub While Preserving Dormant Module
Status: Done
Verified: true
Backdated: 2026-04-25
---

As a hub user
I want non-ready placeholder modules hidden from the live hub
So navigation only shows available workflows without removing future module scaffolding

Acceptance Criteria:
- [x] CRM BD placeholder module does not appear in hub module listings for standard users.
- [x] Underlying module definition/component remains in codebase with a controlled feature flag or registry toggle.
- [x] Chatbot/module command routing does not expose hidden modules unless explicitly enabled.
- [x] Re-enable path is documented and testable without re-implementing module scaffolding.
- [x] Hub regression tests confirm only approved modules are visible by role/environment.
- [x] Copy and metadata for visible modules remain accurate after CRM BD hiding.

Implementation evidence (2026-04-26):
- Preserved dormant CRM module scaffold in `src/modules/registry.ts` with default hidden/disabled posture:
  - `enabledByDefault: false`
  - `showInHub: false`
- Added explicit runtime re-enable controls in `src/modules/registry.ts`:
  - `NEXT_PUBLIC_ENABLED_MODULES=crm` to re-enable route access checks.
  - `NEXT_PUBLIC_HUB_VISIBLE_MODULES=crm` to include CRM in hub/permission module listings.
  - `NEXT_PUBLIC_DISABLED_MODULES` remains the kill switch override.
- Updated chatbot scope guard logic to suppress hidden-module exposure unless enabled:
  - `src/lib/chatbot-intents.ts`
  - `functions/api/chat.js`
- Regression coverage:
  - Existing hub and route-gate checks in `tests/e2e/frontend-smoke.spec.ts` keep CRM hidden by default.
  - Added chatbot regression asserting hidden workflow message does not expose CRM label.
