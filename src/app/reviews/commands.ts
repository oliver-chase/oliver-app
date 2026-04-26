import type { OliverAction } from '@/components/shared/OliverContext'

export type CommandMeta = Omit<OliverAction, 'run'>

export const REVIEWS_COMMANDS: CommandMeta[] = [
  {
    id: 'add-review-goal',
    label: 'Add Growth Goal',
    group: 'Create',
    hint: 'Create a focus-area goal with metric and target date',
    aliases: ['add goal', 'new growth goal', 'create review goal'],
  },
  {
    id: 'add-review-update',
    label: 'Add Progress Update',
    group: 'Create',
    hint: 'Log action, win, lesson, feedback, or evidence',
    aliases: ['add update', 'log progress', 'record evidence'],
  },
  {
    id: 'save-quarterly-reflection',
    label: 'Save Quarterly Reflection',
    group: 'Edit',
    hint: 'Capture quarterly reflection, blockers, and support needed',
    aliases: ['quarterly reflection', 'save quarter review', 'quarterly check-in'],
  },
  {
    id: 'save-annual-review',
    label: 'Save Annual Review Draft',
    group: 'Edit',
    hint: 'Save annual self-review summary and growth plan',
    aliases: ['annual review draft', 'self review', 'annual reflection'],
  },
  {
    id: 'open-focus-areas',
    label: 'Open Focus Areas',
    group: 'Quick',
    hint: 'Jump to the company focus-area framework',
    aliases: ['focus areas', 'legacy craftsmanship client growth', 'review framework'],
  },
  {
    id: 'open-review-cycles',
    label: 'Open Review Cycles',
    group: 'Quick',
    hint: 'Jump to quarterly and annual review cadence',
    aliases: ['review cycles', 'quarterly review', 'annual review'],
  },
  {
    id: 'open-goals',
    label: 'Open Goals',
    group: 'Quick',
    hint: 'Jump to goal planning and tracking',
    aliases: ['open goals', 'goal tracker', 'focus goals'],
  },
  {
    id: 'open-updates',
    label: 'Open Updates',
    group: 'Quick',
    hint: 'Jump to progress updates feed',
    aliases: ['open updates', 'progress feed', 'wins and evidence'],
  },
  {
    id: 'open-admin-setup',
    label: 'Open Admin Setup',
    group: 'Quick',
    hint: 'Go to admin workspace for permissions and configuration',
    aliases: ['review admin setup', 'configure review module', 'open admin'],
  },
]
