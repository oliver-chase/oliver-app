import type { OliverAction } from '@/components/shared/OliverContext'

export type CommandMeta = Omit<OliverAction, 'run'>

export const ACCOUNTS_COMMANDS: CommandMeta[] = [
  { id: 'add-account',       label: 'Add Account',       group: 'Create', hint: 'Quick-add to portfolio' },
  { id: 'import-transcript', label: 'Import Transcript', group: 'Create', hint: 'Upload a meeting transcript or document' },
  { id: 'view-org-chart',    label: 'View Org Chart',    group: 'Quick',  hint: 'Open people and org structure' },
  { id: 'export-data',       label: 'Export Data',       group: 'Quick',  hint: 'Open export panel' },
  { id: 'change-pw',         label: 'Change Password',   group: 'Quick',  hint: 'Update your account password' },
]
