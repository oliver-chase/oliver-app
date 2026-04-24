import type { OliverAction } from '@/components/shared/OliverContext'

export type CommandMeta = Omit<OliverAction, 'run'>

export const SDR_COMMANDS: CommandMeta[] = [
  { id: 'log-call',       label: 'Log Call',         group: 'Create', hint: 'Record a prospect call', aliases: ['record call', 'prospect note', 'call summary'] },
  { id: 'add-opp',        label: 'Add Opportunity',  group: 'Create', hint: 'Add a new prospect opportunity', aliases: ['new lead', 'new opportunity', 'add prospect'] },
  { id: 'view-pipeline',  label: 'View Pipeline',    group: 'Quick',  hint: 'Open the prospects tab', aliases: ['open prospects', 'show pipeline', 'prospect pipeline'] },
  { id: 'open-drafts',    label: 'Open Draft Queue', group: 'Quick',  hint: 'Open draft approvals', aliases: ['draft approvals', 'open drafts', 'pending drafts'] },
  { id: 'open-outreach',  label: 'Open Outreach',    group: 'Quick',  hint: 'Open sent outreach activity', aliases: ['sent outreach', 'outreach activity', 'sent emails'] },
  { id: 'open-profile',   label: 'Profile Settings', group: 'Quick',  hint: 'Manage password, email, name, and personal info', aliases: ['change password', 'security settings', 'change email'] },
]
