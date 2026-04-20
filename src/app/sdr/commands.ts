import type { OliverAction } from '@/components/shared/OliverContext'

export type CommandMeta = Omit<OliverAction, 'run'>

export const SDR_COMMANDS: CommandMeta[] = [
  { id: 'log-call',      label: 'Log Call',        group: 'Create', hint: 'Record a prospect call' },
  { id: 'add-opp',       label: 'Add Opportunity', group: 'Create', hint: 'Add a new prospect opportunity' },
  { id: 'view-pipeline', label: 'View Pipeline',   group: 'Quick',  hint: 'Open the prospects tab' },
  { id: 'change-pw',     label: 'Change Password', group: 'Quick',  hint: 'Update your account password' },
]
