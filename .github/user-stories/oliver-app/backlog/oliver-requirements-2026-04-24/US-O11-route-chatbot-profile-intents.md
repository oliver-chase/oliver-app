---
ID: US-O11
Title: Route HR/SDR Chatbot Personal-Info Intents to Profile Page
Status: Code Present
Verified: false
Backdated: 2026-04-24
---

As an authenticated user  
I want chatbot actions for password/email/name/personal info to route me to Profile Settings  
So account-sensitive changes happen on the profile page, not inline in chat.

Acceptance Criteria:
- [x] HR chatbot command metadata uses a profile-settings action instead of direct change-password action.
- [x] SDR chatbot command metadata uses a profile-settings action instead of direct change-password action.
- [x] Triggering this action in HR or SDR routes to `/profile`.
- [x] A `/profile` page exists and includes personal-info and security entry points.
- [x] Security and profile edits are initiated from the profile page, not directly from chatbot command handlers.
