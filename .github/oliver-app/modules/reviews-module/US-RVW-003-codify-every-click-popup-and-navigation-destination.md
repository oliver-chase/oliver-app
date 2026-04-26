---
ID: US-RVW-003
Title: Codify Every Click, Popup, and Navigation Destination
Status: In Progress
Verified: false
Backdated: 2026-04-25
---

As a product and QA lead
I want a full interaction map for the reviews module
So every click, popup, button, and redirect is predictable and testable

Acceptance Criteria:
- [x] A click-path matrix exists for all interactive controls in reviews, including trigger, precondition, target behavior, and resulting state change.
- [x] Matrix includes navigation links, section tabs, save buttons, progress controls, refresh controls, and chatbot quick actions.
- [x] Matrix explicitly documents popup/modal usage and confirms where no popup is expected.
- [x] For every action, matrix identifies where data comes from (local state, Supabase table, auth/user context, computed values).
- [x] For every action, matrix identifies where data goes (table write, state update, router push, scroll target, chat flow state).
- [x] Matrix includes expected success and failure UX copy for each write action.
- [x] Matrix is stored in backlog/docs and referenced by smoke test planning.

Interaction Matrix:

| Trigger | Preconditions | Action/Flow | Data source | Destination | Success UX | Failure UX |
|---|---|---|---|---|---|---|
| Sidebar backdrop click (`.sidebar-backdrop`) | `sidebarOpen === true` | Close sidebar | `sidebarOpen` state | `sidebarOpen=false` local UI state | Backdrop disappears, sidebar hidden | No-op when already closed |
| Hamburger control in topbar (`ModuleTopbar`) | always | Toggle sidebar | `sidebarOpen` state | `sidebarOpen` local state | Sidebar opens/closes; overlay toggles visibility | If render blocked, sidebar state remains unchanged |
| Sync button (`sdr-refresh-btn`) | any | Reload workspace data | workspace data context, `policyBlocked`, `schemaMissing` flags | `/api/reviews` load path via `loadData()` | Sync status updates, latest data rehydrated | Error banner updates `error` + sync state |
| Section tab: Goals | always | Switch active panel to Goals | `activePanel` state | `activePanel='goals'` local state | Goals section visible; active tab style | No-op in error state |
| Section tab: Updates | always | Switch active panel to Updates | `activePanel` state | `activePanel='updates'` local state | Updates section visible; active tab style | No-op in error state |
| Section tab: Quarterly | always | Switch active panel to Quarterly | `activePanel` state | `activePanel='quarterly'` local state | Quarterly section visible; active tab style | No-op in error state |
| Section tab: Annual | always | Switch active panel to Annual | `activePanel` state | `activePanel='annual'` local state | Annual section visible; active tab style | No-op in error state |
| Focus area cards (`ReviewsLanding`) | always | No-op (informational) | none | no state change | No modal/popup is shown | No popup/modal expected |
| Command: open-goals | active Oliver chat | Activate Goals tab + scroll to goals | `activePanel`, DOM | `activePanel='goals'`; `scrollIntoView` target `#goals` | Goals pane visible; scroll lands near section top | If anchor missing, panel still switches |
| Command: open-updates | active Oliver chat | Activate Updates tab + scroll updates | `activePanel`, DOM | `activePanel='updates'`; `scrollIntoView` target `#updates` | Updates pane visible; scroll lands near section top | If anchor missing, panel still switches |
| Command: open-focus-areas | active Oliver chat | Scroll to focus area section | none | `#focus-areas.scrollIntoView` | Focus area section visible | No-op if anchor missing |
| Command: open-review-cycles | active Oliver chat | Scroll to review cycles section | none | `#review-cycles.scrollIntoView` | Review cycles section visible | No-op if anchor missing |
| Command: open-admin-setup | active Oliver chat | Route to admin workspace | `router` + auth context | `router.push('/admin')` | Route change to `/admin` | Route error handled by host app |
| Flow action: add-review-goal | goal title present | Create goal and clear minimal fields | `goalDraft`, flow context | `createGoalFromInput()` -> Supabase write + local goal list | Form fields reset, list updates | Missing title is blocked in flow (`Goal title is required.`) |
| Goal focus chip click (`goalDraft.focusArea`) | any | Change focus area draft value | `goalDraft` state | local draft state | Active chip highlights selection | no additional validation failure |
| Shell action: Add Goal submit | title present | Save goal | `goalDraft` | goal write via `createGoalFromInput` | Goal appears in list and counts update | On failure, form state unchanged; no inline toast currently |
| Goal percent chip (0/25/50/75/100) | goal row present + no policy/blocker | Set progress percent | `goal.id` + selected percent | `patchGoal()` -> Supabase `review_goals` progress update | Card progress bar updates, progress meta updates | On failure, old percent retained and user can retry |
| Goal status button (Mark Complete/Reopen) | goal row present + no policy/blocker | Toggle goal status and adjust progress | `goal.status`, `goal.id` | `patchGoal()` -> status+progress write | status text/label changes immediately on save | On failure, old status stays; button label unchanged |
| Updates: goal picker (`CustomPicker`) | goals loaded | Choose goal for update | `goalOptions` | `updateDraft.goalId` local draft | selected goal id set; save button may enable | If no goals, picker remains blank; submit disabled |
| Updates: update type chip | any | Select update type | `updateDraft.updateType` | local draft state | active type chip indicates required enum | no additional validation failure |
| Updates: Save Update | goalId and content present | Add update and clear text fields | `updateDraft` + save API | `addUpdateFromInput()` -> Supabase write + refresh | Update list prepends new item; form content/evidence cleared | If blocked or failed, form retains values for retry |
| Quarterly submit | cycleLabel and reflection present | Save reflection | `quarterlyDraft` | `saveQuarterlyFromInput()` -> write + list refresh | Reflection card renders | Missing cycle/reflection blocked by form guard; errors surfaced from handler |
| Annual submit | year + selfSummary + impact + growth present | Save annual draft | `annualDraft` | `saveAnnualFromInput()` -> write + local review card | Draft card shows updated year/title/content and timestamp | If save rejected, form still editable and retry possible |
| Evidence link click | evidence_link present | Open in new browser tab | `update.evidence_link` | browser `window.open` context | External view opens in new tab | Browser blocks invalid/missing links as usual |
| Policy-blocked banner render | `policyBlocked === true` | Render restriction card; disable write actions | policy state | static card + disabled buttons | explicit copy and required policy check message | no write path available until retry |
| Schema-missing banner render | `schemaMissing === true` | Render migration guidance card; disable write actions | schema state | static card + disabled buttons | explicit migration guidance and module usage pause | no write path available until schema migration |

QA / Evidence:
- [ ] Pending: browser smoke plan for matrix rows at desktop and <=500px mobile (commands, tabs, write controls, error states).
- [ ] Pending: evidence log for scroll/command navigation behaviors (scroll target + active panel state).
- [ ] Pending: evidence log for write success/fail copy per goal/update/quarterly/annual actions.
- [ ] Pending: confirm zero popup/modal triggers for all shell/workspace actions listed above.
- [ ] Pending: bind this matrix to the smoke-check list in review module test notes.
- [ ] `test:smoke` and `test:smoke:mobile` remain blocked in this host environment because Playwright cannot bind its local web server ports (`EPERM` on `0.0.0.0:3001` and `0.0.0.0:3002`).

Notes:
- Story remains `In Progress` due to missing manual evidence logs and test outputs.
