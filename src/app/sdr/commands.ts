import type { OliverAction } from '@/components/shared/OliverContext'

export type CommandMeta = Omit<OliverAction, 'run'>

export const SDR_COMMANDS: CommandMeta[] = [
  { id: 'log-call',       label: 'Log Call',         group: 'Create', hint: 'Record a prospect call' },
  { id: 'add-opp',        label: 'Add Opportunity',  group: 'Create', hint: 'Add a new prospect opportunity' },
  { id: 'view-pipeline',  label: 'View Pipeline',    group: 'Quick',  hint: 'Open the prospects tab' },
  { id: 'open-drafts',    label: 'Open Draft Queue', group: 'Quick',  hint: 'Open draft approvals' },
  { id: 'open-outreach',  label: 'Open Outreach',    group: 'Quick',  hint: 'Open sent outreach activity' },
  { id: 'open-profile',   label: 'Profile Settings', group: 'Quick',  hint: 'Manage password, email, name, and personal info' },
]
