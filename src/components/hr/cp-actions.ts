import type { HrPage } from './types'
import type { Flow } from './step-flow-types'
import { editCandidateFlow, deleteCandidateFlow, setCandStatusFlow, setCandStageFlow, logInterviewFlow } from './flows/cand-flows'
import { editEmployeeFlow, deleteEmployeeFlow, startOffboardingFlow } from './flows/emp-flows'
import { editDeviceFlow, deleteDeviceFlow, assignDeviceFlow, returnDeviceFlow } from './flows/device-flows'

export interface CpContext {
  setPage: (p: HrPage) => void
  openSearch: () => void
  addCandidate: () => void
  addEmployee: () => void
  addDevice: () => void
  runFlow: <D>(flow: Flow<D>) => void
}

export interface CpAction {
  id: string
  label: string
  group: 'Navigate' | 'Search' | 'Create' | 'Candidates' | 'Employees' | 'Devices'
  hint?: string
  run: (ctx: CpContext) => void
}

const NAV: { id: string; label: string; page: HrPage; hint: string }[] = [
  { id: 'nav-dash',    label: 'Go to Dashboard',   page: 'dashboard',   hint: 'Home view' },
  { id: 'nav-hire',    label: 'Go to Hiring',      page: 'hiring',      hint: 'Candidate pipeline' },
  { id: 'nav-dir',     label: 'Go to Directory',   page: 'directory',   hint: 'All employees' },
  { id: 'nav-on',      label: 'Go to Onboarding',  page: 'onboarding',  hint: 'Active onboarding' },
  { id: 'nav-off',     label: 'Go to Offboarding', page: 'offboarding', hint: 'Active offboarding' },
  { id: 'nav-inv',     label: 'Go to Inventory',   page: 'inventory',   hint: 'Devices' },
  { id: 'nav-asgn',    label: 'Go to Assignments', page: 'assignments', hint: 'Device assignments' },
  { id: 'nav-tracks',  label: 'Go to Tracks',      page: 'tracks',      hint: 'Onboarding templates' },
  { id: 'nav-reports', label: 'Go to Reports',     page: 'reports',     hint: 'Insights' },
  { id: 'nav-set',     label: 'Go to Settings',    page: 'settings',    hint: 'Configuration' },
]

export const CP_ACTIONS: CpAction[] = [
  { id: 'search',          label: 'Search candidates, employees, devices\u2026', group: 'Search',     hint: 'Type / to open',                  run: ctx => ctx.openSearch() },
  { id: 'add-cand',        label: 'Add candidate',                                group: 'Create',     hint: 'Quick-add to hiring pipeline',    run: ctx => ctx.addCandidate() },
  { id: 'add-emp',         label: 'Add employee',                                 group: 'Create',     hint: 'Quick-add to directory',          run: ctx => ctx.addEmployee() },
  { id: 'add-device',      label: 'Add device',                                   group: 'Create',     hint: 'Quick-add to inventory',          run: ctx => ctx.addDevice() },
  { id: 'edit-cand',       label: 'Edit candidate\u2026',                         group: 'Candidates', hint: 'Pick \u2192 open full edit form', run: ctx => ctx.runFlow(editCandidateFlow) },
  { id: 'delete-cand',     label: 'Delete candidate\u2026',                       group: 'Candidates', hint: 'Pick \u2192 confirm',             run: ctx => ctx.runFlow(deleteCandidateFlow) },
  { id: 'set-cand-stage',  label: 'Move candidate stage\u2026',                   group: 'Candidates', hint: 'Pick \u2192 choose stage',        run: ctx => ctx.runFlow(setCandStageFlow) },
  { id: 'set-cand-status', label: 'Set candidate status\u2026',                   group: 'Candidates', hint: 'Pick \u2192 choose status',       run: ctx => ctx.runFlow(setCandStatusFlow) },
  { id: 'log-iv',          label: 'Log interview\u2026',                          group: 'Candidates', hint: 'Pick \u2192 details',             run: ctx => ctx.runFlow(logInterviewFlow) },
  { id: 'edit-emp',        label: 'Edit employee\u2026',                          group: 'Employees',  hint: 'Pick \u2192 open full edit form', run: ctx => ctx.runFlow(editEmployeeFlow) },
  { id: 'delete-emp',      label: 'Delete employee\u2026',                        group: 'Employees',  hint: 'Pick \u2192 confirm',             run: ctx => ctx.runFlow(deleteEmployeeFlow) },
  { id: 'start-offboard',  label: 'Start offboarding\u2026',                      group: 'Employees',  hint: 'Pick \u2192 track + last day',    run: ctx => ctx.runFlow(startOffboardingFlow) },
  { id: 'edit-device',     label: 'Edit device\u2026',                            group: 'Devices',    hint: 'Pick \u2192 open full edit form', run: ctx => ctx.runFlow(editDeviceFlow) },
  { id: 'delete-device',   label: 'Delete device\u2026',                          group: 'Devices',    hint: 'Pick \u2192 confirm',             run: ctx => ctx.runFlow(deleteDeviceFlow) },
  { id: 'assign-device',   label: 'Assign device\u2026',                          group: 'Devices',    hint: 'Pick device \u2192 employee',     run: ctx => ctx.runFlow(assignDeviceFlow) },
  { id: 'return-device',   label: 'Return device\u2026',                          group: 'Devices',    hint: 'Pick \u2192 set new status',      run: ctx => ctx.runFlow(returnDeviceFlow) },
  ...NAV.map<CpAction>(n => ({ id: n.id, label: n.label, group: 'Navigate', hint: n.hint, run: ctx => ctx.setPage(n.page) })),
]
