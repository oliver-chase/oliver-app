# Slides Module

## Purpose
Slide editing workspace for HTML import, canvas editing, autosave, template management, approvals, and exports.

## Key files
- Route shell: `src/app/slides/page.tsx`, `src/app/slides/layout.tsx`, `src/app/slides/slides.css`
- Module chatbot: `src/app/slides/commands.ts`, `src/app/slides/flows.ts`
- Slide conversion utilities: `src/components/slides/html-import.ts`, `src/components/slides/html-export.ts`, `src/components/slides/pptx-export.ts`
- Persistence layer: `src/lib/slides.ts`

## Access model
- Module ID: `slides`
- Controlled by `useModuleAccess('slides')`
- Visible on hub unless disabled by env/module toggles

## Data and integrations
- Runtime health, approvals, templates, and audit operations route through `src/lib/slides.ts`.
- Backend endpoints are implemented in `functions/api/slides.js`.

## Update checklist
- Keep autosave/degraded-mode behavior documented when changed.
- Keep chatbot commands and flows aligned with slide actions and approval flows.
- Update this doc when new template/audit surfaces are added.

## Test commands
- Local default (Playwright manages web server): `npm run test:smoke`
- External target (skip Playwright webServer, use provided base URL): `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npm run test:smoke:external`
- Slides-focused external suite: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npm run test:smoke:slides:external`
