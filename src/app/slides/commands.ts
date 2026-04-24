import type { OliverAction } from '@/components/shared/OliverContext'

export type CommandMeta = Omit<OliverAction, 'run'>

export const SLIDES_COMMANDS: CommandMeta[] = [
  {
    id: 'slides-import-file',
    label: 'Import HTML File',
    group: 'Create',
    hint: 'Upload a local HTML slide export',
    aliases: ['import slides html', 'upload html', 'slide html file'],
  },
  {
    id: 'slides-parse-pasted',
    label: 'Parse Pasted HTML',
    group: 'Edit',
    hint: 'Convert the HTML currently in the editor',
    aliases: ['parse html', 'convert pasted html', 'slides parser'],
  },
]
