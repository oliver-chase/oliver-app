---
ID: US-O8
Title: Inventory-Only Receipt Upload via HR Chatbot
Status: Code Present
Verified: false
Backdated: 2026-04-24
---

As an HR or IT operator  
I want receipt upload to exist only in inventory chatbot workflows  
So that hiring stays focused on candidate operations and device receipts stay inventory-specific.

Acceptance Criteria:
- [x] Hiring page no longer shows a receipt upload button/panel.
- [x] HR chatbot only surfaces receipt upload command while on the Inventory page.
- [x] Receipt parsing for text uploads runs client-side (no AI dependency).
- [x] Image/PDF receipt uploads are accepted but treated as manual-review payloads when parse data is missing.
- [x] Receipt upload creates an inventory device record instead of writing inside hiring views.
