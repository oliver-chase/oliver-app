'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRegisterOliver } from '@/components/shared/OliverContext'
import type { OliverAction, OliverConfig } from '@/components/shared/OliverContext'
import type { SlideImportResult } from '@/components/slides/types'
import { convertHtmlToSlideComponents } from '@/components/slides/html-import'
import { SLIDES_COMMANDS } from '@/app/slides/commands'
import { buildSlidesFlows } from '@/app/slides/flows'
import { buildModuleOliverConfig } from '@/modules/oliver-config'
import { useModuleAccess } from '@/modules/use-module-access'

export default function SlidesPage() {
  const { allowRender } = useModuleAccess('slides')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rawHtml, setRawHtml] = useState('')
  const [result, setResult] = useState<SlideImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseHtml = useCallback((html: string): SlideImportResult => {
    try {
      const parsed = convertHtmlToSlideComponents(html)
      setResult(parsed)
      setError(null)
      return parsed
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : String(err))
      throw err
    }
  }, [])

  const onFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setRawHtml(text)
    try {
      parseHtml(text)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : String(err))
    }
    event.target.value = ''
  }, [parseHtml])

  const openFilePicker = useCallback(() => fileInputRef.current?.click(), [])

  const oliverConfig = useMemo<OliverConfig>(() => {
    const actions: OliverAction[] = SLIDES_COMMANDS.map(c => {
      let run: () => void
      switch (c.id) {
        case 'slides-import-file':
          run = () => openFilePicker()
          break
        case 'slides-parse-pasted':
          run = () => {
            try {
              parseHtml(rawHtml)
            } catch (err) {
              setResult(null)
              setError(err instanceof Error ? err.message : String(err))
            }
          }
          break
        default:
          run = () => {}
      }
      return { ...c, run }
    })
    const flows = buildSlidesFlows({
      rawHtml,
      openFilePicker,
      parseHtml,
    })

    return buildModuleOliverConfig('slides', {
      greeting: "Hi, I'm Oliver. Import an HTML slide file and I'll convert it into editable component JSON.",
      actions,
      flows,
      quickConvos: [
        'What HTML structure imports best?',
        'How do I map classes to component types?',
        'What export mode should I use for clients?',
      ],
      contextPayload: () => ({
        imported_components: result?.components.length ?? 0,
        canvas: result?.canvas ?? null,
        warnings: result?.warnings ?? [],
      }),
    })
  }, [openFilePicker, parseHtml, rawHtml, result])

  useRegisterOliver(oliverConfig)

  if (!allowRender) return null

  return (
    <div className="app show-hamburger">
      <div
        className={'sidebar-backdrop' + (sidebarOpen ? ' open' : '')}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <nav className="app-sidebar" id="sidebar" aria-label="Slide editor navigation">
        <div className="app-sidebar-logo">Slide Editor</div>
        <Link href="/" className="sidebar-back">← Back to Hub</Link>
        <div className="app-sidebar-section">
          <div className="app-sidebar-item active" role="button" tabIndex={0}>Import HTML</div>
        </div>
      </nav>

      <div className="main slides-main">
        <header className="topbar">
          <button
            className="topbar-hamburger"
            onClick={() => setSidebarOpen(open => !open)}
            aria-label="Toggle navigation"
            aria-expanded={sidebarOpen}
            aria-controls="sidebar"
          >
            &#9776;
          </button>
          <span className="topbar-name">Slide Editor</span>
        </header>

        <main className="page slides-page" id="main-content">
          <section className="slides-card">
            <h1 className="slides-title">HTML to Editable Components</h1>
            <p className="slides-subtitle">
              Import existing slide HTML and convert it into component JSON for the upcoming drag-and-drop editor.
            </p>

            <div className="slides-actions">
              <button type="button" className="btn btn-primary" onClick={openFilePicker}>
                Import HTML File
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  try {
                    parseHtml(rawHtml)
                  } catch (err) {
                    setResult(null)
                    setError(err instanceof Error ? err.message : String(err))
                  }
                }}
                disabled={!rawHtml.trim()}
              >
                Parse Pasted HTML
              </button>
            </div>

            <input
              ref={fileInputRef}
              id="slides-html-file"
              type="file"
              accept=".html,text/html"
              onChange={onFileChange}
              hidden
            />

            <label className="slides-label" htmlFor="slides-raw-html">Raw HTML</label>
            <textarea
              id="slides-raw-html"
              className="slides-textarea"
              value={rawHtml}
              onChange={event => setRawHtml(event.target.value)}
              placeholder="<div class='slide-canvas' style='width:1920px;height:1080px;'>...</div>"
            />

            {error && (
              <p className="slides-error" role="alert">
                Import failed: {error}
              </p>
            )}

            {result && (
              <div className="slides-results">
                <p className="slides-summary">
                  Canvas: {result.canvas.width} × {result.canvas.height} · Components: {result.components.length}
                </p>
                {result.warnings.length > 0 && (
                  <ul className="slides-warning-list">
                    {result.warnings.map(warning => <li key={warning}>{warning}</li>)}
                  </ul>
                )}
                <pre className="slides-code">
                  {JSON.stringify(result.components, null, 2)}
                </pre>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
