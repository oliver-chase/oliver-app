import type { OliverFlow } from '@/components/shared/OliverContext'
import type { SlideImportResult } from '@/components/slides/types'

type WorkspaceTab = 'import' | 'my-slides' | 'templates' | 'activity'

type Ctx = {
  rawHtml: string
  openFilePicker: () => void
  parseHtml: (html: string) => SlideImportResult
  saveSlide: (titleOverride?: string) => Promise<string>
  generateExport: () => string
  openWorkspaceTab: (tab: WorkspaceTab) => boolean
}

const asString = (v: unknown) => (v == null ? '' : String(v))

export function buildSlidesFlows(ctx: Ctx): OliverFlow[] {
  const { rawHtml, openFilePicker, parseHtml, saveSlide, generateExport, openWorkspaceTab } = ctx

  return [
    {
      id: 'slides-import-file',
      label: 'Import HTML File',
      aliases: ['import slide html', 'upload html', 'import local html file'],
      steps: [],
      run: async () => {
        openFilePicker()
        return 'File picker opened. Choose an HTML file to import.'
      },
    },
    {
      id: 'slides-parse-pasted',
      label: 'Parse Pasted HTML',
      aliases: ['convert pasted html', 'i pasted html', 'parse slide html', 'convert html to slide json'],
      steps: [
        {
          id: 'source',
          prompt: 'Parse current editor HTML or paste new HTML in chat?',
          kind: 'choice',
          choices: [
            { label: 'Use current editor HTML', value: 'current' },
            { label: 'I will paste new HTML now', value: 'paste' },
          ],
        },
        {
          id: 'html',
          prompt: 'Paste the HTML to parse.',
          kind: 'text',
          placeholder: '<div class="slide-canvas">...</div>',
          skipIf: answers => asString(answers.source) !== 'paste',
        },
      ],
      run: async (answers) => {
        const source = asString(answers.source)
        const html = source === 'paste' ? asString(answers.html) : rawHtml
        if (!html.trim()) return 'No HTML found. Paste HTML or load it in the editor first.'
        try {
          const parsed = parseHtml(html)
          const warningLine = parsed.warnings.length > 0
            ? ` Warnings: ${parsed.warnings.length}.`
            : ''
          return `Parsed ${parsed.components.length} components on a ${parsed.canvas.width}x${parsed.canvas.height} canvas.${warningLine}`
        } catch (err) {
          return 'Parse failed: ' + (err instanceof Error ? err.message : String(err))
        }
      },
    },
    {
      id: 'slides-save-slide',
      label: 'Save Slide',
      hint: 'Persist the currently parsed canvas',
      aliases: ['save slide', 'save to my slides', 'store slide'],
      steps: [
        {
          id: 'titleMode',
          prompt: 'Save with the current title or set a custom title first?',
          kind: 'choice',
          choices: [
            { label: 'Use current title', value: 'current' },
            { label: 'Set custom title', value: 'custom' },
          ],
        },
        {
          id: 'title',
          prompt: 'Enter the custom slide title.',
          kind: 'text',
          placeholder: 'Q2 Narrative',
          skipIf: answers => asString(answers.titleMode) !== 'custom',
        },
      ],
      run: async (answers) => {
        const titleMode = asString(answers.titleMode)
        const customTitle = asString(answers.title).trim()
        const titleOverride = titleMode === 'custom' && customTitle ? customTitle : undefined
        return saveSlide(titleOverride)
      },
    },
    {
      id: 'slides-generate-export',
      label: 'Generate HTML Export',
      hint: 'Build deterministic export HTML from parsed components',
      aliases: ['generate html export', 'build export html', 'prepare html export'],
      steps: [],
      run: async () => {
        const html = generateExport()
        if (!html) return 'No parsed slide is available. Parse HTML first, then generate export.'
        return `Generated export HTML (${html.length} characters). Use Download HTML to save the file.`
      },
    },
    {
      id: 'slides-open-my-slides',
      label: 'Open My Slides',
      aliases: ['open my slides', 'show saved slides', 'my slides library'],
      steps: [],
      run: async () => {
        const changed = openWorkspaceTab('my-slides')
        if (!changed) return 'Stayed in the current workspace. Unsaved slide changes were kept.'
        return 'Opened My Slides.'
      },
    },
    {
      id: 'slides-open-template-library',
      label: 'Open Template Library',
      aliases: ['open templates', 'show templates', 'template library'],
      steps: [],
      run: async () => {
        const changed = openWorkspaceTab('templates')
        if (!changed) return 'Stayed in the current workspace. Unsaved slide changes were kept.'
        return 'Opened Template Library.'
      },
    },
    {
      id: 'slides-open-activity',
      label: 'Open Activity',
      aliases: ['open activity', 'show activity', 'slide operations'],
      steps: [],
      run: async () => {
        const changed = openWorkspaceTab('activity')
        if (!changed) return 'Stayed in the current workspace. Unsaved slide changes were kept.'
        return 'Opened Slide Operations activity.'
      },
    },
  ]
}
