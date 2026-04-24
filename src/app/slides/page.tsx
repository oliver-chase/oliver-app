'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRegisterOliver } from '@/components/shared/OliverContext'
import type { OliverAction, OliverConfig } from '@/components/shared/OliverContext'
import type { SlideImportResult } from '@/components/slides/types'
import { convertHtmlToSlideComponents } from '@/components/slides/html-import'
import { convertSlideComponentsToHtml } from '@/components/slides/html-export'
import {
  classifyImportError,
  type SlideImportFailure,
  validateImportFile,
  validateParsedResult,
  validatePastedHtml,
} from '@/components/slides/import-validation'
import type { SlideAuditEvent, SlideRecord, SlideTemplateRecord } from '@/components/slides/persistence-types'
import {
  deleteSlide,
  duplicateSlide,
  duplicateTemplateAsSlide,
  listSlideAudits,
  listSlides,
  listTemplates,
  publishTemplateFromSlide,
  recordExportEvent,
  renameSlide,
  saveSlide,
  SlideConflictError,
} from '@/lib/slides'
import { useUser } from '@/context/UserContext'
import { SLIDES_COMMANDS } from '@/app/slides/commands'
import { buildSlidesFlows } from '@/app/slides/flows'
import { buildModuleOliverConfig } from '@/modules/oliver-config'
import { useModuleAccess } from '@/modules/use-module-access'

const AUTOSAVE_DELAY_MS = 5000
const DRAFT_RECOVERY_KEY = 'oliver-slide-draft-v1'

type ParseStatus = 'idle' | 'parsing' | 'completed' | 'canceled' | 'failed'
type SaveStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict'
type WorkspaceTab = 'import' | 'my-slides' | 'templates' | 'activity'

interface DraftSnapshot {
  rawHtml: string
  title: string
  activeSlideId: string | null
  revision: number
  result: SlideImportResult | null
  createdAt: string
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'n/a'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'n/a'
  return date.toLocaleString()
}

function summarizeWarnings(warnings: string[]) {
  const byMessage = new Map<string, number>()
  for (const warning of warnings) {
    byMessage.set(warning, (byMessage.get(warning) || 0) + 1)
  }

  const groups = new Map<string, Array<{ text: string; count: number }>>()
  for (const [text, count] of byMessage.entries()) {
    const lowered = text.toLowerCase()
    const group = lowered.includes('canvas')
      ? 'Canvas'
      : lowered.includes('transform')
        ? 'Transforms'
        : lowered.includes('unit')
          ? 'Units'
          : lowered.includes('left/top') || lowered.includes('position')
            ? 'Positioning'
            : 'General'

    const bucket = groups.get(group) || []
    bucket.push({ text, count })
    groups.set(group, bucket)
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }))
}

