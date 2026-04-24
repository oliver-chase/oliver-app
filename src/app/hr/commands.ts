import type { OliverAction } from '@/components/shared/OliverContext'

export type CommandMeta = Omit<OliverAction, 'run'>

export const HR_COMMANDS: CommandMeta[] = [
  { id: 'add-cand',       label: 'Add Candidate',         group: 'Create', hint: 'Quick-add to hiring pipeline', aliases: ['new candidate', 'add applicant', 'log candidate'] },
  { id: 'view-postings',  label: 'View Job Postings',     group: 'Quick',  hint: 'Open the hiring pipeline view', aliases: ['open hiring', 'show hiring', 'job postings'] },
  { id: 'add-employee',   label: 'Add Employee',          group: 'Create', hint: 'Quick-add to employee directory', aliases: ['new employee', 'add team member', 'employee directory'] },
  { id: 'add-device',     label: 'Add Device',            group: 'Create', hint: 'Quick-add inventory hardware', aliases: ['new device', 'inventory hardware', 'add laptop'] },
  { id: 'upload-device',  label: 'Upload Receipt',        group: 'Create', hint: 'Inventory only: parse a receipt and create a device record', aliases: ['receipt upload', 'import receipt', 'inventory receipt'] },
  { id: 'open-reports',   label: 'Open Reports',          group: 'Quick',  hint: 'Jump to HR reports', aliases: ['hr reports', 'open hr reports', 'reporting'] },
  { id: 'open-settings',  label: 'Open Settings',         group: 'Quick',  hint: 'Jump to HR settings', aliases: ['hr settings', 'open hr settings', 'configure hr'] },
  { id: 'open-profile',   label: 'Profile Settings',      group: 'Quick',  hint: 'Manage password, email, name, and personal info', aliases: ['change password', 'security settings', 'change email'] },
]
