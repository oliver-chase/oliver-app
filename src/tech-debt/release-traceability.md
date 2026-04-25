# Release Traceability

Use this table to map grouped commits to story IDs and QA evidence.

| Date (ET) | Commit | Epic/Group | Story IDs | Modules | QA Gates |
| --- | --- | --- | --- | --- | --- |
| 2026-04-25 | PENDING | Slides governance approval workflow completion | SLD-FE-410, SLD-BE-410 | Slides FE/BE, e2e, migrations, tech-debt docs | typecheck=pass; lint=pass; build=pass; slides-regression=pass (26/26); smoke=pass (29/29); slides-visual=pass (3/3); combined=pass (29/29) |
| 2026-04-25 | PENDING | Slides collaborator governance + template visibility parity slice | SLD-FE-410, SLD-BE-410 | Slides FE/BE, e2e, migrations, tech-debt docs | typecheck=pass; lint=pass; build=pass; slides-regression=pass (24/24); smoke=pass (29/29); slides-visual=pass (3/3); combined=pass (56/56) |
| 2026-04-25 | PENDING | Slides template ownership transfer + local fallback parity slice | SLD-FE-410, SLD-BE-410 | Slides FE/BE, e2e, tech-debt docs | typecheck=pass; lint=pass; build=pass; slides-regression=pass (22/22); smoke=pass (29/29); slides-visual=pass (3/3); combined=pass (54/54) |
| 2026-04-25 | PENDING | Slides audit explorer + backend query slice | SLD-FE-420, SLD-BE-420 | Slides FE/BE, e2e, migrations, tech-debt docs | typecheck=pass; lint=pass; build=pass; slides-regression=pass (21/21); smoke=pass (29/29); slides-visual=pass (3/3); combined=pass (53/53) |
| 2026-04-25 | PENDING | Slides template governance + ACL slice | SLD-FE-400, SLD-BE-400 | Slides FE/BE, e2e, tech-debt docs | typecheck=pass; lint=pass; build=pass; slides-regression=pass (20/20); smoke=pass (29/29); slides-visual=pass (3/3); combined=pass (52/52) |
| 2026-04-25 | PENDING | Slides browser-history guardrail slice | SLD-FE-142 | Slides, e2e, tech-debt docs | typecheck=pass; lint=pass; build=pass; slides-regression=pass (18/18); smoke=pass (29/29); slides-visual=pass (3/3) |
| 2026-04-25 | PENDING | Slides reliability + backlog structuring slice | US-SLD-020, US-SLD-021 (partial), US-SLD-036, US-SLD-037, US-SLD-038, US-SLD-039 | Slides, tech-debt docs | typecheck=pass; lint=pass; slides-regression=pass (10/10) |
| 2026-04-24 | PENDING | Oliver requirements backlog slice | US-O8, US-O9, US-O10, US-O11, US-O12, US-O13, US-O14, US-O15, US-O16, US-O17 | HR, Accounts, Slides, shared parser/util docs | typecheck=pass; lint=pass; build=pass; smoke=pass (24/24) |

Notes:

- Replace `PENDING` with actual commit hash during final commit/merge.
- Split into multiple rows when work ships in multiple grouped commits.
