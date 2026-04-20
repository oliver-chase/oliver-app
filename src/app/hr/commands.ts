import type { OliverAction } from '@/components/shared/OliverContext'

export type CommandMeta = Omit<OliverAction, 'run'>

export const HR_COMMANDS: CommandMeta[] = [
  { id: 'add-cand',      label: 'Add Candidate',         group: 'Create', hint: 'Quick-add to hiring pipeline' },
  { id: 'upload-resume', label: 'Upload Resume',         group: 'Create', hint: 'Import resume or intake document' },
  { id: 'view-postings', label: 'View Job Postings',     group: 'Quick',  hint: 'Open hiring pipeline view' },
  { id: 'upload-device', label: 'Upload Receipt/Device', group: 'Create', hint: 'Log a device or expense receipt' },
  { id: 'change-pw',     label: 'Change Password',       group: 'Quick',  hint: 'Update your account password' },
]
