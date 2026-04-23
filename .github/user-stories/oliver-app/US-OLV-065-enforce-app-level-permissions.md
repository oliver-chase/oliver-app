---
ID: US-OLV-065
Title: Enforce app-level permissions
Status: Broken
Verified: false
Backdated: 2026-04-17
Milestone: Auth strategy changes

As a authenticated employee
I want app-level module permissions enforced after login
So that I can only access the modules allowed by my role

Acceptance Criteria:
- [ ] The root layout mounts a real user-permissions provider in addition to the existing AuthProvider and AuthGuard.
- [ ] UserContext resolves the signed-in app user and returns real role and page-permission data instead of the current default stub values.
- [ ] AuthGuard continues to block unauthenticated users at the route level while app-level permission checks restrict authenticated users to allowed modules and admin surfaces.

Notes: Broken in current code. What is working: src/app/layout.tsx mounts AuthProvider and AuthGuard, and src/components/auth/AuthGuard.tsx redirects unauthenticated users to /login/ and keeps public login routes separate. What is stubbed: src/context/UserContext.tsx only exports a default context with appUser=null, isAdmin=false, hasPermission() => false, and no mounted UserProvider. Why this is a security gap: route-level authentication is active, but app-level authorization is not actually running, so any authenticated user who reaches the app can bypass role-based module restrictions because no live permission context is enforcing them.
---