export default function SlidesPage() {
  const { allowRender } = useModuleAccess('slides')
  const { appUser } = useUser()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('import')

  const [rawHtml, setRawHtml] = useState('')
  const [result, setResult] = useState<SlideImportResult | null>(null)
  const [importError, setImportError] = useState<SlideImportFailure | null>(null)
  const [parseStatus, setParseStatus] = useState<ParseStatus>('idle')
  const [parseProgress, setParseProgress] = useState(0)
  const [parseMessage, setParseMessage] = useState('Idle')

  const [showRawJson, setShowRawJson] = useState(false)
  const [jsonCopyState, setJsonCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const [slideTitle, setSlideTitle] = useState('Untitled Slide')
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null)
  const [activeRevision, setActiveRevision] = useState(0)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('clean')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [autosaveEnabled, setAutosaveEnabled] = useState(true)
  const [conflictServerSlide, setConflictServerSlide] = useState<SlideRecord | null>(null)

  const [slides, setSlides] = useState<SlideRecord[]>([])
  const [templates, setTemplates] = useState<SlideTemplateRecord[]>([])
  const [audits, setAudits] = useState<SlideAuditEvent[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [libraryError, setLibraryError] = useState<string | null>(null)

  const [searchValue, setSearchValue] = useState('')
  const [exportHtml, setExportHtml] = useState('')

  const [recoveryDraft, setRecoveryDraft] = useState<DraftSnapshot | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const parseAbortRef = useRef<AbortController | null>(null)

  const actor = useMemo(() => ({
    user_id: appUser?.user_id || 'qa-admin-user',
    user_email: appUser?.email || 'qa-admin@example.com',
  }), [appUser])

  const warningGroups = useMemo(() => summarizeWarnings(result?.warnings || []), [result])

  const setDirty = useCallback(() => {
    setSaveStatus((previous) => {
      if (previous === 'saving') return previous
      return 'dirty'
    })
  }, [])

  const parseHtmlSync = useCallback((html: string): SlideImportResult => {
    const preflight = validatePastedHtml(html)
    if (preflight) {
      setImportError(preflight)
      setParseStatus('failed')
      setParseMessage(preflight.message)
      throw new Error(preflight.message)
    }

    const parsed = convertHtmlToSlideComponents(html)
    const parsedValidation = validateParsedResult(parsed)
    if (parsedValidation) {
      setImportError(parsedValidation)
      setParseStatus('failed')
      setParseMessage(parsedValidation.message)
      throw new Error(parsedValidation.message)
    }

    setResult(parsed)
    setImportError(null)
    setParseStatus('completed')
    setParseProgress(100)
    setParseMessage(`Parsed ${parsed.components.length} components.`)
    setExportHtml('')
    setDirty()
    return parsed
  }, [setDirty])

  const runParseWithProgress = useCallback(async (html: string) => {
    const preflight = validatePastedHtml(html)
    if (preflight) {
      setImportError(preflight)
      setParseStatus('failed')
      setParseProgress(0)
      setParseMessage(preflight.message)
      return
    }

    const controller = new AbortController()
    parseAbortRef.current = controller
    setImportError(null)
    setParseStatus('parsing')
    setParseProgress(5)
    setParseMessage('Validating input…')

    try {
      await delay(100)
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
      setParseProgress(35)
      setParseMessage('Parsing slide HTML…')

      await delay(120)
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
      setParseProgress(70)
      setParseMessage('Normalizing components…')

      await delay(120)
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')

      parseHtmlSync(html)
      setParseProgress(100)
      setParseMessage('Parse complete.')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setParseStatus('canceled')
        setParseProgress(0)
        setParseMessage('Import canceled.')
        return
      }

      const failure = classifyImportError(error)
      setImportError(failure)
      setParseStatus('failed')
      setParseProgress(0)
      setParseMessage(failure.message)
    } finally {
      parseAbortRef.current = null
    }
  }, [parseHtmlSync])

  const cancelParse = useCallback(() => {
    parseAbortRef.current?.abort()
  }, [])

  const refreshLibraryData = useCallback(async () => {
    setLibraryLoading(true)
    setLibraryError(null)
    try {
      const [slideRows, templateRows, auditRows] = await Promise.all([
        listSlides(actor, searchValue),
        listTemplates(actor, searchValue),
        listSlideAudits(actor, 40),
      ])
      setSlides(slideRows)
      setTemplates(templateRows)
      setAudits(auditRows)
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    } finally {
      setLibraryLoading(false)
    }
  }, [actor, searchValue])

  useEffect(() => {
    void refreshLibraryData()
  }, [refreshLibraryData])

  const handleSave = useCallback(async (options?: { autosave?: boolean; overwrite?: boolean }) => {
    if (!result) {
      setSaveStatus('error')
      setSaveError('Parse HTML before saving a slide.')
      return null
    }

    setSaveStatus('saving')
    setSaveError(null)

    try {
      const response = await saveSlide(actor, {
        id: activeSlideId || undefined,
        title: slideTitle.trim() || 'Untitled Slide',
        canvas: result.canvas,
        components: result.components,
        metadata: {
          warning_count: result.warnings.length,
          warnings: result.warnings,
          raw_html_length: rawHtml.length,
        },
        revision: activeRevision,
        autosave: options?.autosave === true,
        overwrite: options?.overwrite === true,
      })

      setActiveSlideId(response.slide.id)
      setActiveRevision(response.slide.revision)
      setSlideTitle(response.slide.title)
      setLastSavedAt(response.slide.updated_at)
      setSaveStatus('saved')
      setConflictServerSlide(null)
      setSaveError(null)

      await refreshLibraryData()
      return response.slide
    } catch (error) {
      if (error instanceof SlideConflictError) {
        setSaveStatus('conflict')
        setConflictServerSlide(error.serverSlide)
        setSaveError('Save conflict: newer revision exists. Reload, overwrite, or save as copy.')
        return null
      }

      setSaveStatus('error')
      setSaveError(error instanceof Error ? error.message : String(error))
      return null
    }
  }, [activeRevision, activeSlideId, actor, rawHtml.length, refreshLibraryData, result, slideTitle])

  useEffect(() => {
    if (!autosaveEnabled || saveStatus !== 'dirty' || !result) return

    const timer = window.setTimeout(() => {
      void handleSave({ autosave: true })
    }, AUTOSAVE_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [autosaveEnabled, handleSave, result, saveStatus])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const raw = window.localStorage.getItem(DRAFT_RECOVERY_KEY)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as DraftSnapshot
      if (!parsed || typeof parsed !== 'object') return
      setRecoveryDraft(parsed)
    } catch {
      window.localStorage.removeItem(DRAFT_RECOVERY_KEY)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const hasDraft = rawHtml.trim().length > 0 || !!result
    if (!hasDraft) return

    const snapshot: DraftSnapshot = {
      rawHtml,
      title: slideTitle,
      activeSlideId,
      revision: activeRevision,
      result,
      createdAt: new Date().toISOString(),
    }
    window.localStorage.setItem(DRAFT_RECOVERY_KEY, JSON.stringify(snapshot))
  }, [activeRevision, activeSlideId, rawHtml, result, slideTitle])

  const restoreDraft = useCallback(() => {
    if (!recoveryDraft) return
    setRawHtml(recoveryDraft.rawHtml)
    setSlideTitle(recoveryDraft.title || 'Recovered Slide')
    setActiveSlideId(recoveryDraft.activeSlideId)
    setActiveRevision(recoveryDraft.revision || 0)
    setResult(recoveryDraft.result)
    setSaveStatus('dirty')
    setRecoveryDraft(null)
  }, [recoveryDraft])

  const discardDraft = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DRAFT_RECOVERY_KEY)
    }
    setRecoveryDraft(null)
  }, [])

  const onFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileValidation = validateImportFile(file)
    if (fileValidation) {
      setImportError(fileValidation)
      setParseStatus('failed')
      setParseProgress(0)
      setParseMessage(fileValidation.message)
      event.target.value = ''
      return
    }

    const text = await file.text()
    setRawHtml(text)
    await runParseWithProgress(text)
    event.target.value = ''
  }, [runParseWithProgress])

  const openFilePicker = useCallback(() => fileInputRef.current?.click(), [])

  const loadSlide = useCallback((slide: SlideRecord) => {
    setWorkspaceTab('import')
    setResult({
      canvas: slide.canvas,
      components: slide.components,
      warnings: Array.isArray(slide.metadata?.warnings) ? slide.metadata.warnings as string[] : [],
    })
    setRawHtml('')
    setSlideTitle(slide.title)
    setActiveSlideId(slide.id)
    setActiveRevision(slide.revision)
    setSaveStatus('clean')
    setSaveError(null)
    setLastSavedAt(slide.updated_at)
    setExportHtml('')
  }, [])

  const handleDuplicateSlide = useCallback(async (slideId: string) => {
    try {
      const copy = await duplicateSlide(actor, slideId)
      await refreshLibraryData()
      loadSlide(copy)
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    }
  }, [actor, loadSlide, refreshLibraryData])

  const handleRenameSlide = useCallback(async (slide: SlideRecord) => {
    const name = window.prompt('Rename slide', slide.title)
    if (!name || !name.trim()) return

    try {
      const updated = await renameSlide(actor, slide.id, name.trim())
      await refreshLibraryData()
      if (activeSlideId === updated.id) {
        setSlideTitle(updated.title)
        setActiveRevision(updated.revision)
      }
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    }
  }, [activeSlideId, actor, refreshLibraryData])

  const handleDeleteSlide = useCallback(async (slide: SlideRecord) => {
    const approved = window.confirm(`Delete slide "${slide.title}"?`)
    if (!approved) return

    try {
      await deleteSlide(actor, slide.id)
      await refreshLibraryData()
      if (activeSlideId === slide.id) {
        setActiveSlideId(null)
        setActiveRevision(0)
        setSaveStatus('clean')
      }
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    }
  }, [activeSlideId, actor, refreshLibraryData])

  const handleDuplicateTemplate = useCallback(async (templateId: string) => {
    try {
      const slide = await duplicateTemplateAsSlide(actor, templateId)
      await refreshLibraryData()
      loadSlide(slide)
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    }
  }, [actor, loadSlide, refreshLibraryData])

  const handlePublishTemplate = useCallback(async (slide: SlideRecord) => {
    const name = window.prompt('Template name', `${slide.title} Template`)
    if (!name || !name.trim()) return

    try {
      await publishTemplateFromSlide(actor, slide.id, name.trim())
      await refreshLibraryData()
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    }
  }, [actor, refreshLibraryData])

  const generateExport = useCallback(() => {
    if (!result) return ''
    const html = convertSlideComponentsToHtml({
      canvas: result.canvas,
      components: result.components,
      metadata: {
        slideId: activeSlideId || 'unsaved-slide',
        revision: activeRevision,
        source: 'oliver-app',
      },
    })
    setExportHtml(html)
    return html
  }, [activeRevision, activeSlideId, result])

  const downloadTextFile = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }, [])

  const copyParsedJson = useCallback(async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(result.components, null, 2))
      setJsonCopyState('copied')
      window.setTimeout(() => setJsonCopyState('idle'), 1400)
    } catch {
      setJsonCopyState('failed')
      window.setTimeout(() => setJsonCopyState('idle'), 2000)
    }
  }, [result])

  const handleExportHtml = useCallback(async () => {
    if (!result) return
    const html = exportHtml || generateExport()
    if (!html) return

    downloadTextFile(html, `${(slideTitle || 'slide').replace(/\s+/g, '-').toLowerCase()}.html`, 'text/html;charset=utf-8')

    if (activeSlideId) {
      await recordExportEvent(actor, {
        slideId: activeSlideId,
        format: 'html',
        outcome: 'success',
      })
      await refreshLibraryData()
    }
  }, [activeSlideId, actor, downloadTextFile, exportHtml, generateExport, refreshLibraryData, result, slideTitle])

  const handleExportPdf = useCallback(async () => {
    if (!result) return
    const html = exportHtml || generateExport()
    if (!html) return

    try {
      const popup = window.open('', '_blank', 'noopener,noreferrer')
      if (!popup) throw new Error('Popup blocked by browser')
      popup.document.write(html)
      popup.document.close()
      popup.focus()
      popup.print()

      if (activeSlideId) {
        await recordExportEvent(actor, {
          slideId: activeSlideId,
          format: 'pdf',
          outcome: 'success',
        })
      }
      await refreshLibraryData()
    } catch (error) {
      setSaveError('PDF export failed. Use HTML export and browser print as fallback.')
      if (activeSlideId) {
        await recordExportEvent(actor, {
          slideId: activeSlideId,
          format: 'pdf',
          outcome: 'failure',
          errorClass: error instanceof Error ? error.message : 'pdf_export_error',
        })
      }
      await refreshLibraryData()
    }
  }, [activeSlideId, actor, exportHtml, generateExport, refreshLibraryData, result])

  const handleConflictReload = useCallback(() => {
    if (!conflictServerSlide) return
    loadSlide(conflictServerSlide)
    setConflictServerSlide(null)
  }, [conflictServerSlide, loadSlide])

  const handleConflictOverwrite = useCallback(async () => {
    await handleSave({ overwrite: true })
  }, [handleSave])

  const handleConflictSaveAsCopy = useCallback(async () => {
    if (!result) return

    const copyTitle = `${slideTitle} (Copy)`
    setConflictServerSlide(null)
    setSaveStatus('saving')
    setSaveError(null)

    try {
      const response = await saveSlide(actor, {
        title: copyTitle,
        canvas: result.canvas,
        components: result.components,
        metadata: {
          warning_count: result.warnings.length,
          warnings: result.warnings,
          raw_html_length: rawHtml.length,
        },
      })

      setActiveSlideId(response.slide.id)
      setActiveRevision(response.slide.revision)
      setSlideTitle(response.slide.title)
      setLastSavedAt(response.slide.updated_at)
      setSaveStatus('saved')
      await refreshLibraryData()
    } catch (error) {
      setSaveStatus('error')
      setSaveError(error instanceof Error ? error.message : String(error))
    }
  }, [actor, rawHtml.length, refreshLibraryData, result, slideTitle])

  const oliverConfig = useMemo<OliverConfig>(() => {
    const actions: OliverAction[] = SLIDES_COMMANDS.map((command) => {
      let run: () => void

      switch (command.id) {
        case 'slides-import-file':
          run = () => openFilePicker()
          break
        case 'slides-parse-pasted':
          run = () => {
            try {
              parseHtmlSync(rawHtml)
            } catch {
              // parser state already updated by parseHtmlSync
            }
          }
          break
        default:
          run = () => {}
      }

      return { ...command, run }
    })

    const flows = buildSlidesFlows({
      rawHtml,
      openFilePicker,
      parseHtml: parseHtmlSync,
    })

    return buildModuleOliverConfig('slides', {
      greeting: "Hi, I'm Oliver. Import HTML slides, validate parser output, then save to My Slides with autosave and export controls.",
      actions,
      flows,
      quickConvos: [
        'What HTML structure imports best?',
        'Show parse warnings grouped by category',
        'How does save conflict handling work?',
      ],
      contextPayload: () => ({
        imported_components: result?.components.length ?? 0,
        canvas: result?.canvas ?? null,
        warnings: result?.warnings ?? [],
        save_status: saveStatus,
        active_slide_id: activeSlideId,
      }),
    })
  }, [activeSlideId, openFilePicker, parseHtmlSync, rawHtml, result, saveStatus])

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
          <button
            type="button"
            className={'app-sidebar-item' + (workspaceTab === 'import' ? ' active' : '')}
            onClick={() => setWorkspaceTab('import')}
          >
            Import Workspace
          </button>
          <button
            type="button"
            className={'app-sidebar-item' + (workspaceTab === 'my-slides' ? ' active' : '')}
            onClick={() => setWorkspaceTab('my-slides')}
          >
            My Slides
          </button>
          <button
            type="button"
            className={'app-sidebar-item' + (workspaceTab === 'templates' ? ' active' : '')}
            onClick={() => setWorkspaceTab('templates')}
          >
            Template Library
          </button>
          <button
            type="button"
            className={'app-sidebar-item' + (workspaceTab === 'activity' ? ' active' : '')}
            onClick={() => setWorkspaceTab('activity')}
          >
            Activity
          </button>
        </div>
      </nav>

      <div className="main slides-main">
        <header className="topbar">
          <button
            className="topbar-hamburger"
            onClick={() => setSidebarOpen((open) => !open)}
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
              Import existing slide HTML, review structured parser output, then save to My Slides. Canvas editing remains in backlog; save/export contracts are now wired.
            </p>

            {recoveryDraft && (
              <div className="slides-recovery" role="status">
                <div>
                  Recovered draft available from {formatDateTime(recoveryDraft.createdAt)}.
                </div>
                <div className="slides-inline-actions">
                  <button type="button" className="btn btn-sm btn-primary" onClick={restoreDraft}>Restore Draft</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={discardDraft}>Discard</button>
                </div>
              </div>
            )}

            <div className="slides-toolbar-row">
              <label className="slides-search-wrap" htmlFor="slides-search">
                <span className="slides-search-label">Search library</span>
                <input
                  id="slides-search"
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search slides or templates"
                  className="slides-search"
                />
              </label>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => void refreshLibraryData()} disabled={libraryLoading}>
                {libraryLoading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            {libraryError && (
              <p className="slides-error" role="alert">
                Library error: {libraryError}
              </p>
            )}

            {workspaceTab === 'import' && (
              <>
                <div className="slides-actions">
                  <button type="button" className="btn btn-primary" onClick={openFilePicker} disabled={parseStatus === 'parsing'}>
                    Import HTML File
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => void runParseWithProgress(rawHtml)}
                    disabled={parseStatus === 'parsing'}
                  >
                    Parse Pasted HTML
                  </button>
                  {parseStatus === 'parsing' && (
                    <button type="button" className="btn btn-danger" onClick={cancelParse}>
                      Cancel Parse
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  id="slides-html-file"
                  type="file"
                  accept=".html,.htm,text/html"
                  onChange={onFileChange}
                  hidden
                />

                <div className="slides-progress" role="status" aria-live="polite">
                  <div className="slides-progress-label">
                    <span>{parseMessage}</span>
                    <span>{parseProgress}%</span>
                  </div>
                  <div className="slides-progress-track" aria-hidden="true">
                    <div className="slides-progress-fill" style={{ width: `${parseProgress}%` }} />
                  </div>
                </div>

                <label className="slides-label" htmlFor="slides-raw-html">Raw HTML</label>
                <textarea
                  id="slides-raw-html"
                  className="slides-textarea"
                  value={rawHtml}
                  onChange={(event) => {
                    setRawHtml(event.target.value)
                    if (result) setDirty()
                  }}
                  placeholder="<div class='slide-canvas' style='width:1920px;height:1080px;'>...</div>"
                  disabled={parseStatus === 'parsing'}
                />

                {importError && (
                  <div className="slides-error" role="alert">
                    <div>
                      Import failed ({importError.code.replace(/_/g, ' ')}): {importError.message}
                    </div>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => setImportError(null)}>
                      Clear
                    </button>
                  </div>
                )}

                <div className="slides-save-panel">
                  <label className="slides-label" htmlFor="slides-title">Slide Title</label>
                  <input
                    id="slides-title"
                    className="slides-input"
                    value={slideTitle}
                    onChange={(event) => {
                      setSlideTitle(event.target.value)
                      if (result) setDirty()
                    }}
                    placeholder="Untitled Slide"
                  />

                  <div className="slides-inline-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => void handleSave()}
                      disabled={!result || saveStatus === 'saving'}
                    >
                      {saveStatus === 'saving' ? 'Saving…' : 'Save Slide'}
                    </button>
                    <label className="slides-checkbox-row">
                      <input
                        type="checkbox"
                        checked={autosaveEnabled}
                        onChange={(event) => setAutosaveEnabled(event.target.checked)}
                      />
                      Autosave every 5s when dirty
                    </label>
                  </div>

                  <p className="slides-save-status" data-save-status={saveStatus}>
                    Save status: {saveStatus}
                    {lastSavedAt ? ` · Last saved ${formatDateTime(lastSavedAt)}` : ''}
                  </p>

                  {saveError && (
                    <p className="slides-error" role="alert">
                      {saveError}
                    </p>
                  )}

                  {saveStatus === 'conflict' && conflictServerSlide && (
                    <div className="slides-conflict">
                      <p>
                        Conflict with server revision {conflictServerSlide.revision}.
                      </p>
                      <div className="slides-inline-actions">
                        <button type="button" className="btn btn-sm btn-ghost" onClick={handleConflictReload}>Reload Server Version</button>
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => void handleConflictOverwrite()}>Overwrite Server</button>
                        <button type="button" className="btn btn-sm btn-ghost" onClick={() => void handleConflictSaveAsCopy()}>Save as Copy</button>
                      </div>
                    </div>
                  )}
                </div>

                {result && (
                  <div className="slides-results">
                    <p className="slides-summary">
                      Canvas: {result.canvas.width} × {result.canvas.height} · Components: {result.components.length}
                    </p>

                    {warningGroups.length > 0 && (
                      <div className="slides-warning-groups">
                        {warningGroups.map((group) => (
                          <div key={group.label} className="slides-warning-group">
                            <h3>{group.label}</h3>
                            <ul className="slides-warning-list">
                              {group.items.map((item) => (
                                <li key={item.text}>
                                  {item.text}
                                  {item.count > 1 ? ` (${item.count})` : ''}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="slides-inline-actions">
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => void copyParsedJson()}>
                        {jsonCopyState === 'copied' ? 'JSON Copied' : jsonCopyState === 'failed' ? 'Copy Failed' : 'Copy Parsed JSON'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => downloadTextFile(JSON.stringify(result.components, null, 2), `${(slideTitle || 'slide').replace(/\s+/g, '-').toLowerCase()}.json`, 'application/json;charset=utf-8')}
                      >
                        Download JSON
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => generateExport()}>
                        Generate HTML Export
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => void handleExportHtml()}>
                        Download HTML
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => void handleExportPdf()}>
                        Export PDF (Print)
                      </button>
                    </div>

                    <div className="slides-component-grid" role="table" aria-label="Parsed component summary">
                      <div className="slides-component-grid-header" role="row">
                        <span>Type</span>
                        <span>X</span>
                        <span>Y</span>
                        <span>W</span>
                        <span>H</span>
                        <span>Source</span>
                      </div>
                      {result.components.map((component) => (
                        <div key={component.id} className="slides-component-grid-row" role="row">
                          <span>{component.type}</span>
                          <span>{component.x}</span>
                          <span>{component.y}</span>
                          <span>{component.width}</span>
                          <span>{component.height ?? '-'}</span>
                          <span>{component.sourceLabel || component.type}</span>
                        </div>
                      ))}
                    </div>

                    {exportHtml && (
                      <>
                        <label className="slides-label" htmlFor="slides-export-html">Export HTML (deterministic metadata)</label>
                        <textarea id="slides-export-html" className="slides-textarea slides-export-textarea" value={exportHtml} readOnly />
                      </>
                    )}

                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => setShowRawJson((value) => !value)}
                    >
                      {showRawJson ? 'Hide Raw JSON' : 'Show Raw JSON'}
                    </button>

                    {showRawJson && (
                      <pre className="slides-code">
                        {JSON.stringify(result.components, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </>
            )}

            {workspaceTab === 'my-slides' && (
              <div className="slides-library-section">
                <h2>My Slides</h2>
                {slides.length === 0 && (
                  <p className="slides-empty">No saved slides yet. Parse HTML and click Save Slide to create your first record.</p>
                )}
                {slides.map((slide) => (
                  <article key={slide.id} className="slides-library-card">
                    <div>
                      <h3>{slide.title}</h3>
                      <p>Updated: {formatDateTime(slide.updated_at)} · Revision: {slide.revision}</p>
                      <p>Components: {slide.components.length}</p>
                    </div>
                    <div className="slides-inline-actions">
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => loadSlide(slide)}>Load</button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => void handleDuplicateSlide(slide.id)}>Duplicate</button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => void handleRenameSlide(slide)}>Rename</button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => void handlePublishTemplate(slide)}>Publish Template</button>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => void handleDeleteSlide(slide)}>Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {workspaceTab === 'templates' && (
              <div className="slides-library-section">
                <h2>Template Library</h2>
                {templates.length === 0 && (
                  <p className="slides-empty">No templates available yet.</p>
                )}
                {templates.map((template) => (
                  <article key={template.id} className="slides-library-card">
                    <div>
                      <h3>{template.name}</h3>
                      <p>{template.description || 'No description'}</p>
                      <p>
                        Visibility: {template.is_shared ? 'Shared' : 'Private'} · Updated: {formatDateTime(template.updated_at)}
                      </p>
                    </div>
                    <div className="slides-inline-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => void handleDuplicateTemplate(template.id)}
                      >
                        Duplicate to My Slides
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {workspaceTab === 'activity' && (
              <div className="slides-library-section">
                <h2>Slide Operations</h2>
                {audits.length === 0 && (
                  <p className="slides-empty">No audit events found yet.</p>
                )}
                {audits.map((event) => (
                  <article key={event.id} className="slides-library-card">
                    <div>
                      <h3>{event.action}</h3>
                      <p>
                        Entity: {event.entity_type} ({event.entity_id}) · Outcome: {event.outcome}
                      </p>
                      <p>
                        Actor: {event.actor_email || event.actor_user_id} · {formatDateTime(event.created_at)}
                      </p>
                      {event.error_class && <p>Error: {event.error_class}</p>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
