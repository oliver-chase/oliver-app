import type { OliverAction } from '@/components/shared/OliverContext'

export type CommandMeta = Omit<OliverAction, 'run'>

export const HR_COMMANDS: CommandMeta[] = [
  { id: 'add-cand',       label: 'Add Candidate',         group: 'Create', hint: 'Quick-add to hiring pipeline' },
  { id: 'view-postings',  label: 'View Job Postings',     group: 'Quick',  hint: 'Open the hiring pipeline view' },
  { id: 'add-employee',   label: 'Add Employee',          group: 'Create', hint: 'Quick-add to employee directory' },
  { id: 'add-device',     label: 'Add Device',            group: 'Create', hint: 'Quick-add inventory hardware' },
  { id: 'upload-device',  label: 'Upload Receipt',        group: 'Create', hint: 'Inventory only: parse a receipt and create a device record' },
  { id: 'open-reports',   label: 'Open Reports',          group: 'Quick',  hint: 'Jump to HR reports' },
  { id: 'open-settings',  label: 'Open Settings',         group: 'Quick',  hint: 'Jump to HR settings' },
  { id: 'open-profile',   label: 'Profile Settings',      group: 'Quick',  hint: 'Manage password, email, name, and personal info' },
]
