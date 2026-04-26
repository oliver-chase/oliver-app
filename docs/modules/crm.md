# CRM Module

## Purpose
Planned CRM and business development workspace (relationship management, opportunity tracking, proposals).

## Key files
- Route shell: `src/app/crm/page.tsx`, `src/app/crm/layout.tsx`, `src/app/crm/crm.css`
- Module commands: `src/app/crm/commands.ts`
- Registry metadata: `src/modules/registry.ts`

## Access model
- Module ID: `crm`
- Registry state: `comingSoon: true`, `enabledByDefault: false`, `showInHub: false`
- Default behavior: module is disabled unless force-enabled via env toggle

## Data and integrations
- Current implementation is a backlog/coming-soon shell.
- No active flow definitions or persistence contracts are in place yet.

## Update checklist
- When CRM implementation starts, add `flows.ts` and expand this doc immediately.
- If enabled for users, update registry flags, hub visibility, and chatbot path definitions.
