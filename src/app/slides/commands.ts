import type { OliverAction } from '@/components/shared/OliverContext'

export type CommandMeta = Omit<OliverAction, 'run'>

export const SLIDES_COMMANDS: CommandMeta[] = [
  {
    id: 'slides-import-file',
    label: 'Import HTML File',
    group: 'Create',
    hint: 'Upload a local HTML slide export',
  },
  {
    id: 'slides-parse-pasted',
    label: 'Parse Pasted HTML',
    group: 'Edit',
    hint: 'Convert the HTML currently in the editor',
  },
]
