'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRegisterOliver } from '@/components/shared/OliverContext'
import type { OliverAction, OliverConfig } from '@/components/shared/OliverContext'
import type { CSSProperties, FocusEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { SlideComponent, SlideComponentType, SlideImportResult } from '@/components/slides/types'
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
const AUTOSAVE_RETRY_BASE_DELAY_MS = 2000
const AUTOSAVE_RETRY_MAX_DELAY_MS = 60000
const LEGACY_DRAFT_RECOVERY_KEY = 'oliver-slide-draft-v1'
const DRAFT_RECOVERY_KEY_PREFIX = 'oliver-slide-draft-v2'
const UNSAVED_CHANGES_CONFIRM_TEXT = 'You have unsaved slide changes. Discard them and continue?'

type ParseStatus = 'idle' | 'parsing' | 'completed' | 'canceled' | 'failed'
type SaveStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'queued' | 'error' | 'conflict'
type WorkspaceTab = 'import' | 'my-slides' | 'templates' | 'activity'

interface DraftSnapshot {
  rawHtml: string
  title: string
  activeSlideId: string | null
  revision: number
  result: SlideImportResult | null
  createdAt: string
}

interface AutosaveRetryState {
  attempt: number
  delayMs: number
  nextAttemptAt: number
  lastError: string
}

interface CanvasDragState {
  componentIds: string[]
  pointerId: number
  startClientX: number
  startClientY: number
  originById: Record<string, { x: number; y: number }>
  snapshotBefore: SlideComponent[]
}

interface CanvasResizeState {
  componentId: string
  pointerId: number
  startClientX: number
  startClientY: number
  originX: number
  originY: number
  originWidth: number
  originHeight: number
  supportsHeight: boolean
  snapshotBefore: SlideComponent[]
}

interface CanvasEditorNotice {
  tone: 'info' | 'error'
  text: string
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

const CANVAS_DEFAULT_WIDTH = 1920
const CANVAS_DEFAULT_HEIGHT = 1080
const MIN_COMPONENT_WIDTH = 48
const MIN_COMPONENT_HEIGHT = 32
const MIN_FONT_SIZE = 14
const MAX_HISTORY_ENTRIES = 80

const EDITABLE_COMPONENT_TYPES = new Set<SlideComponentType>([
  'text',
  'heading',
  'subheading',
  'card',
  'row',
  'stat',
  'tag-line',
  'panel',
])

function sanitizeHtmlContent(content: string): string {
  return content
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\s(href|src)\s*=\s*"javascript:[^"]*"/gi, '')
    .replace(/\s(href|src)\s*=\s*'javascript:[^']*'/gi, '')
}

function toColorInputValue(color: string | undefined, fallback: string): string {
  if (typeof color !== 'string') return fallback
  const value = color.trim()
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return value
  return fallback
}

function buildCanvasComponentStyle(component: SlideComponent): CSSProperties {
  const style: CSSProperties = {
    left: `${component.x}px`,
    top: `${component.y}px`,
    width: `${component.width}px`,
  }

  if (typeof component.height === 'number') style.height = `${component.height}px`
  if (component.style.fontSize) style.fontSize = `${component.style.fontSize}px`
  if (component.style.fontWeight) style.fontWeight = component.style.fontWeight
  if (component.style.color) style.color = component.style.color
  if (component.style.backgroundColor) style.backgroundColor = component.style.backgroundColor
  if (component.style.fontStyle) style.fontStyle = component.style.fontStyle
  if (component.style.lineHeight) style.lineHeight = `${component.style.lineHeight}px`
  if (component.style.textAlign) style.textAlign = component.style.textAlign

  return style
}

function clampCanvasCoordinates(
  component: SlideComponent,
  canvas: { width: number; height: number },
  nextX: number,
  nextY: number,
) {
  const maxX = Math.max(0, canvas.width - component.width)
  const componentHeight = typeof component.height === 'number' ? component.height : 0
  const maxY = Math.max(0, canvas.height - componentHeight)
  return {
    x: Math.min(maxX, Math.max(0, nextX)),
    y: Math.min(maxY, Math.max(0, nextY)),
  }
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
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([])
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null)
  const [draggingComponentId, setDraggingComponentId] = useState<string | null>(null)
  const [resizingComponentId, setResizingComponentId] = useState<string | null>(null)
  const [editorNotice, setEditorNotice] = useState<CanvasEditorNotice | null>(null)
  const [historyPast, setHistoryPast] = useState<SlideComponent[][]>([])
  const [historyFuture, setHistoryFuture] = useState<SlideComponent[][]>([])

  const [slideTitle, setSlideTitle] = useState('Untitled Slide')
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null)
  const [activeRevision, setActiveRevision] = useState(0)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('clean')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [autosaveEnabled, setAutosaveEnabled] = useState(true)
  const [autosaveRetryState, setAutosaveRetryState] = useState<AutosaveRetryState | null>(null)
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
  const canvasHostRef = useRef<HTMLDivElement | null>(null)
  const [canvasScale, setCanvasScale] = useState(1)
  const canvasDragRef = useRef<CanvasDragState | null>(null)
  const canvasResizeRef = useRef<CanvasResizeState | null>(null)
  const canvasDragMovedRef = useRef(false)
  const canvasResizeMovedRef = useRef(false)
  const canvasContentRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const actor = useMemo(() => ({
    user_id: appUser?.user_id || 'qa-admin-user',
    user_email: appUser?.email || 'qa-admin@example.com',
  }), [appUser])
  const draftRecoveryKey = useMemo(() => `${DRAFT_RECOVERY_KEY_PREFIX}:${actor.user_id}`, [actor.user_id])
  const trimmedSearchValue = searchValue.trim()
  const searchLabel = workspaceTab === 'activity' ? 'Search activity' : 'Search library'
  const searchPlaceholder = workspaceTab === 'activity' ? 'Search activity events' : 'Search slides or templates'

  const warningGroups = useMemo(() => summarizeWarnings(result?.warnings || []), [result])
  const filteredAudits = useMemo(() => {
    const query = trimmedSearchValue.toLowerCase()
    if (!query) return audits
    return audits.filter((event) => {
      const haystack = [
        event.action,
        event.entity_type,
        event.entity_id,
        event.outcome,
        event.error_class || '',
        event.actor_email || '',
        event.actor_user_id,
      ].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [audits, trimmedSearchValue])
  const canvasDimensions = useMemo(() => {
    const width = result?.canvas.width || CANVAS_DEFAULT_WIDTH
    const height = result?.canvas.height || CANVAS_DEFAULT_HEIGHT
    return { width, height }
  }, [result])
  const hasUnsavedChanges = useMemo(() => {
    const hasDraftContent = rawHtml.trim().length > 0 || !!result
    if (!hasDraftContent) return false
    if (saveStatus === 'clean' || saveStatus === 'saved') return false
    return true
  }, [rawHtml, result, saveStatus])
  const primarySelectedComponentId = selectedComponentIds[0] || null
  const selectedComponents = useMemo(() => {
    if (!result || selectedComponentIds.length === 0) return []
    const byId = new Map(result.components.map((component) => [component.id, component]))
    return selectedComponentIds
      .map((id) => byId.get(id))
      .filter((component): component is SlideComponent => !!component)
  }, [result, selectedComponentIds])
  const canInlineEditSelected =
    selectedComponents.length === 1 &&
    !selectedComponents[0].locked &&
    EDITABLE_COMPONENT_TYPES.has(selectedComponents[0].type)
  const selectedStyle = useMemo(() => {
    if (selectedComponents.length === 0) return null
    const lead = selectedComponents[0]
    return {
      fontSize: Math.max(MIN_FONT_SIZE, lead.style.fontSize || MIN_FONT_SIZE),
      fontWeight: lead.style.fontWeight || 400,
      fontStyle: lead.style.fontStyle || 'normal',
      textAlign: lead.style.textAlign || 'left',
      color: toColorInputValue(lead.style.color, '#0f172a'),
      backgroundColor: toColorInputValue(lead.style.backgroundColor, '#ffffff'),
    }
  }, [selectedComponents])

  const cloneComponents = useCallback(
    (components: SlideComponent[]) =>
      components.map((component) => ({
        ...component,
        style: { ...component.style },
      })),
    [],
  )

  const areComponentsEqual = useCallback((a: SlideComponent[], b: SlideComponent[]) => {
    if (a.length !== b.length) return false
    for (let index = 0; index < a.length; index += 1) {
      const left = a[index]
      const right = b[index]
      if (
        left.id !== right.id ||
        left.type !== right.type ||
        left.x !== right.x ||
        left.y !== right.y ||
        left.width !== right.width ||
        left.height !== right.height ||
        left.content !== right.content ||
        left.locked !== right.locked ||
        left.visible !== right.visible ||
        left.sourceLabel !== right.sourceLabel
      ) {
        return false
      }
      const leftStyle = left.style || {}
      const rightStyle = right.style || {}
      if (
        leftStyle.fontSize !== rightStyle.fontSize ||
        leftStyle.fontWeight !== rightStyle.fontWeight ||
        leftStyle.color !== rightStyle.color ||
        leftStyle.backgroundColor !== rightStyle.backgroundColor ||
        leftStyle.fontStyle !== rightStyle.fontStyle ||
        leftStyle.lineHeight !== rightStyle.lineHeight ||
        leftStyle.textAlign !== rightStyle.textAlign
      ) {
        return false
      }
    }
    return true
  }, [])

  const pushHistorySnapshot = useCallback((components: SlideComponent[]) => {
    setHistoryPast((previous) => {
      if (previous.length > 0 && areComponentsEqual(previous[previous.length - 1], components)) {
        return previous
      }
      const next = [...previous, cloneComponents(components)]
      if (next.length > MAX_HISTORY_ENTRIES) {
        return next.slice(next.length - MAX_HISTORY_ENTRIES)
      }
      return next
    })
    setHistoryFuture([])
  }, [areComponentsEqual, cloneComponents])

  const clearHistory = useCallback(() => {
    setHistoryPast([])
    setHistoryFuture([])
  }, [])

  const isTextEntryTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false
    if (target.closest('[contenteditable="true"]')) return true
    const tag = target.tagName.toLowerCase()
    return tag === 'input' || tag === 'textarea' || tag === 'select'
  }, [])

  const confirmDiscardUnsaved = useCallback(() => {
    if (!hasUnsavedChanges) return true
    return window.confirm(UNSAVED_CHANGES_CONFIRM_TEXT)
  }, [hasUnsavedChanges])

  const handleWorkspaceTabChange = useCallback((nextTab: WorkspaceTab) => {
    if (nextTab === workspaceTab) return true
    if (!confirmDiscardUnsaved()) return false
    setWorkspaceTab(nextTab)
    return true
  }, [confirmDiscardUnsaved, workspaceTab])

  const handleBackToHubClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    if (confirmDiscardUnsaved()) return
    event.preventDefault()
  }, [confirmDiscardUnsaved])

  const setDirty = useCallback(() => {
    setAutosaveRetryState(null)
    setSaveStatus((previous) => {
      if (previous === 'saving') return previous
      return 'dirty'
    })
  }, [])

  const queueAutosaveRetry = useCallback((errorMessage: string) => {
    const attempt = (autosaveRetryState?.attempt || 0) + 1
    const delayMs = Math.min(
      AUTOSAVE_RETRY_MAX_DELAY_MS,
      AUTOSAVE_RETRY_BASE_DELAY_MS * (2 ** (attempt - 1)),
    )
    const retryInSeconds = Math.max(1, Math.ceil(delayMs / 1000))
    setAutosaveRetryState({
      attempt,
      delayMs,
      nextAttemptAt: Date.now() + delayMs,
      lastError: errorMessage,
    })
    setSaveStatus('queued')
    setSaveError(`Autosave failed (${errorMessage}). Retrying in ${retryInSeconds}s.`)
  }, [autosaveRetryState])

  const scheduleAutosaveRetryNow = useCallback(() => {
    setAutosaveRetryState((previous) => {
      if (!previous) return null
      return {
        ...previous,
        nextAttemptAt: Date.now(),
      }
    })
  }, [])

  const dismissAutosaveRetry = useCallback(() => {
    setAutosaveRetryState(null)
    setSaveError(null)
    setSaveStatus(result ? 'dirty' : 'clean')
  }, [result])

  const updateCanvasComponentContent = useCallback((componentId: string, content: string) => {
    if (!result) return
    const existing = result.components.find((component) => component.id === componentId)
    if (!existing || existing.locked || existing.content === content) return
    pushHistorySnapshot(result.components)
    setResult((previous) => {
      if (!previous) return previous

      const nextComponents = previous.components.map((component) => {
        if (component.id !== componentId) return component
        return {
          ...component,
          content,
        }
      })
      return {
        ...previous,
        components: nextComponents,
      }
    })
    setDirty()
  }, [pushHistorySnapshot, result, setDirty])

  const focusInlineEditor = useCallback((componentId: string) => {
    window.requestAnimationFrame(() => {
      const node = canvasContentRefs.current[componentId]
      if (!node) return
      node.focus()
      if (document.getSelection) {
        const selection = document.getSelection()
        if (!selection) return
        const range = document.createRange()
        range.selectNodeContents(node)
        range.collapse(false)
        selection.removeAllRanges()
        selection.addRange(range)
      }
    })
  }, [])

  const beginInlineEditMode = useCallback((componentId: string) => {
    if (!result) return
    const component = result.components.find((entry) => entry.id === componentId)
    if (!component || component.locked || !EDITABLE_COMPONENT_TYPES.has(component.type)) return
    setSelectedComponentIds([componentId])
    setEditingComponentId(componentId)
    focusInlineEditor(componentId)
  }, [focusInlineEditor, result])

  const handleCanvasLayerSelect = useCallback((componentId: string, options?: { multi?: boolean }) => {
    setEditingComponentId(null)
    if (options?.multi) {
      setSelectedComponentIds((previous) => {
        if (previous.includes(componentId)) {
          return previous.filter((id) => id !== componentId)
        }
        return [...previous, componentId]
      })
      return
    }
    setSelectedComponentIds([componentId])
  }, [])

  const handleUndo = useCallback(() => {
    if (!result || historyPast.length === 0) return
    const previousSnapshot = historyPast[historyPast.length - 1]
    const currentSnapshot = cloneComponents(result.components)
    setHistoryPast(historyPast.slice(0, -1))
    setHistoryFuture((previous) => {
      const next = [...previous, currentSnapshot]
      return next.length > MAX_HISTORY_ENTRIES ? next.slice(next.length - MAX_HISTORY_ENTRIES) : next
    })
    setResult({
      ...result,
      components: cloneComponents(previousSnapshot),
    })
    setSelectedComponentIds((previous) => previous.filter((id) => previousSnapshot.some((component) => component.id === id)))
    setEditingComponentId(null)
    setEditorNotice({ tone: 'info', text: 'Undid last editor action.' })
    setDirty()
  }, [cloneComponents, historyPast, result, setDirty])

  const handleRedo = useCallback(() => {
    if (!result || historyFuture.length === 0) return
    const nextSnapshot = historyFuture[historyFuture.length - 1]
    const currentSnapshot = cloneComponents(result.components)
    setHistoryFuture(historyFuture.slice(0, -1))
    setHistoryPast((previous) => {
      const next = [...previous, currentSnapshot]
      return next.length > MAX_HISTORY_ENTRIES ? next.slice(next.length - MAX_HISTORY_ENTRIES) : next
    })
    setResult({
      ...result,
      components: cloneComponents(nextSnapshot),
    })
    setSelectedComponentIds((previous) => previous.filter((id) => nextSnapshot.some((component) => component.id === id)))
    setEditingComponentId(null)
    setEditorNotice({ tone: 'info', text: 'Redid editor action.' })
    setDirty()
  }, [cloneComponents, historyFuture, result, setDirty])

  const handleCanvasKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!result) return
    if (isTextEntryTarget(event.target)) {
      if (event.key === 'Escape' && editingComponentId) {
        setEditingComponentId(null)
        const target = event.target as HTMLElement
        target.blur()
      }
      return
    }

    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'a') {
      event.preventDefault()
      const ids = result.components.filter((component) => component.visible !== false).map((component) => component.id)
      setSelectedComponentIds(ids)
      setEditorNotice({ tone: 'info', text: `Selected ${ids.length} layers.` })
      return
    }

    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) {
        handleRedo()
      } else {
        handleUndo()
      }
      return
    }

    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'y') {
      event.preventDefault()
      handleRedo()
      return
    }

    if (event.key === 'Escape') {
      setSelectedComponentIds([])
      setEditingComponentId(null)
      return
    }

    if (event.key === 'PageDown' || event.key === 'PageUp') {
      event.preventDefault()
      const visibleIds = result.components.filter((component) => component.visible !== false).map((component) => component.id)
      if (visibleIds.length === 0) return
      const direction = event.key === 'PageDown' ? 1 : -1
      const currentIndex = primarySelectedComponentId ? visibleIds.indexOf(primarySelectedComponentId) : -1
      const nextIndex = currentIndex < 0
        ? 0
        : (currentIndex + direction + visibleIds.length) % visibleIds.length
      setSelectedComponentIds([visibleIds[nextIndex]])
      setEditingComponentId(null)
      return
    }

    if (event.key === 'Enter' && canInlineEditSelected && primarySelectedComponentId) {
      event.preventDefault()
      beginInlineEditMode(primarySelectedComponentId)
      return
    }

    if (selectedComponentIds.length === 0) return

    const step = event.shiftKey ? 10 : 1
    let deltaX = 0
    let deltaY = 0

    if (event.key === 'ArrowLeft') deltaX = -step
    if (event.key === 'ArrowRight') deltaX = step
    if (event.key === 'ArrowUp') deltaY = -step
    if (event.key === 'ArrowDown') deltaY = step

    if (!deltaX && !deltaY) return
    event.preventDefault()

    const selectedIds = new Set(
      result.components
        .filter((component) => selectedComponentIds.includes(component.id) && !component.locked)
        .map((component) => component.id),
    )
    if (selectedIds.size === 0) {
      setEditorNotice({ tone: 'error', text: 'Locked layers cannot be moved with arrow keys.' })
      return
    }
    const canMove = result.components.some((component) => {
      if (!selectedIds.has(component.id)) return false
      const nextCoordinates = clampCanvasCoordinates(
        component,
        result.canvas,
        component.x + deltaX,
        component.y + deltaY,
      )
      return nextCoordinates.x !== component.x || nextCoordinates.y !== component.y
    })
    if (!canMove) return

    pushHistorySnapshot(result.components)

    setResult((previous) => {
      if (!previous) return previous

      const nextComponents = previous.components.map((component) => {
        if (!selectedIds.has(component.id)) return component
        const nextCoordinates = clampCanvasCoordinates(
          component,
          previous.canvas,
          component.x + deltaX,
          component.y + deltaY,
        )
        return {
          ...component,
          x: nextCoordinates.x,
          y: nextCoordinates.y,
        }
      })

      return {
        ...previous,
        components: nextComponents,
      }
    })
    setDirty()
  }, [
    beginInlineEditMode,
    canInlineEditSelected,
    editingComponentId,
    handleRedo,
    handleUndo,
    isTextEntryTarget,
    primarySelectedComponentId,
    pushHistorySnapshot,
    result,
    selectedComponentIds,
    setDirty,
  ])

  const handleCanvasPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = canvasDragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return

    const scale = canvasScale > 0 ? canvasScale : 1
    const deltaX = Math.round((event.clientX - drag.startClientX) / scale)
    const deltaY = Math.round((event.clientY - drag.startClientY) / scale)

    let moved = false
    setResult((previous) => {
      if (!previous) return previous

      const nextComponents = previous.components.map((component) => {
        const origin = drag.originById[component.id]
        if (!origin) return component
        const nextCoordinates = clampCanvasCoordinates(
          component,
          previous.canvas,
          origin.x + deltaX,
          origin.y + deltaY,
        )
        if (nextCoordinates.x === component.x && nextCoordinates.y === component.y) return component
        moved = true
        return {
          ...component,
          x: nextCoordinates.x,
          y: nextCoordinates.y,
        }
      })

      if (!moved) return previous
      return {
        ...previous,
        components: nextComponents,
      }
    })

    if (moved) {
      canvasDragMovedRef.current = true
    }
  }, [canvasScale])

  const handleCanvasResizeMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const resize = canvasResizeRef.current
    if (!resize || event.pointerId !== resize.pointerId) return

    const scale = canvasScale > 0 ? canvasScale : 1
    const deltaX = Math.round((event.clientX - resize.startClientX) / scale)
    const deltaY = Math.round((event.clientY - resize.startClientY) / scale)

    let moved = false
    setResult((previous) => {
      if (!previous) return previous
      const nextComponents = previous.components.map((component) => {
        if (component.id !== resize.componentId) return component

        const maxWidth = Math.max(MIN_COMPONENT_WIDTH, previous.canvas.width - resize.originX)
        const nextWidth = Math.min(maxWidth, Math.max(MIN_COMPONENT_WIDTH, resize.originWidth + deltaX))
        const maxHeight = Math.max(MIN_COMPONENT_HEIGHT, previous.canvas.height - resize.originY)
        const nextHeight = resize.supportsHeight
          ? Math.min(maxHeight, Math.max(MIN_COMPONENT_HEIGHT, resize.originHeight + deltaY))
          : undefined

        const widthChanged = nextWidth !== component.width
        const heightChanged = resize.supportsHeight ? nextHeight !== component.height : false
        if (!widthChanged && !heightChanged) return component

        moved = true
        return {
          ...component,
          width: nextWidth,
          height: resize.supportsHeight ? nextHeight : component.height,
        }
      })

      if (!moved) return previous
      return {
        ...previous,
        components: nextComponents,
      }
    })

    if (moved) canvasResizeMovedRef.current = true
  }, [canvasScale])

  const finalizeCanvasDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = canvasDragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    canvasDragRef.current = null
    setDraggingComponentId(null)
    if (canvasDragMovedRef.current) {
      canvasDragMovedRef.current = false
      pushHistorySnapshot(drag.snapshotBefore)
      setDirty()
    }
  }, [pushHistorySnapshot, setDirty])

  const finalizeCanvasResize = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const resize = canvasResizeRef.current
    if (!resize || event.pointerId !== resize.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    canvasResizeRef.current = null
    setResizingComponentId(null)
    if (canvasResizeMovedRef.current) {
      canvasResizeMovedRef.current = false
      pushHistorySnapshot(resize.snapshotBefore)
      setDirty()
    }
  }, [pushHistorySnapshot, setDirty])

  const handleCanvasPointerDown = useCallback((component: SlideComponent, event: ReactPointerEvent<HTMLElement>) => {
    if (!result || component.locked) return
    if (event.button !== 0) return

    const target = event.target as HTMLElement | null
    if (target?.closest('[contenteditable="true"]')) return
    if (target?.closest('[data-resize-handle="se"]')) return

    if (event.shiftKey) {
      event.preventDefault()
      return
    }

    setEditingComponentId(null)
    const selectionIds = selectedComponentIds.includes(component.id) ? selectedComponentIds : [component.id]
    setSelectedComponentIds(selectionIds)
    const movableSelectionIds = result.components
      .filter((entry) => selectionIds.includes(entry.id) && !entry.locked)
      .map((entry) => entry.id)
    if (movableSelectionIds.length === 0) return
    setDraggingComponentId(component.id)
    canvasDragMovedRef.current = false
    canvasDragRef.current = {
      componentIds: movableSelectionIds,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originById: result.components.reduce<Record<string, { x: number; y: number }>>((acc, entry) => {
        if (movableSelectionIds.includes(entry.id)) {
          acc[entry.id] = { x: entry.x, y: entry.y }
        }
        return acc
      }, {}),
      snapshotBefore: cloneComponents(result.components),
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }, [cloneComponents, result, selectedComponentIds])

  const handleResizePointerDown = useCallback((component: SlideComponent, event: ReactPointerEvent<HTMLElement>) => {
    if (!result || component.locked) return
    if (event.button !== 0) return

    setEditingComponentId(null)
    setSelectedComponentIds([component.id])
    setResizingComponentId(component.id)
    canvasResizeMovedRef.current = false
    canvasResizeRef.current = {
      componentId: component.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: component.x,
      originY: component.y,
      originWidth: component.width,
      originHeight: typeof component.height === 'number' ? component.height : MIN_COMPONENT_HEIGHT,
      supportsHeight: typeof component.height === 'number',
      snapshotBefore: cloneComponents(result.components),
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
    event.stopPropagation()
  }, [cloneComponents, result])

  const handleCanvasPointerRelease = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    finalizeCanvasDrag(event)
    finalizeCanvasResize(event)
  }, [finalizeCanvasDrag, finalizeCanvasResize])

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
    setSelectedComponentIds([])
    setEditingComponentId(null)
    setDraggingComponentId(null)
    setResizingComponentId(null)
    clearHistory()
    setEditorNotice(null)
    setImportError(null)
    setParseStatus('completed')
    setParseProgress(100)
    setParseMessage(`Parsed ${parsed.components.length} components.`)
    setExportHtml('')
    setDirty()
    return parsed
  }, [clearHistory, setDirty])

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

  const normalizeComponentsForPersistence = useCallback((components: SlideComponent[]) => {
    return components.map((component) => ({
      ...component,
      style: {
        ...component.style,
        ...(component.style.fontSize
          ? { fontSize: Math.max(MIN_FONT_SIZE, component.style.fontSize) }
          : {}),
      },
    }))
  }, [])

  const handleSave = useCallback(async (options?: { autosave?: boolean; overwrite?: boolean; titleOverride?: string }) => {
    if (!result) {
      setSaveStatus('error')
      setSaveError('Parse HTML before saving a slide.')
      return null
    }

    if (!options?.autosave) {
      setAutosaveRetryState(null)
    }

    setSaveStatus('saving')
    setSaveError(null)

    try {
      const titleToPersist = options?.titleOverride?.trim() || slideTitle.trim() || 'Untitled Slide'
      const response = await saveSlide(actor, {
        id: activeSlideId || undefined,
        title: titleToPersist,
        canvas: result.canvas,
        components: normalizeComponentsForPersistence(result.components),
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
      setAutosaveRetryState(null)
      setConflictServerSlide(null)
      setSaveError(null)

      await refreshLibraryData()
      return response.slide
    } catch (error) {
      if (error instanceof SlideConflictError) {
        setSaveStatus('conflict')
        setAutosaveRetryState(null)
        setConflictServerSlide(error.serverSlide)
        setSaveError('Save conflict: newer revision exists. Reload, overwrite, or save as copy.')
        return null
      }

      if (options?.autosave) {
        queueAutosaveRetry(error instanceof Error ? error.message : String(error))
        return null
      }

      setSaveStatus('error')
      setSaveError(error instanceof Error ? error.message : String(error))
      return null
    }
  }, [activeRevision, activeSlideId, actor, normalizeComponentsForPersistence, queueAutosaveRetry, rawHtml.length, refreshLibraryData, result, slideTitle])

  useEffect(() => {
    if (!autosaveEnabled || saveStatus !== 'dirty' || !result) return

    const timer = window.setTimeout(() => {
      void handleSave({ autosave: true })
    }, AUTOSAVE_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [autosaveEnabled, handleSave, result, saveStatus])

  useEffect(() => {
    if (!autosaveEnabled || !autosaveRetryState || !result) return

    const waitMs = Math.max(0, autosaveRetryState.nextAttemptAt - Date.now())
    const timer = window.setTimeout(() => {
      void handleSave({ autosave: true })
    }, waitMs)

    return () => window.clearTimeout(timer)
  }, [autosaveEnabled, autosaveRetryState, handleSave, result])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      if (!autosaveRetryState) return
      setAutosaveRetryState((previous) => {
        if (!previous) return null
        return {
          ...previous,
          nextAttemptAt: Date.now() + 250,
        }
      })
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [autosaveRetryState])

  useEffect(() => {
    if (!result) {
      setCanvasScale(1)
      return
    }

    const host = canvasHostRef.current
    if (!host) return

    const sourceWidth = canvasDimensions.width > 0 ? canvasDimensions.width : CANVAS_DEFAULT_WIDTH

    const updateScale = () => {
      const availableWidth = host.clientWidth
      if (!availableWidth) {
        setCanvasScale(1)
        return
      }
      const nextScale = Math.min(1, availableWidth / sourceWidth)
      setCanvasScale(Number(nextScale.toFixed(4)))
    }

    updateScale()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateScale)
      return () => window.removeEventListener('resize', updateScale)
    }

    const observer = new ResizeObserver(() => updateScale())
    observer.observe(host)
    return () => observer.disconnect()
  }, [canvasDimensions.width, result])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const scopedRaw = window.localStorage.getItem(draftRecoveryKey)
    const legacyRaw = scopedRaw ? null : window.localStorage.getItem(LEGACY_DRAFT_RECOVERY_KEY)
    const raw = scopedRaw || legacyRaw
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as DraftSnapshot
      if (!parsed || typeof parsed !== 'object') return
      setRecoveryDraft(parsed)

      if (legacyRaw) {
        window.localStorage.setItem(draftRecoveryKey, legacyRaw)
        window.localStorage.removeItem(LEGACY_DRAFT_RECOVERY_KEY)
      }
    } catch {
      window.localStorage.removeItem(draftRecoveryKey)
      window.localStorage.removeItem(LEGACY_DRAFT_RECOVERY_KEY)
    }
  }, [draftRecoveryKey])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!hasUnsavedChanges) {
      window.localStorage.removeItem(draftRecoveryKey)
      return
    }

    const snapshot: DraftSnapshot = {
      rawHtml,
      title: slideTitle,
      activeSlideId,
      revision: activeRevision,
      result,
      createdAt: new Date().toISOString(),
    }
    window.localStorage.setItem(draftRecoveryKey, JSON.stringify(snapshot))
  }, [activeRevision, activeSlideId, draftRecoveryKey, hasUnsavedChanges, rawHtml, result, slideTitle])

  useEffect(() => {
    if (typeof window === 'undefined' || !hasUnsavedChanges) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (isTextEntryTarget(event.target)) return
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      const key = event.key.toLowerCase()
      if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
        return
      }
      if (key === 'y') {
        event.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleRedo, handleUndo, isTextEntryTarget])

  useEffect(() => {
    if (!result) {
      setSelectedComponentIds([])
      setEditingComponentId(null)
      setDraggingComponentId(null)
      setResizingComponentId(null)
      canvasDragRef.current = null
      canvasResizeRef.current = null
      canvasDragMovedRef.current = false
      canvasResizeMovedRef.current = false
      return
    }

    setEditingComponentId((previous) => {
      if (!previous) return null
      return result.components.some((component) => component.id === previous) ? previous : null
    })
    if (selectedComponentIds.length === 0) return
    setSelectedComponentIds((previous) => previous.filter((id) => result.components.some((component) => component.id === id)))
  }, [result, selectedComponentIds.length])

  const restoreDraft = useCallback(() => {
    if (!recoveryDraft) return
    setRawHtml(recoveryDraft.rawHtml)
    setSlideTitle(recoveryDraft.title || 'Recovered Slide')
    setActiveSlideId(recoveryDraft.activeSlideId)
    setActiveRevision(recoveryDraft.revision || 0)
    setResult(recoveryDraft.result)
    setSelectedComponentIds([])
    setEditingComponentId(null)
    setDraggingComponentId(null)
    setResizingComponentId(null)
    canvasDragRef.current = null
    canvasResizeRef.current = null
    canvasDragMovedRef.current = false
    canvasResizeMovedRef.current = false
    clearHistory()
    setEditorNotice(null)
    setAutosaveRetryState(null)
    setSaveError(null)
    setSaveStatus('dirty')
    setRecoveryDraft(null)
  }, [clearHistory, recoveryDraft])

  const discardDraft = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(draftRecoveryKey)
      window.localStorage.removeItem(LEGACY_DRAFT_RECOVERY_KEY)
    }
    setRecoveryDraft(null)
  }, [draftRecoveryKey])

  const handleCanvasComponentBlur = useCallback((component: SlideComponent, event: FocusEvent<HTMLDivElement>) => {
    const nextContent = sanitizeHtmlContent(event.currentTarget.innerHTML || '')
    if (nextContent !== component.content) {
      event.currentTarget.innerHTML = nextContent
      updateCanvasComponentContent(component.id, nextContent)
    }
    setEditingComponentId((previous) => (previous === component.id ? null : previous))
  }, [updateCanvasComponentContent])

  const handleCanvasContentKeyDown = useCallback((component: SlideComponent, event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    setEditingComponentId((previous) => (previous === component.id ? null : previous))
    event.currentTarget.blur()
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

  const loadSlide = useCallback((slide: SlideRecord, options?: { skipUnsavedConfirm?: boolean }) => {
    if (!options?.skipUnsavedConfirm && !confirmDiscardUnsaved()) return
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
    setSelectedComponentIds([])
    setEditingComponentId(null)
    setDraggingComponentId(null)
    setResizingComponentId(null)
    canvasDragRef.current = null
    canvasResizeRef.current = null
    canvasDragMovedRef.current = false
    canvasResizeMovedRef.current = false
    clearHistory()
    setEditorNotice(null)
    setAutosaveRetryState(null)
    setSaveStatus('clean')
    setSaveError(null)
    setLastSavedAt(slide.updated_at)
    setExportHtml('')
  }, [clearHistory, confirmDiscardUnsaved])

  const handleDuplicateSlide = useCallback(async (slideId: string) => {
    if (!confirmDiscardUnsaved()) return
    try {
      const copy = await duplicateSlide(actor, slideId)
      await refreshLibraryData()
      loadSlide(copy, { skipUnsavedConfirm: true })
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    }
  }, [actor, confirmDiscardUnsaved, loadSlide, refreshLibraryData])

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
        setResult(null)
        setSelectedComponentIds([])
        setEditingComponentId(null)
        setDraggingComponentId(null)
        setResizingComponentId(null)
        clearHistory()
        setEditorNotice({ tone: 'info', text: 'Deleted active slide. Import or load another slide to continue editing.' })
        setSaveStatus('clean')
        setSaveError(null)
        setLastSavedAt(null)
        setExportHtml('')
      }
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    }
  }, [activeSlideId, actor, clearHistory, refreshLibraryData])

  const handleDuplicateTemplate = useCallback(async (templateId: string) => {
    if (!confirmDiscardUnsaved()) return
    try {
      const slide = await duplicateTemplateAsSlide(actor, templateId)
      await refreshLibraryData()
      loadSlide(slide, { skipUnsavedConfirm: true })
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    }
  }, [actor, confirmDiscardUnsaved, loadSlide, refreshLibraryData])

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

  const applyStyleToSelection = useCallback((patch: Partial<SlideComponent['style']>) => {
    if (!result || selectedComponentIds.length === 0) {
      setEditorNotice({ tone: 'error', text: 'Select at least one layer before applying styles.' })
      return
    }

    const selected = result.components.filter((component) => selectedComponentIds.includes(component.id))
    const editableSelected = selected.filter((component) => !component.locked)
    if (editableSelected.length === 0) {
      setEditorNotice({ tone: 'error', text: 'Selected layers are locked and cannot be styled.' })
      return
    }

    const selectedIds = new Set(editableSelected.map((component) => component.id))
    const nextComponents = result.components.map((component) => {
      if (!selectedIds.has(component.id)) return component
      const nextStyle = {
        ...component.style,
        ...patch,
      }
      if (typeof nextStyle.fontSize === 'number') {
        nextStyle.fontSize = Math.max(MIN_FONT_SIZE, nextStyle.fontSize)
      }
      return {
        ...component,
        style: nextStyle,
      }
    })

    if (areComponentsEqual(result.components, nextComponents)) {
      setEditorNotice({ tone: 'info', text: 'No style changes were applied.' })
      return
    }

    pushHistorySnapshot(result.components)
    setResult((previous) => (previous ? { ...previous, components: nextComponents } : previous))
    setDirty()
    setEditorNotice({
      tone: 'info',
      text:
        `Updated styles for ${editableSelected.length} layer(s).` +
        (selected.length > editableSelected.length ? ' Locked layers were skipped.' : ''),
    })
  }, [areComponentsEqual, pushHistorySnapshot, result, selectedComponentIds, setDirty])

  const alignSelection = useCallback((mode: 'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y') => {
    if (!result || selectedComponentIds.length < 2) {
      setEditorNotice({ tone: 'error', text: 'Select at least two layers before aligning.' })
      return
    }

    const selected = result.components.filter((component) => selectedComponentIds.includes(component.id))
    const movableSelected = selected.filter((component) => !component.locked)
    if (movableSelected.length < 2) {
      setEditorNotice({ tone: 'error', text: 'Select at least two unlocked layers before aligning.' })
      return
    }

    const minX = Math.min(...movableSelected.map((component) => component.x))
    const maxRight = Math.max(...movableSelected.map((component) => component.x + component.width))
    const minY = Math.min(...movableSelected.map((component) => component.y))
    const maxBottom = Math.max(...movableSelected.map((component) => component.y + (component.height ?? MIN_COMPONENT_HEIGHT)))
    const centerX = minX + ((maxRight - minX) / 2)
    const centerY = minY + ((maxBottom - minY) / 2)
    const selectedIds = new Set(movableSelected.map((component) => component.id))

    const nextComponents = result.components.map((component) => {
      if (!selectedIds.has(component.id)) return component

      let nextX = component.x
      let nextY = component.y
      if (mode === 'left') nextX = minX
      if (mode === 'right') nextX = maxRight - component.width
      if (mode === 'top') nextY = minY
      if (mode === 'bottom') nextY = maxBottom - (component.height ?? MIN_COMPONENT_HEIGHT)
      if (mode === 'center-x') nextX = Math.round(centerX - (component.width / 2))
      if (mode === 'center-y') nextY = Math.round(centerY - ((component.height ?? MIN_COMPONENT_HEIGHT) / 2))

      const nextCoordinates = clampCanvasCoordinates(component, result.canvas, nextX, nextY)
      return {
        ...component,
        x: nextCoordinates.x,
        y: nextCoordinates.y,
      }
    })

    if (areComponentsEqual(result.components, nextComponents)) {
      setEditorNotice({ tone: 'info', text: 'Alignment made no positional changes.' })
      return
    }

    pushHistorySnapshot(result.components)
    setResult((previous) => (previous ? { ...previous, components: nextComponents } : previous))
    setDirty()
    setEditorNotice({
      tone: 'info',
      text:
        `Applied ${mode} alignment to ${movableSelected.length} layer(s).` +
        (selected.length > movableSelected.length ? ' Locked layers were skipped.' : ''),
    })
  }, [areComponentsEqual, pushHistorySnapshot, result, selectedComponentIds, setDirty])

  const distributeSelection = useCallback((axis: 'horizontal' | 'vertical') => {
    if (!result || selectedComponentIds.length < 3) {
      setEditorNotice({ tone: 'error', text: 'Select at least three layers to distribute spacing.' })
      return
    }

    const selected = result.components.filter((component) => selectedComponentIds.includes(component.id))
    const movableSelected = selected.filter((component) => !component.locked)
    if (movableSelected.length < 3) {
      setEditorNotice({ tone: 'error', text: 'Select at least three unlocked layers to distribute spacing.' })
      return
    }

    const sorted = [...movableSelected].sort((a, b) => (axis === 'horizontal' ? a.x - b.x : a.y - b.y))
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const positions = new Map<string, { x: number; y: number }>()

    if (axis === 'horizontal') {
      const totalWidths = sorted.reduce((sum, component) => sum + component.width, 0)
      const span = (last.x + last.width) - first.x
      const gap = Math.max(0, (span - totalWidths) / (sorted.length - 1))
      let cursor = first.x
      sorted.forEach((component) => {
        positions.set(component.id, { x: Math.round(cursor), y: component.y })
        cursor += component.width + gap
      })
    } else {
      const heights = sorted.map((component) => component.height ?? MIN_COMPONENT_HEIGHT)
      const totalHeights = heights.reduce((sum, value) => sum + value, 0)
      const lastHeight = last.height ?? MIN_COMPONENT_HEIGHT
      const span = (last.y + lastHeight) - first.y
      const gap = Math.max(0, (span - totalHeights) / (sorted.length - 1))
      let cursor = first.y
      sorted.forEach((component, index) => {
        positions.set(component.id, { x: component.x, y: Math.round(cursor) })
        cursor += heights[index] + gap
      })
    }

    const nextComponents = result.components.map((component) => {
      const nextPosition = positions.get(component.id)
      if (!nextPosition) return component
      const nextCoordinates = clampCanvasCoordinates(component, result.canvas, nextPosition.x, nextPosition.y)
      return {
        ...component,
        x: nextCoordinates.x,
        y: nextCoordinates.y,
      }
    })

    if (areComponentsEqual(result.components, nextComponents)) {
      setEditorNotice({ tone: 'info', text: 'Distribution made no positional changes.' })
      return
    }

    pushHistorySnapshot(result.components)
    setResult((previous) => (previous ? { ...previous, components: nextComponents } : previous))
    setDirty()
    setEditorNotice({
      tone: 'info',
      text:
        `Distributed ${movableSelected.length} layer(s) ${axis === 'horizontal' ? 'horizontally' : 'vertically'}.` +
        (selected.length > movableSelected.length ? ' Locked layers were skipped.' : ''),
    })
  }, [areComponentsEqual, pushHistorySnapshot, result, selectedComponentIds, setDirty])

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
    loadSlide(conflictServerSlide, { skipUnsavedConfirm: true })
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
        components: normalizeComponentsForPersistence(result.components),
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
  }, [actor, normalizeComponentsForPersistence, rawHtml.length, refreshLibraryData, result, slideTitle])

  const oliverConfig = useMemo<OliverConfig>(() => {
    const actions: OliverAction[] = SLIDES_COMMANDS.map((command) => {
      let run: () => void

      switch (command.id) {
        case 'slides-import-file':
          run = () => openFilePicker()
          break
        case 'slides-parse-pasted':
          run = () => { void runParseWithProgress(rawHtml) }
          break
        case 'slides-save-slide':
          run = () => { void handleSave() }
          break
        case 'slides-generate-export':
          run = () => { generateExport() }
          break
        case 'slides-open-my-slides':
          run = () => { handleWorkspaceTabChange('my-slides') }
          break
        case 'slides-open-template-library':
          run = () => { handleWorkspaceTabChange('templates') }
          break
        case 'slides-open-activity':
          run = () => { handleWorkspaceTabChange('activity') }
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
      saveSlide: async (titleOverride) => {
        const saved = await handleSave(titleOverride ? { titleOverride } : undefined)
        if (!saved) return 'Save failed. Parse HTML before saving a slide, then retry.'
        return `Saved "${saved.title}" (revision ${saved.revision}).`
      },
      generateExport,
      openWorkspaceTab: handleWorkspaceTabChange,
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
  }, [activeSlideId, generateExport, handleSave, handleWorkspaceTabChange, openFilePicker, parseHtmlSync, rawHtml, result, runParseWithProgress, saveStatus])

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
        <Link href="/" className="sidebar-back" onClick={handleBackToHubClick}>← Back to Hub</Link>

        <div className="app-sidebar-section">
          <button
            type="button"
            className={'app-sidebar-item' + (workspaceTab === 'import' ? ' active' : '')}
            onClick={() => handleWorkspaceTabChange('import')}
          >
            Import Workspace
          </button>
          <button
            type="button"
            className={'app-sidebar-item' + (workspaceTab === 'my-slides' ? ' active' : '')}
            onClick={() => handleWorkspaceTabChange('my-slides')}
          >
            My Slides
          </button>
          <button
            type="button"
            className={'app-sidebar-item' + (workspaceTab === 'templates' ? ' active' : '')}
            onClick={() => handleWorkspaceTabChange('templates')}
          >
            Template Library
          </button>
          <button
            type="button"
            className={'app-sidebar-item' + (workspaceTab === 'activity' ? ' active' : '')}
            onClick={() => handleWorkspaceTabChange('activity')}
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
              Import slide HTML, review parser output, and edit directly on a scaled 16:9 canvas with keyboard-first controls, alignment tools, autosave, and export.
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
                <span className="slides-search-label">{searchLabel}</span>
                <input
                  id="slides-search"
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder={searchPlaceholder}
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
                        onChange={(event) => {
                          const enabled = event.target.checked
                          setAutosaveEnabled(enabled)
                          if (!enabled && autosaveRetryState) {
                            setAutosaveRetryState(null)
                            setSaveStatus(result ? 'dirty' : 'clean')
                            setSaveError(null)
                          }
                        }}
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

                  {autosaveRetryState && (
                    <div className="slides-retry" role="status">
                      <p>
                        Autosave retry queued. Attempt {autosaveRetryState.attempt} with {Math.ceil(autosaveRetryState.delayMs / 1000)}s backoff.
                      </p>
                      <div className="slides-inline-actions">
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => void handleSave({ autosave: true })}>
                          Retry Autosave Now
                        </button>
                        <button type="button" className="btn btn-sm btn-ghost" onClick={scheduleAutosaveRetryNow}>
                          Requeue Immediate Retry
                        </button>
                        <button type="button" className="btn btn-sm btn-ghost" onClick={dismissAutosaveRetry}>
                          Dismiss Retry Queue
                        </button>
                      </div>
                    </div>
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
                      Canvas: {result.canvas.width} × {result.canvas.height} · Components: {result.components.length} · Selected: {selectedComponentIds.length}
                    </p>

                    <section className="slides-editor-toolbar" aria-label="Layer editing controls">
                      <div className="slides-editor-toolbar-row">
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleUndo()}
                          disabled={historyPast.length === 0}
                        >
                          Undo
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleRedo()}
                          disabled={historyFuture.length === 0}
                        >
                          Redo
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => alignSelection('left')}
                          disabled={selectedComponentIds.length < 2}
                        >
                          Align Left
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => alignSelection('center-x')}
                          disabled={selectedComponentIds.length < 2}
                        >
                          Align Center X
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => alignSelection('right')}
                          disabled={selectedComponentIds.length < 2}
                        >
                          Align Right
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => alignSelection('top')}
                          disabled={selectedComponentIds.length < 2}
                        >
                          Align Top
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => alignSelection('center-y')}
                          disabled={selectedComponentIds.length < 2}
                        >
                          Align Center Y
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => alignSelection('bottom')}
                          disabled={selectedComponentIds.length < 2}
                        >
                          Align Bottom
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => distributeSelection('horizontal')}
                        >
                          Distribute Horizontally
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => distributeSelection('vertical')}
                        >
                          Distribute Vertically
                        </button>
                      </div>

                      <div className="slides-editor-toolbar-row slides-editor-toolbar-row--inputs">
                        <label className="slides-editor-field" htmlFor="slides-style-font-size">
                          <span>Font size</span>
                          <input
                            id="slides-style-font-size"
                            type="number"
                            min={MIN_FONT_SIZE}
                            step={1}
                            value={selectedStyle?.fontSize ?? MIN_FONT_SIZE}
                            onChange={(event) =>
                              applyStyleToSelection({
                                fontSize: Number.isFinite(Number(event.target.value))
                                  ? Math.max(MIN_FONT_SIZE, Number(event.target.value))
                                  : MIN_FONT_SIZE,
                              })}
                            disabled={selectedComponentIds.length === 0}
                          />
                        </label>
                        <label className="slides-editor-field" htmlFor="slides-style-font-weight">
                          <span>Weight</span>
                          <select
                            id="slides-style-font-weight"
                            value={String(selectedStyle?.fontWeight ?? 400)}
                            onChange={(event) => applyStyleToSelection({ fontWeight: Number(event.target.value) })}
                            disabled={selectedComponentIds.length === 0}
                          >
                            <option value="400">400</option>
                            <option value="500">500</option>
                            <option value="600">600</option>
                            <option value="700">700</option>
                          </select>
                        </label>
                        <label className="slides-editor-field" htmlFor="slides-style-align">
                          <span>Text align</span>
                          <select
                            id="slides-style-align"
                            value={selectedStyle?.textAlign ?? 'left'}
                            onChange={(event) => applyStyleToSelection({ textAlign: event.target.value as SlideComponent['style']['textAlign'] })}
                            disabled={selectedComponentIds.length === 0}
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                            <option value="justify">Justify</option>
                          </select>
                        </label>
                        <label className="slides-editor-field" htmlFor="slides-style-color">
                          <span>Text color</span>
                          <input
                            id="slides-style-color"
                            type="color"
                            value={selectedStyle?.color ?? '#0f172a'}
                            onChange={(event) => applyStyleToSelection({ color: event.target.value })}
                            disabled={selectedComponentIds.length === 0}
                          />
                        </label>
                        <label className="slides-editor-field" htmlFor="slides-style-background">
                          <span>Background</span>
                          <input
                            id="slides-style-background"
                            type="color"
                            value={selectedStyle?.backgroundColor ?? '#ffffff'}
                            onChange={(event) => applyStyleToSelection({ backgroundColor: event.target.value })}
                            disabled={selectedComponentIds.length === 0}
                          />
                        </label>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() =>
                            applyStyleToSelection({
                              fontStyle: selectedStyle?.fontStyle === 'italic' ? 'normal' : 'italic',
                            })}
                          disabled={selectedComponentIds.length === 0}
                        >
                          {selectedStyle?.fontStyle === 'italic' ? 'Remove Italic' : 'Italic'}
                        </button>
                      </div>
                    </section>

                    <details className="slides-shortcuts">
                      <summary>Keyboard Shortcuts</summary>
                      <ul id="slides-canvas-shortcuts-help">
                        <li>Tab to focus a layer, Enter to start inline text editing, Escape to exit editing/selection.</li>
                        <li>Arrow keys nudge selected layers by 1px. Use Shift+Arrow for 10px.</li>
                        <li>Shift+click toggles multi-select. Ctrl/Cmd+A selects all visible layers.</li>
                        <li>PageUp/PageDown cycles layer selection.</li>
                        <li>Ctrl/Cmd+Z undo, Shift+Ctrl/Cmd+Z or Ctrl/Cmd+Y redo.</li>
                      </ul>
                    </details>

                    {editorNotice && (
                      <p className={'slides-editor-notice' + (editorNotice.tone === 'error' ? ' is-error' : '')} role={editorNotice.tone === 'error' ? 'alert' : 'status'}>
                        {editorNotice.text}
                      </p>
                    )}

                    <section className="slides-canvas-preview" aria-labelledby="slides-canvas-heading">
                      <div className="slides-canvas-meta">
                        <h3 id="slides-canvas-heading">Canvas Preview</h3>
                        <p>
                          Scaled to viewport at {Math.round(canvasScale * 100)}% while preserving coordinate integrity.
                          {primarySelectedComponentId
                            ? selectedComponentIds.length > 1
                              ? ` ${selectedComponentIds.length} layers selected.`
                              : ` Selected layer: ${primarySelectedComponentId}.`
                            : ' Select a layer and use arrow keys to nudge.'}
                        </p>
                      </div>

                      <div className="slides-canvas-host" ref={canvasHostRef}>
                        <div
                          className="slides-canvas-stage"
                          style={{ height: `${Math.max(1, canvasDimensions.height * canvasScale)}px` }}
                        >
                          <div
                            className="slides-canvas"
                            data-slide-canvas="1"
                            role="listbox"
                            aria-multiselectable="true"
                            aria-label="Slide canvas editor"
                            aria-describedby="slides-canvas-shortcuts-help"
                            tabIndex={0}
                            onKeyDown={handleCanvasKeyDown}
                            style={{
                              width: `${canvasDimensions.width}px`,
                              height: `${canvasDimensions.height}px`,
                              transform: `scale(${canvasScale})`,
                            }}
                          >
                            {result.components.filter((component) => component.visible !== false).map((component) => {
                              const isEditable = EDITABLE_COMPONENT_TYPES.has(component.type)
                              const sanitizedContent = sanitizeHtmlContent(component.content || '')
                              const isSelected = selectedComponentIds.includes(component.id)
                              const isEditing = editingComponentId === component.id

                              return (
                                <article
                                  key={component.id}
                                  className={
                                    'slides-canvas-component slides-canvas-component--' +
                                    component.type +
                                    (component.locked ? ' is-locked' : '') +
                                    (draggingComponentId === component.id ? ' is-dragging' : '') +
                                    (resizingComponentId === component.id ? ' is-resizing' : '') +
                                    (isSelected ? ' is-selected' : '')
                                  }
                                  style={buildCanvasComponentStyle(component)}
                                  data-component-id={component.id}
                                  data-component-type={component.type}
                                  data-component-x={String(component.x)}
                                  data-component-y={String(component.y)}
                                  data-component-width={String(component.width)}
                                  data-component-height={typeof component.height === 'number' ? String(component.height) : ''}
                                  data-component-locked={component.locked ? 'true' : 'false'}
                                  data-component-selected={isSelected ? 'true' : 'false'}
                                  data-component-dragging={draggingComponentId === component.id ? 'true' : 'false'}
                                  data-component-resizing={resizingComponentId === component.id ? 'true' : 'false'}
                                  role="option"
                                  aria-selected={isSelected}
                                  aria-label={`${component.type} layer ${component.id}`}
                                  tabIndex={0}
                                  onClick={(event) => {
                                    const target = event.target as HTMLElement
                                    if (target.closest('[contenteditable="true"]')) return
                                    handleCanvasLayerSelect(component.id, { multi: event.shiftKey })
                                  }}
                                  onDoubleClick={() => {
                                    if (isEditable && !component.locked) beginInlineEditMode(component.id)
                                  }}
                                  onFocus={(event) => {
                                    if (event.target !== event.currentTarget) return
                                    handleCanvasLayerSelect(component.id)
                                  }}
                                  onPointerDown={(event) => handleCanvasPointerDown(component, event)}
                                  onPointerMove={(event) => {
                                    handleCanvasPointerMove(event)
                                    handleCanvasResizeMove(event)
                                  }}
                                  onPointerUp={handleCanvasPointerRelease}
                                  onPointerCancel={handleCanvasPointerRelease}
                                >
                                  <div className="slides-canvas-component-type">{component.type}</div>
                                  {isSelected && !component.locked && (
                                    <button
                                      type="button"
                                      className="slides-canvas-resize-handle"
                                      data-resize-handle="se"
                                      aria-label={`Resize ${component.type} layer`}
                                      onPointerDown={(event) => handleResizePointerDown(component, event)}
                                    />
                                  )}
                                  <div
                                    className={
                                      'slides-canvas-component-content' +
                                      (isEditable && !component.locked ? '' : ' is-readonly')
                                    }
                                    ref={(node) => {
                                      canvasContentRefs.current[component.id] = node
                                    }}
                                    contentEditable={isEditable && !component.locked && isEditing}
                                    suppressContentEditableWarning
                                    onKeyDown={(event) => handleCanvasContentKeyDown(component, event)}
                                    onBlur={(event) => handleCanvasComponentBlur(component, event)}
                                    aria-label={`${component.type} content`}
                                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                                  />
                                </article>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </section>

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
                  <p className="slides-empty">
                    {trimmedSearchValue
                      ? `No slides match "${trimmedSearchValue}". Clear or update search to continue.`
                      : 'No saved slides yet. Parse HTML and click Save Slide to create your first record.'}
                  </p>
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
                  <p className="slides-empty">
                    {trimmedSearchValue
                      ? `No templates match "${trimmedSearchValue}". Clear or update search to continue.`
                      : 'No templates available yet.'}
                  </p>
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
                {filteredAudits.length === 0 && (
                  <p className="slides-empty">
                    {trimmedSearchValue
                      ? `No activity events match "${trimmedSearchValue}". Clear or update search to continue.`
                      : 'No audit events found yet.'}
                  </p>
                )}
                {filteredAudits.map((event) => (
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
