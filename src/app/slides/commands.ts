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
  {
    id: 'slides-save-slide',
    label: 'Save Slide',
    group: 'Edit',
    hint: 'Persist the current canvas to My Slides',
    aliases: ['save slide', 'save to my slides', 'store slide'],
    granular: true,
  },
  {
    id: 'slides-generate-export',
    label: 'Generate HTML Export',
    group: 'Quick',
    hint: 'Build deterministic export HTML from parsed components',
    aliases: ['generate html export', 'build export html', 'prepare html export'],
    granular: true,
  },
  {
    id: 'slides-download-html',
    label: 'Download HTML Export',
    group: 'Quick',
    hint: 'Download the exported HTML artifact directly',
    aliases: ['download html export', 'export html file', 'save html export'],
    granular: true,
  },
  {
    id: 'slides-download-pptx',
    label: 'Download PPTX Export',
    group: 'Quick',
    hint: 'Export current slide as editable PPTX',
    aliases: ['download pptx export', 'export pptx', 'save powerpoint'],
    granular: true,
  },
  {
    id: 'slides-open-my-slides',
    label: 'Open My Slides',
    group: 'Quick',
    hint: 'Switch to the saved slides library',
    aliases: ['open my slides', 'show saved slides', 'my slides library'],
    granular: true,
  },
  {
    id: 'slides-open-template-library',
    label: 'Open Template Library',
    group: 'Quick',
    hint: 'Switch to the template browser',
    aliases: ['open templates', 'show templates', 'template library'],
    granular: true,
  },
  {
    id: 'slides-open-activity',
    label: 'Open Activity',
    group: 'Quick',
    hint: 'Switch to slide operation history',
    aliases: ['open activity', 'show activity', 'slide operations'],
    granular: true,
  },
]
