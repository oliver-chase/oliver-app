import type { OliverAction } from '@/components/shared/OliverContext'

export type CommandMeta = Omit<OliverAction, 'run'>

export const ACCOUNTS_COMMANDS: CommandMeta[] = [
  { id: 'add-account',       label: 'Add Account',       group: 'Create', hint: 'Quick-add to portfolio', aliases: ['new account', 'create account', 'add client'] },
  { id: 'import-transcript', label: 'Import Transcript', group: 'Create', hint: 'Upload a meeting transcript or document', aliases: ['meeting transcript', 'upload transcript', 'import meeting notes'] },
  { id: 'view-org-chart',    label: 'View Org Chart',    group: 'Quick',  hint: 'Open people and org structure', aliases: ['org chart', 'people section', 'stakeholders'] },
  { id: 'export-data',       label: 'Export Data',       group: 'Quick',  hint: 'Download a print-ready account export', aliases: ['export account plan', 'export pdf', 'account export'] },
]
