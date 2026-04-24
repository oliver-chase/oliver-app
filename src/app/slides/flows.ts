import type { OliverFlow } from '@/components/shared/OliverContext'
import type { SlideImportResult } from '@/components/slides/types'

type Ctx = {
  rawHtml: string
  openFilePicker: () => void
  parseHtml: (html: string) => SlideImportResult
}

const asString = (v: unknown) => (v == null ? '' : String(v))

export function buildSlidesFlows(ctx: Ctx): OliverFlow[] {
  const { rawHtml, openFilePicker, parseHtml } = ctx

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
  ]
}
