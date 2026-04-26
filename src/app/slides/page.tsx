'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRegisterOliver } from '@/components/shared/OliverContext'
import type { OliverAction, OliverConfig } from '@/components/shared/OliverContext'
import type { CSSProperties, FocusEvent, PointerEvent as ReactPointerEvent } from 'react'
import { ModuleSidebarHeader } from '@/components/shared/ModuleSidebarHeader'
import { ModuleTopbar } from '@/components/shared/ModuleTopbar'
import type { SlideComponent, SlideComponentType, SlideImportResult } from '@/components/slides/types'
import { convertHtmlToSlideComponents } from '@/components/slides/html-import'
import { convertSlideComponentsToHtml } from '@/components/slides/html-export'
import { convertSlidesToPptx } from '@/components/slides/pptx-export'
import {
  classifyImportError,
  type SlideImportFailure,
  validateImportFile,
  validateParsedResult,
  validatePastedHtml,
} from '@/components/slides/import-validation'
import {
  inlineCompanionStylesheets,
  selectImportFiles,
} from '@/components/slides/import-file-bundle'
import type {
  SlideAuditEvent,
  SlideAuditExportJob,
  SlideAuditFilterPreset,
  SlideRecord,
  SlideTemplateApproval,
  SlideTemplateCollaborator,
  SlideTemplateCollaboratorRole,
  SlideTemplateRecord,
} from '@/components/slides/persistence-types'
import {
  archiveTemplate,
  deleteSlide,
  duplicateSlide,
  duplicateTemplateAsSlide,
  downloadAuditExportJob,
  deleteAuditPreset,
  escalateTemplateApproval,
  listAuditPresets,
  listAuditExportJobs,
  listTemplateCollaborators,
  listTemplateApprovals,
  listSlideAudits,
  listSlides,
  listTemplates,
  publishTemplateFromSlide,
  recordExportEvent,
  requestAuditExportJob,
  removeTemplateCollaborator,
  resolveTemplateApproval,
  runTemplateApprovalEscalationSweep,
  renameSlide,
  saveSlide,
  SlideApiError,
  SlideConflictError,
  getSlidesRuntimeHealth,
  subscribeSlidesRuntimeHealth,
  submitTemplateApproval,
  type SlidesRuntimeHealthState,
  transferTemplateOwnership,
  upsertAuditPreset,
  upsertTemplateCollaborator,
  updateTemplate,
} from '@/lib/slides'
import { useUser } from '@/context/UserContext'
import { SLIDES_COMMANDS } from '@/app/slides/commands'
import { buildSlidesFlows } from '@/app/slides/flows'
import { buildModuleOliverConfig } from '@/modules/oliver-config'
import { useModuleAccess } from '@/modules/use-module-access'

const AUTOSAVE_DELAY_MS = 5000
const AUTOSAVE_RETRY_BASE_DELAY_MS = 2000
const AUTOSAVE_RETRY_MAX_DELAY_MS = 60000
const AUTOSAVE_RETRY_MAX_ATTEMPTS = 5
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

interface SlidesDegradedState {
  mode: 'local-draft'
  message: string
  correlationId: string | null
  rayId: string | null
  endpoint: string
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

interface CanvasSnapGuides {
  x: number | null
  y: number | null
}

interface TemplatePublishDraft {
  slideId: string
  name: string
  description: string
  isShared: boolean
}

interface TemplateTransferDraft {
  templateId: string
  target: string
}

interface TemplateCollaboratorDraft {
  templateId: string
  target: string
  role: SlideTemplateCollaboratorRole
}

interface RankedTemplateEntry {
  template: SlideTemplateRecord
  searchScore: number
  matchSignals: string[]
  pendingApprovals: number
  isBestMatch: boolean
}

function getTemplatePreviewScale(
  canvas: { width: number; height: number },
  maxWidth: number,
  maxHeight: number,
): number {
  const width = canvas.width > 0 ? canvas.width : 1
  const height = canvas.height > 0 ? canvas.height : 1
  return Math.min(maxWidth / width, maxHeight / height)
}

function normalizeTemplateSearchText(value: string | null | undefined): string {
  return (value || '').toLowerCase().trim()
}

function buildTemplateContentSearchCorpus(template: SlideTemplateRecord): string {
  return template.components
    .slice(0, 24)
    .map((component) => {
      const plainContent = (component.content || '').replace(/<[^>]+>/g, ' ')
      return [component.type, component.sourceLabel || '', plainContent].join(' ')
    })
    .join(' ')
    .toLowerCase()
}

function rankTemplateForSearch(template: SlideTemplateRecord, query: string): {
  score: number
  matchSignals: string[]
} {
  const normalizedQuery = normalizeTemplateSearchText(query)
  if (!normalizedQuery) return { score: 0, matchSignals: [] }

  const name = normalizeTemplateSearchText(template.name)
  const description = normalizeTemplateSearchText(template.description)
  const owner = normalizeTemplateSearchText(template.owner_user_id)
  const contentCorpus = buildTemplateContentSearchCorpus(template)

  const signals = new Set<string>()
  let score = 0

  if (name === normalizedQuery) {
    score += 200
    signals.add('Exact Name')
  } else if (name.startsWith(normalizedQuery)) {
    score += 140
    signals.add('Name Prefix')
  } else if (name.includes(normalizedQuery)) {
    score += 110
    signals.add('Name')
  }

  if (description.includes(normalizedQuery)) {
    score += 80
    signals.add('Description')
  }

  if (owner.includes(normalizedQuery)) {
    score += 40
    signals.add('Owner')
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
  let tokenHitCount = 0
  for (const token of tokens) {
    let tokenMatched = false
    if (name.includes(token)) {
      score += 24
      tokenMatched = true
      signals.add('Name')
    }
    if (description.includes(token)) {
      score += 14
      tokenMatched = true
      signals.add('Description')
    }
    if (owner.includes(token)) {
      score += 8
      tokenMatched = true
      signals.add('Owner')
    }
    if (contentCorpus.includes(token)) {
      score += 6
      tokenMatched = true
      signals.add('Content')
    }
    if (tokenMatched) tokenHitCount += 1
  }

  if (tokens.length > 1 && tokenHitCount === tokens.length) {
    score += 30
    signals.add('All Tokens')
  }

  return {
    score,
    matchSignals: Array.from(signals),
  }
}

function readHistoryIndex(state: unknown): number | null {
  if (!state || typeof state !== 'object') return null
  const candidate = (state as { idx?: unknown }).idx
  return typeof candidate === 'number' ? candidate : null
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

function formatAuditExportStatus(status: SlideAuditExportJob['status']): string {
  if (status === 'queued') return 'Queued'
  if (status === 'running') return 'Running'
  if (status === 'completed') return 'Completed'
  if (status === 'failed') return 'Failed'
  return status
}

function formatAuditExportFilters(filters: SlideAuditExportJob['filters']): string {
  const segments: string[] = []
  if (filters.search) segments.push(`Search "${filters.search}"`)
  if (filters.action !== 'all') segments.push(`Action ${filters.action}`)
  if (filters.outcome !== 'all') segments.push(`Outcome ${filters.outcome}`)
  if (filters.entity_type !== 'all') segments.push(`Entity ${filters.entity_type}`)
  if (filters.date_from || filters.date_to) {
    segments.push(`Date ${filters.date_from || '...'} to ${filters.date_to || '...'}`)
  }
  if (segments.length === 0) return 'All activity filters'
  return segments.join(' · ')
}

function isAutosaveRetryableError(error: unknown): boolean {
  if (error instanceof SlideConflictError) return false
  if (error instanceof SlideApiError) return error.retryable
  if (error instanceof TypeError) return true
  return true
}

function getSlideErrorSummary(error: unknown): {
  message: string
  correlationId: string | null
  rayId: string | null
  endpoint: string
} {
  if (error instanceof SlideApiError) {
    return {
      message: error.message,
      correlationId: error.correlationId,
      rayId: error.rayId,
      endpoint: error.path || '/api/slides',
    }
  }
  return {
    message: error instanceof Error ? error.message : String(error),
    correlationId: null,
    rayId: null,
    endpoint: '/api/slides',
  }
}

function formatTemplateApprovalType(type: SlideTemplateApproval['approval_type']): string {
  if (type === 'transfer-template') return 'Transfer Template Ownership'
  if (type === 'upsert-collaborator') return 'Add or Update Collaborator'
  if (type === 'remove-collaborator') return 'Remove Collaborator'
  return type
}

function formatTemplateApprovalTarget(approval: SlideTemplateApproval): string {
  const payload = approval.payload || {}
  const targetEmail = typeof payload.target_user_email === 'string' ? payload.target_user_email : ''
  const targetUserId = typeof payload.target_user_id === 'string' ? payload.target_user_id : ''
  const role = typeof payload.role === 'string' ? payload.role : ''
  const target = targetEmail || targetUserId || 'n/a'
  if (!role) return target
  return `${target} · ${role}`
}

function formatApprovalAgeLabel(createdAt: string): string {
  const parsed = Date.parse(createdAt)
  if (!Number.isFinite(parsed)) return 'n/a'
  const deltaMs = Math.max(0, Date.now() - parsed)
  const totalHours = Math.floor(deltaMs / (60 * 60 * 1000))
  if (totalHours < 1) return 'under 1h'
  if (totalHours < 24) return `${totalHours}h`
  const days = Math.floor(totalHours / 24)
  const remHours = totalHours % 24
  if (remHours === 0) return `${days}d`
  return `${days}d ${remHours}h`
}

function getApprovalEscalationCount(approval: SlideTemplateApproval): number {
  const payload = approval.payload || {}
  const explicit = Number((payload as { escalation_count?: unknown }).escalation_count)
  if (Number.isFinite(explicit) && explicit >= 0) return explicit
  const entries = Array.isArray((payload as { escalations?: unknown }).escalations)
    ? (payload as { escalations: unknown[] }).escalations
    : []
  return entries.length
}

function getApprovalLastEscalatedAt(approval: SlideTemplateApproval): string | null {
  const payload = approval.payload || {}
  const explicit = typeof (payload as { last_escalated_at?: unknown }).last_escalated_at === 'string'
    ? (payload as { last_escalated_at: string }).last_escalated_at
    : ''
  if (explicit) return explicit
  const entries = Array.isArray((payload as { escalations?: unknown }).escalations)
    ? (payload as { escalations: Array<Record<string, unknown>> }).escalations
    : []
  const last = entries[entries.length - 1]
  return last && typeof last.created_at === 'string' ? last.created_at : null
}

function getApprovalSlaState(approval: SlideTemplateApproval): {
  tone: 'healthy' | 'at-risk' | 'overdue'
  label: string
  ageLabel: string
  escalationCount: number
  lastEscalatedAt: string | null
  canEscalate: boolean
} {
  const parsed = Date.parse(approval.created_at)
  const ageMs = Number.isFinite(parsed) ? Math.max(0, Date.now() - parsed) : 0
  const ageHours = ageMs / (60 * 60 * 1000)
  if (ageHours >= 48) {
    return {
      tone: 'overdue',
      label: 'SLA Overdue (48h+)',
      ageLabel: formatApprovalAgeLabel(approval.created_at),
      escalationCount: getApprovalEscalationCount(approval),
      lastEscalatedAt: getApprovalLastEscalatedAt(approval),
      canEscalate: true,
    }
  }
  if (ageHours >= 24) {
    return {
      tone: 'at-risk',
      label: 'SLA At Risk (24h+)',
      ageLabel: formatApprovalAgeLabel(approval.created_at),
      escalationCount: getApprovalEscalationCount(approval),
      lastEscalatedAt: getApprovalLastEscalatedAt(approval),
      canEscalate: true,
    }
  }
  return {
    tone: 'healthy',
    label: 'SLA Healthy',
    ageLabel: formatApprovalAgeLabel(approval.created_at),
    escalationCount: getApprovalEscalationCount(approval),
    lastEscalatedAt: getApprovalLastEscalatedAt(approval),
    canEscalate: false,
  }
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
const MIN_TEXT_AUTOSIZE_HEIGHT = 40
const MIN_FONT_SIZE = 14
const SNAP_TOLERANCE_PX = 8
const MAX_HISTORY_ENTRIES = 80
const AUDIT_PAGE_SIZE = 20

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

function supportsTextAutoSize(component: SlideComponent): boolean {
  return EDITABLE_COMPONENT_TYPES.has(component.type)
}

function measureTextAutoSizeHeight(component: SlideComponent, width: number): number {
  if (typeof document === 'undefined') {
    return Math.max(MIN_TEXT_AUTOSIZE_HEIGHT, component.height || MIN_COMPONENT_HEIGHT)
  }

  const measureNode = document.createElement('div')
  measureNode.style.position = 'absolute'
  measureNode.style.left = '-100000px'
  measureNode.style.top = '-100000px'
  measureNode.style.width = `${Math.max(MIN_COMPONENT_WIDTH, width)}px`
  measureNode.style.padding = '8px'
  measureNode.style.border = '0'
  measureNode.style.boxSizing = 'border-box'
  measureNode.style.visibility = 'hidden'
  measureNode.style.pointerEvents = 'none'
  measureNode.style.whiteSpace = 'normal'
  measureNode.style.wordBreak = 'break-word'
  measureNode.style.overflowWrap = 'anywhere'
  measureNode.style.backgroundColor = component.style.backgroundColor || '#ffffff'
  measureNode.style.color = component.style.color || '#0f172a'
  measureNode.style.fontSize = `${Math.max(MIN_FONT_SIZE, component.style.fontSize || MIN_FONT_SIZE)}px`
  measureNode.style.fontWeight = String(component.style.fontWeight || 400)
  measureNode.style.fontStyle = component.style.fontStyle || 'normal'
  measureNode.style.lineHeight = component.style.lineHeight
    ? `${component.style.lineHeight}px`
    : '1.35'
  measureNode.style.textAlign = component.style.textAlign || 'left'
  measureNode.innerHTML = sanitizeHtmlContent(component.content || '')

  document.body.appendChild(measureNode)
  const measuredHeight = Math.ceil(measureNode.scrollHeight)
  document.body.removeChild(measureNode)

  return Math.max(MIN_TEXT_AUTOSIZE_HEIGHT, measuredHeight)
}

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
  if (component.style.fontFamily) style.fontFamily = component.style.fontFamily
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

function resolveComponentHeight(component: SlideComponent): number {
  return typeof component.height === 'number' ? component.height : MIN_COMPONENT_HEIGHT
}

function buildCanvasSnapTargets(
  components: SlideComponent[],
  excludedIds: Set<string>,
  canvas: { width: number; height: number },
): { x: number[]; y: number[] } {
  const xTargets = [0, canvas.width / 2, canvas.width]
  const yTargets = [0, canvas.height / 2, canvas.height]
  for (const component of components) {
    if (excludedIds.has(component.id) || component.visible === false) continue
    const height = resolveComponentHeight(component)
    xTargets.push(component.x, component.x + (component.width / 2), component.x + component.width)
    yTargets.push(component.y, component.y + (height / 2), component.y + height)
  }
  return { x: xTargets, y: yTargets }
}

function findMoveSnap(
  start: number,
  size: number,
  targets: number[],
  tolerance: number,
): { delta: number; guide: number | null } {
  const points = [start, start + (size / 2), start + size]
  let bestDelta = 0
  let bestGuide: number | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const point of points) {
    for (const target of targets) {
      const delta = target - point
      const distance = Math.abs(delta)
      if (distance > tolerance) continue
      if (distance >= bestDistance) continue
      bestDelta = delta
      bestGuide = target
      bestDistance = distance
    }
  }

  return {
    delta: bestGuide === null ? 0 : bestDelta,
    guide: bestGuide,
  }
}

function findEndSnap(
  end: number,
  targets: number[],
  tolerance: number,
): { delta: number; guide: number | null } {
  let bestDelta = 0
  let bestGuide: number | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const target of targets) {
    const delta = target - end
    const distance = Math.abs(delta)
    if (distance > tolerance) continue
    if (distance >= bestDistance) continue
    bestDelta = delta
    bestGuide = target
    bestDistance = distance
  }

  return {
    delta: bestGuide === null ? 0 : bestDelta,
    guide: bestGuide,
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
  const [canvasSnapGuides, setCanvasSnapGuides] = useState<CanvasSnapGuides>({ x: null, y: null })
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
  const [degradedState, setDegradedState] = useState<SlidesDegradedState | null>(null)
  const [runtimeHealth, setRuntimeHealth] = useState<SlidesRuntimeHealthState>(() => getSlidesRuntimeHealth())

  const [slides, setSlides] = useState<SlideRecord[]>([])
  const [templates, setTemplates] = useState<SlideTemplateRecord[]>([])
  const [templateApprovals, setTemplateApprovals] = useState<SlideTemplateApproval[]>([])
  const [audits, setAudits] = useState<SlideAuditEvent[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [libraryError, setLibraryError] = useState<string | null>(null)
  const [templatePublishDraft, setTemplatePublishDraft] = useState<TemplatePublishDraft | null>(null)
  const [templateTransferDraft, setTemplateTransferDraft] = useState<TemplateTransferDraft | null>(null)
  const [templateCollaboratorDraft, setTemplateCollaboratorDraft] = useState<TemplateCollaboratorDraft | null>(null)
  const [templateCollaboratorPanelId, setTemplateCollaboratorPanelId] = useState<string | null>(null)
  const [templateQuickPreviewId, setTemplateQuickPreviewId] = useState<string | null>(null)
  const [templateCollaboratorsByTemplate, setTemplateCollaboratorsByTemplate] = useState<Record<string, SlideTemplateCollaborator[]>>({})
  const [templatePublishBusy, setTemplatePublishBusy] = useState(false)
  const [templateActionBusyId, setTemplateActionBusyId] = useState<string | null>(null)
  const [templateApprovalBusyId, setTemplateApprovalBusyId] = useState<string | null>(null)
  const [auditActionFilter, setAuditActionFilter] = useState<'all' | SlideAuditEvent['action']>('all')
  const [auditOutcomeFilter, setAuditOutcomeFilter] = useState<'all' | SlideAuditEvent['outcome']>('all')
  const [auditEntityTypeFilter, setAuditEntityTypeFilter] = useState<'all' | SlideAuditEvent['entity_type']>('all')
  const [auditDateFrom, setAuditDateFrom] = useState('')
  const [auditDateTo, setAuditDateTo] = useState('')
  const [auditOffset, setAuditOffset] = useState(0)
  const [auditHasMore, setAuditHasMore] = useState(false)
  const [auditPresets, setAuditPresets] = useState<SlideAuditFilterPreset[]>([])
  const [auditExportJobs, setAuditExportJobs] = useState<SlideAuditExportJob[]>([])
  const [auditExportStatusFilter, setAuditExportStatusFilter] = useState<'all' | SlideAuditExportJob['status']>('all')
  const [selectedAuditPresetId, setSelectedAuditPresetId] = useState('')
  const [auditPresetName, setAuditPresetName] = useState('')
  const [auditPresetScope, setAuditPresetScope] = useState<'personal' | 'shared'>('personal')
  const [auditPresetBusy, setAuditPresetBusy] = useState(false)
  const [auditExportRequestBusy, setAuditExportRequestBusy] = useState(false)
  const [auditExportDownloadBusyId, setAuditExportDownloadBusyId] = useState<string | null>(null)

  const [searchValue, setSearchValue] = useState('')
  const [exportHtml, setExportHtml] = useState('')
  const [pptxSelectedSlideIds, setPptxSelectedSlideIds] = useState<string[]>([])
  const [pptxExportWarnings, setPptxExportWarnings] = useState<string[]>([])
  const [pptxExportBusy, setPptxExportBusy] = useState(false)

  const [recoveryDraft, setRecoveryDraft] = useState<DraftSnapshot | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const parseAbortRef = useRef<AbortController | null>(null)
  const pendingImportWarningsRef = useRef<string[]>([])
  const canvasHostRef = useRef<HTMLDivElement | null>(null)
  const [canvasScale, setCanvasScale] = useState(1)
  const canvasDragRef = useRef<CanvasDragState | null>(null)
  const canvasResizeRef = useRef<CanvasResizeState | null>(null)
  const canvasDragMovedRef = useRef(false)
  const canvasResizeMovedRef = useRef(false)
  const canvasContentRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const historyIndexRef = useRef<number | null>(null)
  const historyBounceRef = useRef(false)

  const actor = useMemo(() => ({
    user_id: appUser?.user_id || 'qa-admin-user',
    user_email: appUser?.email || 'qa-admin@example.com',
    role: appUser?.role || 'member',
  }), [appUser])
  const isSlidesAdmin = appUser?.role === 'admin'
  const draftRecoveryKey = useMemo(() => `${DRAFT_RECOVERY_KEY_PREFIX}:${actor.user_id}`, [actor.user_id])
  const trimmedSearchValue = searchValue.trim()
  const visibleSlideIds = useMemo(() => slides.map((slide) => slide.id), [slides])
  const selectedVisibleSlideCount = useMemo(() => (
    pptxSelectedSlideIds.filter((slideId) => visibleSlideIds.includes(slideId)).length
  ), [pptxSelectedSlideIds, visibleSlideIds])
  const selectedHiddenSlideCount = Math.max(0, pptxSelectedSlideIds.length - selectedVisibleSlideCount)
  const areAllVisibleSlidesSelected = slides.length > 0 && selectedVisibleSlideCount === slides.length
  const workspaceLabel = workspaceTab === 'import'
    ? 'Import Workspace'
    : workspaceTab === 'my-slides'
      ? 'My Slides'
      : workspaceTab === 'templates'
        ? 'Template Library'
        : 'Activity Feed'
  const searchLabel = workspaceTab === 'activity' ? 'Search activity' : 'Search library'
  const searchPlaceholder = workspaceTab === 'activity' ? 'Search activity events' : 'Search slides or templates'
  const hasActiveAuditFilters =
    auditActionFilter !== 'all' ||
    auditOutcomeFilter !== 'all' ||
    auditEntityTypeFilter !== 'all' ||
    auditDateFrom.length > 0 ||
    auditDateTo.length > 0
  const selectedAuditPreset = useMemo(
    () => auditPresets.find((preset) => preset.id === selectedAuditPresetId) || null,
    [auditPresets, selectedAuditPresetId],
  )

  const warningGroups = useMemo(() => summarizeWarnings(result?.warnings || []), [result])
  const updateCanvasSnapGuides = useCallback((next: CanvasSnapGuides) => {
    setCanvasSnapGuides((previous) => (
      previous.x === next.x && previous.y === next.y
        ? previous
        : next
    ))
  }, [])
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
      textAutoSize: !!lead.style.textAutoSize,
    }
  }, [selectedComponents])
  const selectedBounds = useMemo(() => {
    if (selectedComponents.length !== 1) return null
    const lead = selectedComponents[0]
    return {
      x: lead.x,
      y: lead.y,
      width: lead.width,
      height: typeof lead.height === 'number' ? lead.height : MIN_COMPONENT_HEIGHT,
      autoSizeSupported: supportsTextAutoSize(lead),
    }
  }, [selectedComponents])
  const autoSizeEligibleSelection = useMemo(
    () => selectedComponents.filter((component) => supportsTextAutoSize(component) && !component.locked),
    [selectedComponents],
  )
  const autoSizeEnabledForSelection =
    autoSizeEligibleSelection.length > 0 &&
    autoSizeEligibleSelection.every((component) => component.style.textAutoSize === true)
  const autoSizeMixedSelection =
    autoSizeEligibleSelection.some((component) => component.style.textAutoSize === true) &&
    !autoSizeEnabledForSelection
  const templateById = useMemo(() => {
    const map = new Map<string, SlideTemplateRecord>()
    for (const template of templates) map.set(template.id, template)
    return map
  }, [templates])
  const pendingApprovalsByTemplate = useMemo(() => {
    const byTemplate: Record<string, SlideTemplateApproval[]> = {}
    for (const approval of templateApprovals) {
      if (!byTemplate[approval.template_id]) byTemplate[approval.template_id] = []
      byTemplate[approval.template_id].push(approval)
    }
    return byTemplate
  }, [templateApprovals])
  const rankedTemplates = useMemo<RankedTemplateEntry[]>(() => {
    const query = normalizeTemplateSearchText(trimmedSearchValue)
    const rows = templates.map((template) => {
      const pendingCount = (pendingApprovalsByTemplate[template.id] || []).length
      const rank = rankTemplateForSearch(template, query)
      const recencyBoost = Number.isFinite(Date.parse(template.updated_at))
        ? Math.max(0, 7 - Math.floor((Date.now() - Date.parse(template.updated_at)) / (1000 * 60 * 60 * 24)))
        : 0
      const queryScore = rank.score > 0
        ? rank.score + recencyBoost + Math.min(12, pendingCount * 3)
        : 0
      return {
        template,
        searchScore: query ? queryScore : 0,
        matchSignals: rank.matchSignals,
        pendingApprovals: pendingCount,
        isBestMatch: false,
      }
    })

    const filtered = query
      ? rows.filter((entry) => entry.searchScore > 0)
      : rows

    const sorted = [...filtered].sort((left, right) => {
      if (query) {
        if (right.searchScore !== left.searchScore) return right.searchScore - left.searchScore
      }
      if (right.pendingApprovals !== left.pendingApprovals) return right.pendingApprovals - left.pendingApprovals
      const updatedCompare = right.template.updated_at.localeCompare(left.template.updated_at)
      if (updatedCompare !== 0) return updatedCompare
      return left.template.name.localeCompare(right.template.name)
    })

    if (query && sorted.length > 0) {
      sorted[0] = { ...sorted[0], isBestMatch: true }
    }
    return sorted
  }, [pendingApprovalsByTemplate, templates, trimmedSearchValue])
  const activeTemplateQuickPreview = useMemo(
    () => rankedTemplates.find((entry) => entry.template.id === templateQuickPreviewId) || null,
    [rankedTemplates, templateQuickPreviewId],
  )
  const showTemplateApprovalQueue = actor.role === 'admin' || templateApprovals.length > 0
  const overdueTemplateApprovals = useMemo(
    () => templateApprovals.filter((approval) => getApprovalSlaState(approval).tone === 'overdue').length,
    [templateApprovals],
  )

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
        leftStyle.textAlign !== rightStyle.textAlign ||
        leftStyle.textAutoSize !== rightStyle.textAutoSize
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

  const queueAutosaveRetry = useCallback((errorMessage: string, attempt: number) => {
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
  }, [])

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

  const clearDegradedMode = useCallback(() => {
    setDegradedState(null)
  }, [])

  const updateCanvasComponentContent = useCallback((componentId: string, content: string) => {
    if (!result) return
    const existing = result.components.find((component) => component.id === componentId)
    if (!existing || existing.locked || existing.content === content) return
    pushHistorySnapshot(result.components)
    setResult((previous) => {
      if (!previous) return previous

      const nextComponents = previous.components.map((component) => {
        if (component.id !== componentId) return component
        const nextHeight =
          component.style.textAutoSize && supportsTextAutoSize(component)
            ? measureTextAutoSizeHeight({ ...component, content }, component.width)
            : component.height
        return {
          ...component,
          content,
          height: nextHeight,
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

    if (event.altKey && !event.metaKey && !event.ctrlKey) {
      const sizeStep = event.shiftKey ? 10 : 1
      let deltaWidth = 0
      let deltaHeight = 0
      if (event.key === 'ArrowLeft') deltaWidth = -sizeStep
      if (event.key === 'ArrowRight') deltaWidth = sizeStep
      if (event.key === 'ArrowUp') deltaHeight = -sizeStep
      if (event.key === 'ArrowDown') deltaHeight = sizeStep
      if (!deltaWidth && !deltaHeight) return
      event.preventDefault()

      const selectedIds = new Set(
        result.components
          .filter((component) => selectedComponentIds.includes(component.id) && !component.locked)
          .map((component) => component.id),
      )
      if (selectedIds.size === 0) {
        setEditorNotice({ tone: 'error', text: 'Locked layers cannot be resized with keyboard shortcuts.' })
        return
      }

      const canResize = result.components.some((component) => {
        if (!selectedIds.has(component.id)) return false
        const maxWidth = Math.max(MIN_COMPONENT_WIDTH, result.canvas.width - component.x)
        const nextWidth = Math.min(maxWidth, Math.max(MIN_COMPONENT_WIDTH, component.width + deltaWidth))
        const maxHeight = Math.max(MIN_COMPONENT_HEIGHT, result.canvas.height - component.y)
        const baseHeight = typeof component.height === 'number' ? component.height : MIN_COMPONENT_HEIGHT
        const nextHeight = component.style.textAutoSize && supportsTextAutoSize(component)
          ? Math.min(maxHeight, measureTextAutoSizeHeight(component, nextWidth))
          : Math.min(maxHeight, Math.max(MIN_COMPONENT_HEIGHT, baseHeight + deltaHeight))
        return nextWidth !== component.width || nextHeight !== baseHeight
      })
      if (!canResize) return

      pushHistorySnapshot(result.components)
      setResult((previous) => {
        if (!previous) return previous
        const nextComponents = previous.components.map((component) => {
          if (!selectedIds.has(component.id)) return component
          const maxWidth = Math.max(MIN_COMPONENT_WIDTH, previous.canvas.width - component.x)
          const nextWidth = Math.min(maxWidth, Math.max(MIN_COMPONENT_WIDTH, component.width + deltaWidth))
          const maxHeight = Math.max(MIN_COMPONENT_HEIGHT, previous.canvas.height - component.y)
          const baseHeight = typeof component.height === 'number' ? component.height : MIN_COMPONENT_HEIGHT
          const nextHeight = component.style.textAutoSize && supportsTextAutoSize(component)
            ? Math.min(maxHeight, measureTextAutoSizeHeight(component, nextWidth))
            : Math.min(maxHeight, Math.max(MIN_COMPONENT_HEIGHT, baseHeight + deltaHeight))
          return {
            ...component,
            width: nextWidth,
            height: nextHeight,
          }
        })
        return {
          ...previous,
          components: nextComponents,
        }
      })
      setDirty()
      return
    }

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
    let nextGuides: CanvasSnapGuides = { x: null, y: null }
    setResult((previous) => {
      if (!previous) return previous
      const movingIdSet = new Set(drag.componentIds)
      const movingComponents = previous.components.filter((component) => movingIdSet.has(component.id))
      if (movingComponents.length === 0) return previous

      const anchorId = draggingComponentId && movingIdSet.has(draggingComponentId)
        ? draggingComponentId
        : movingComponents[0].id
      const anchorComponent = movingComponents.find((component) => component.id === anchorId) || movingComponents[0]
      const anchorOrigin = drag.originById[anchorComponent.id]
      if (!anchorOrigin) return previous

      const targets = buildCanvasSnapTargets(previous.components, movingIdSet, previous.canvas)
      const anchorHeight = resolveComponentHeight(anchorComponent)
      const snapX = findMoveSnap(anchorOrigin.x + deltaX, anchorComponent.width, targets.x, SNAP_TOLERANCE_PX)
      const snapY = findMoveSnap(anchorOrigin.y + deltaY, anchorHeight, targets.y, SNAP_TOLERANCE_PX)
      const translatedX = deltaX + snapX.delta
      const translatedY = deltaY + snapY.delta

      const nextComponents = previous.components.map((component) => {
        const origin = drag.originById[component.id]
        if (!origin) return component
        const nextCoordinates = clampCanvasCoordinates(
          component,
          previous.canvas,
          origin.x + translatedX,
          origin.y + translatedY,
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
      nextGuides = {
        x: snapX.guide,
        y: snapY.guide,
      }
      return {
        ...previous,
        components: nextComponents,
      }
    })

    if (moved) {
      canvasDragMovedRef.current = true
      updateCanvasSnapGuides(nextGuides)
      return
    }
    updateCanvasSnapGuides({ x: null, y: null })
  }, [canvasScale, draggingComponentId, updateCanvasSnapGuides])

  const handleCanvasResizeMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const resize = canvasResizeRef.current
    if (!resize || event.pointerId !== resize.pointerId) return

    const scale = canvasScale > 0 ? canvasScale : 1
    const deltaX = Math.round((event.clientX - resize.startClientX) / scale)
    const deltaY = Math.round((event.clientY - resize.startClientY) / scale)

    let moved = false
    let nextGuides: CanvasSnapGuides = { x: null, y: null }
    setResult((previous) => {
      if (!previous) return previous
      const targets = buildCanvasSnapTargets(previous.components, new Set([resize.componentId]), previous.canvas)
      const nextComponents = previous.components.map((component) => {
        if (component.id !== resize.componentId) return component

        const maxWidth = Math.max(MIN_COMPONENT_WIDTH, previous.canvas.width - resize.originX)
        let nextWidth = Math.min(maxWidth, Math.max(MIN_COMPONENT_WIDTH, resize.originWidth + deltaX))
        const snappedX = findEndSnap(resize.originX + nextWidth, targets.x, SNAP_TOLERANCE_PX)
        if (snappedX.guide !== null) {
          nextWidth = Math.min(maxWidth, Math.max(MIN_COMPONENT_WIDTH, nextWidth + snappedX.delta))
          nextGuides.x = snappedX.guide
        }
        const maxHeight = Math.max(MIN_COMPONENT_HEIGHT, previous.canvas.height - resize.originY)
        const resizedHeight = resize.supportsHeight
          ? Math.min(maxHeight, Math.max(MIN_COMPONENT_HEIGHT, resize.originHeight + deltaY))
          : undefined
        let nextHeight =
          component.style.textAutoSize && supportsTextAutoSize(component)
            ? Math.min(maxHeight, measureTextAutoSizeHeight(component, nextWidth))
            : resizedHeight
        if (typeof nextHeight === 'number') {
          const snappedY = findEndSnap(resize.originY + nextHeight, targets.y, SNAP_TOLERANCE_PX)
          if (snappedY.guide !== null) {
            nextHeight = Math.min(maxHeight, Math.max(MIN_COMPONENT_HEIGHT, nextHeight + snappedY.delta))
            nextGuides.y = snappedY.guide
          }
        }

        const widthChanged = nextWidth !== component.width
        const heightChanged = typeof nextHeight === 'number' ? nextHeight !== component.height : false
        if (!widthChanged && !heightChanged) return component

        moved = true
        return {
          ...component,
          width: nextWidth,
          height: typeof nextHeight === 'number' ? nextHeight : component.height,
        }
      })

      if (!moved) return previous
      return {
        ...previous,
        components: nextComponents,
      }
    })

    if (moved) {
      canvasResizeMovedRef.current = true
      updateCanvasSnapGuides(nextGuides)
      return
    }
    updateCanvasSnapGuides({ x: null, y: null })
  }, [canvasScale, updateCanvasSnapGuides])

  const finalizeCanvasDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = canvasDragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    canvasDragRef.current = null
    setDraggingComponentId(null)
    updateCanvasSnapGuides({ x: null, y: null })
    if (canvasDragMovedRef.current) {
      canvasDragMovedRef.current = false
      pushHistorySnapshot(drag.snapshotBefore)
      setDirty()
    }
  }, [pushHistorySnapshot, setDirty, updateCanvasSnapGuides])

  const finalizeCanvasResize = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const resize = canvasResizeRef.current
    if (!resize || event.pointerId !== resize.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    canvasResizeRef.current = null
    setResizingComponentId(null)
    updateCanvasSnapGuides({ x: null, y: null })
    if (canvasResizeMovedRef.current) {
      canvasResizeMovedRef.current = false
      pushHistorySnapshot(resize.snapshotBefore)
      setDirty()
    }
  }, [pushHistorySnapshot, setDirty, updateCanvasSnapGuides])

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
    updateCanvasSnapGuides({ x: null, y: null })
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
  }, [cloneComponents, result, selectedComponentIds, updateCanvasSnapGuides])

  const handleResizePointerDown = useCallback((component: SlideComponent, event: ReactPointerEvent<HTMLElement>) => {
    if (!result || component.locked) return
    if (event.button !== 0) return

    setEditingComponentId(null)
    updateCanvasSnapGuides({ x: null, y: null })
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
  }, [cloneComponents, result, updateCanvasSnapGuides])

  const handleCanvasPointerRelease = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    finalizeCanvasDrag(event)
    finalizeCanvasResize(event)
  }, [finalizeCanvasDrag, finalizeCanvasResize])

  const parseHtmlSync = useCallback((html: string): SlideImportResult => {
    const pendingWarnings = pendingImportWarningsRef.current
    pendingImportWarningsRef.current = []

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

    const mergedWarnings = pendingWarnings.length > 0
      ? Array.from(new Set([...pendingWarnings, ...parsed.warnings]))
      : parsed.warnings
    const parsedResult = mergedWarnings === parsed.warnings
      ? parsed
      : {
          ...parsed,
          warnings: mergedWarnings,
        }

    setResult(parsedResult)
    setSelectedComponentIds([])
    setEditingComponentId(null)
    setDraggingComponentId(null)
    setResizingComponentId(null)
    clearHistory()
    setEditorNotice(null)
    setImportError(null)
    setParseStatus('completed')
    setParseProgress(100)
    setParseMessage(`Parsed ${parsedResult.components.length} components.`)
    setExportHtml('')
    setDirty()
    return parsedResult
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
      const [
        slideRowsResult,
        templateRowsResult,
        approvalRowsResult,
        auditRowsResult,
        auditPresetRowsResult,
        auditExportJobRowsResult,
      ] = await Promise.allSettled([
        listSlides(actor, searchValue),
        listTemplates(actor, searchValue),
        listTemplateApprovals(actor, { status: 'pending' }),
        listSlideAudits(actor, {
          limit: AUDIT_PAGE_SIZE,
          offset: auditOffset,
          search: searchValue,
          action: auditActionFilter,
          outcome: auditOutcomeFilter,
          entityType: auditEntityTypeFilter,
          dateFrom: auditDateFrom,
          dateTo: auditDateTo,
        }),
        listAuditPresets(actor),
        listAuditExportJobs(actor, { status: auditExportStatusFilter }),
      ])

      const blockingErrors: string[] = []
      const nonBlockingWarnings: string[] = []

      if (slideRowsResult.status === 'fulfilled') {
        setSlides(slideRowsResult.value)
      } else {
        blockingErrors.push(slideRowsResult.reason instanceof Error ? slideRowsResult.reason.message : String(slideRowsResult.reason))
      }

      if (templateRowsResult.status === 'fulfilled') {
        setTemplates(templateRowsResult.value)
      } else {
        blockingErrors.push(templateRowsResult.reason instanceof Error ? templateRowsResult.reason.message : String(templateRowsResult.reason))
      }

      if (approvalRowsResult.status === 'fulfilled') {
        setTemplateApprovals(approvalRowsResult.value)
      } else {
        nonBlockingWarnings.push('Template approvals are temporarily unavailable.')
      }

      if (auditRowsResult.status === 'fulfilled') {
        setAudits(auditRowsResult.value.items)
        setAuditHasMore(auditRowsResult.value.pagination.has_more)
      } else {
        nonBlockingWarnings.push('Activity audit feed is temporarily unavailable.')
      }

      if (auditPresetRowsResult.status === 'fulfilled') {
        setAuditPresets(auditPresetRowsResult.value)
      } else {
        nonBlockingWarnings.push('Activity presets are temporarily unavailable.')
      }

      if (auditExportJobRowsResult.status === 'fulfilled') {
        setAuditExportJobs(auditExportJobRowsResult.value)
      } else {
        nonBlockingWarnings.push('Audit export jobs are temporarily unavailable.')
      }

      if (blockingErrors.length > 0) {
        setLibraryError(blockingErrors[0])
      } else if (nonBlockingWarnings.length > 0) {
        setLibraryError(nonBlockingWarnings[0])
      }
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    } finally {
      setLibraryLoading(false)
    }
  }, [
    actor,
    auditActionFilter,
    auditDateFrom,
    auditDateTo,
    auditEntityTypeFilter,
    auditExportStatusFilter,
    auditOffset,
    auditOutcomeFilter,
    searchValue,
  ])

  useEffect(() => {
    setAuditOffset(0)
  }, [searchValue, auditActionFilter, auditOutcomeFilter, auditEntityTypeFilter, auditDateFrom, auditDateTo])

  useEffect(() => {
    return subscribeSlidesRuntimeHealth((state) => {
      setRuntimeHealth(state)
    })
  }, [])

  useEffect(() => {
    if (runtimeHealth.mode !== 'degraded' || !runtimeHealth.lastFailure) return
    setDegradedState({
      mode: 'local-draft',
      message: 'Slides service degraded. Local draft mode is active for unavailable endpoints.',
      correlationId: runtimeHealth.lastFailure.correlationId,
      rayId: runtimeHealth.lastFailure.rayId,
      endpoint: runtimeHealth.lastFailure.endpoint || '/api/slides',
    })
  }, [runtimeHealth])

  useEffect(() => {
    if (!allowRender) return
    void refreshLibraryData()
  }, [allowRender, refreshLibraryData])

  useEffect(() => {
    if (isSlidesAdmin) return
    setAuditPresetScope('personal')
  }, [isSlidesAdmin])

  useEffect(() => {
    if (trimmedSearchValue.length > 0) return
    setPptxSelectedSlideIds((previous) =>
      previous.filter((slideId) => slides.some((slide) => slide.id === slideId)),
    )
  }, [slides, trimmedSearchValue])

  useEffect(() => {
    if (!selectedAuditPresetId) return
    if (auditPresets.some((preset) => preset.id === selectedAuditPresetId)) return
    setSelectedAuditPresetId('')
  }, [auditPresets, selectedAuditPresetId])

  useEffect(() => {
    if (!templateQuickPreviewId) return
    if (templates.some((template) => template.id === templateQuickPreviewId)) return
    setTemplateQuickPreviewId(null)
  }, [templateQuickPreviewId, templates])

  useEffect(() => {
    if (typeof window === 'undefined' || !templateQuickPreviewId) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setTemplateQuickPreviewId(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [templateQuickPreviewId])

  const resetAuditFilters = useCallback(() => {
    setAuditActionFilter('all')
    setAuditOutcomeFilter('all')
    setAuditEntityTypeFilter('all')
    setAuditDateFrom('')
    setAuditDateTo('')
    setAuditOffset(0)
  }, [])

  const applyAuditPreset = useCallback((preset: SlideAuditFilterPreset) => {
    setSearchValue(preset.search || '')
    setAuditActionFilter(preset.action)
    setAuditOutcomeFilter(preset.outcome)
    setAuditEntityTypeFilter(preset.entity_type)
    setAuditDateFrom(preset.date_from || '')
    setAuditDateTo(preset.date_to || '')
    setAuditOffset(0)
    setEditorNotice({ tone: 'info', text: `Applied activity preset "${preset.name}".` })
  }, [])

  const handleApplySelectedAuditPreset = useCallback(() => {
    if (!selectedAuditPreset) return
    applyAuditPreset(selectedAuditPreset)
  }, [applyAuditPreset, selectedAuditPreset])

  const handleSaveAuditPreset = useCallback(async () => {
    const name = auditPresetName.trim()
    if (!name) {
      setLibraryError('Preset name is required.')
      return
    }
    if (!isSlidesAdmin && auditPresetScope === 'shared') {
      setLibraryError('Only admins can save shared presets.')
      return
    }

    setAuditPresetBusy(true)
    setLibraryError(null)
    try {
      const preset = await upsertAuditPreset(actor, {
        name,
        scope: auditPresetScope,
        search: searchValue,
        action: auditActionFilter,
        outcome: auditOutcomeFilter,
        entityType: auditEntityTypeFilter,
        dateFrom: auditDateFrom,
        dateTo: auditDateTo,
      })
      await refreshLibraryData()
      setSelectedAuditPresetId(preset.id)
      setAuditPresetName('')
      setEditorNotice({ tone: 'info', text: `Saved activity preset "${preset.name}".` })
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    } finally {
      setAuditPresetBusy(false)
    }
  }, [
    actor,
    auditActionFilter,
    auditDateFrom,
    auditDateTo,
    auditEntityTypeFilter,
    auditOutcomeFilter,
    auditPresetName,
    auditPresetScope,
    isSlidesAdmin,
    refreshLibraryData,
    searchValue,
  ])

  const handleDeleteSelectedAuditPreset = useCallback(async () => {
    if (!selectedAuditPreset) return
    const approved = window.confirm(`Delete activity preset "${selectedAuditPreset.name}"?`)
    if (!approved) return

    setAuditPresetBusy(true)
    setLibraryError(null)
    try {
      await deleteAuditPreset(actor, selectedAuditPreset.id)
      await refreshLibraryData()
      setSelectedAuditPresetId('')
      setEditorNotice({ tone: 'info', text: `Deleted activity preset "${selectedAuditPreset.name}".` })
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    } finally {
      setAuditPresetBusy(false)
    }
  }, [actor, refreshLibraryData, selectedAuditPreset])

  const handleAuditNextPage = useCallback(() => {
    if (!auditHasMore || libraryLoading) return
    setAuditOffset((previous) => previous + AUDIT_PAGE_SIZE)
  }, [auditHasMore, libraryLoading])

  const handleAuditPreviousPage = useCallback(() => {
    if (libraryLoading) return
    setAuditOffset((previous) => Math.max(0, previous - AUDIT_PAGE_SIZE))
  }, [libraryLoading])

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
      setDegradedState(null)

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
        const summary = getSlideErrorSummary(error)
        const nextAttempt = (autosaveRetryState?.attempt || 0) + 1
        if (isAutosaveRetryableError(error) && nextAttempt <= AUTOSAVE_RETRY_MAX_ATTEMPTS) {
          queueAutosaveRetry(summary.message, nextAttempt)
          return null
        }

        const retryExhausted = nextAttempt > AUTOSAVE_RETRY_MAX_ATTEMPTS
        const baseMessage = retryExhausted
          ? `Autosave paused after ${AUTOSAVE_RETRY_MAX_ATTEMPTS} failed attempts.`
          : 'Autosave stopped due to a terminal save error.'
        const recoveryMessage = `${baseMessage} Local draft mode is active until Slides service recovers.`
        setAutosaveEnabled(false)
        setAutosaveRetryState(null)
        setSaveStatus('error')
        setSaveError(`${recoveryMessage} ${summary.message}`)
        setDegradedState({
          mode: 'local-draft',
          message: recoveryMessage,
          correlationId: summary.correlationId,
          rayId: summary.rayId,
          endpoint: summary.endpoint,
        })
        return null
      }

      setSaveStatus('error')
      const summary = getSlideErrorSummary(error)
      setSaveError(summary.message)
      return null
    }
  }, [
    activeRevision,
    activeSlideId,
    actor,
    autosaveRetryState,
    normalizeComponentsForPersistence,
    queueAutosaveRetry,
    rawHtml.length,
    refreshLibraryData,
    result,
    slideTitle,
  ])

  const retrySlidesService = useCallback(async () => {
    setLibraryError(null)
    setSaveError(null)
    setAutosaveRetryState(null)
    setAutosaveEnabled(true)
    setDegradedState(null)
    await refreshLibraryData()
    if (result && saveStatus === 'dirty') {
      await handleSave({ autosave: true })
    }
  }, [handleSave, refreshLibraryData, result, saveStatus])

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
    historyIndexRef.current = readHistoryIndex(window.history.state)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handlePopState = (event: PopStateEvent) => {
      const nextIndex = readHistoryIndex(event.state)

      if (historyBounceRef.current) {
        historyBounceRef.current = false
        historyIndexRef.current = nextIndex
        return
      }

      if (!hasUnsavedChanges) {
        historyIndexRef.current = nextIndex
        return
      }

      const approved = window.confirm(UNSAVED_CHANGES_CONFIRM_TEXT)
      if (approved) {
        historyIndexRef.current = nextIndex
        return
      }

      const previousIndex = historyIndexRef.current
      historyBounceRef.current = true

      if (previousIndex != null && nextIndex != null && nextIndex > previousIndex) {
        window.history.back()
        return
      }

      window.history.forward()
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
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
    const selectedFiles = Array.from(event.target.files || [])
    if (selectedFiles.length === 0) return

    const selection = selectImportFiles(selectedFiles)
    if (!selection.htmlFile) {
      const message = 'Select an .html file. Optional companion .css files can be selected together for higher-fidelity import.'
      setImportError({
        code: 'invalid_file_type',
        message,
      })
      setParseStatus('failed')
      setParseProgress(0)
      setParseMessage(message)
      event.target.value = ''
      return
    }

    const fileValidation = validateImportFile(selection.htmlFile)
    if (fileValidation) {
      setImportError(fileValidation)
      setParseStatus('failed')
      setParseProgress(0)
      setParseMessage(fileValidation.message)
      event.target.value = ''
      return
    }

    const text = await selection.htmlFile.text()
    const inlineResult = await inlineCompanionStylesheets(text, selection.cssFiles)
    const importWarnings: string[] = []
    if (inlineResult.inlinedHrefs.length > 0) {
      importWarnings.push(
        `Inlined ${inlineResult.inlinedHrefs.length} companion stylesheet${inlineResult.inlinedHrefs.length === 1 ? '' : 's'} from selected files.`,
      )
    }
    if (inlineResult.unresolvedHrefs.length > 0) {
      importWarnings.push(
        `Could not match ${inlineResult.unresolvedHrefs.length} linked stylesheet${inlineResult.unresolvedHrefs.length === 1 ? '' : 's'} to selected CSS files.`,
      )
    }
    if (inlineResult.ignoredCssFiles.length > 0) {
      importWarnings.push(
        `Ignored ${inlineResult.ignoredCssFiles.length} oversized CSS companion file${inlineResult.ignoredCssFiles.length === 1 ? '' : 's'}.`,
      )
    }

    pendingImportWarningsRef.current = importWarnings
    setRawHtml(inlineResult.html)
    await runParseWithProgress(inlineResult.html)
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

  const openPublishTemplateDraft = useCallback((slide: SlideRecord) => {
    setLibraryError(null)
    setTemplatePublishDraft({
      slideId: slide.id,
      name: `${slide.title} Template`,
      description: 'Published from My Slides',
      isShared: false,
    })
  }, [])

  const closePublishTemplateDraft = useCallback(() => {
    setTemplatePublishDraft(null)
    setTemplatePublishBusy(false)
  }, [])

  const handlePublishTemplate = useCallback(async () => {
    if (!templatePublishDraft || templatePublishBusy) return
    const name = templatePublishDraft.name.trim()
    if (!name) {
      setLibraryError('Template name is required.')
      return
    }

    setTemplatePublishBusy(true)
    try {
      await publishTemplateFromSlide(actor, templatePublishDraft.slideId, {
        name,
        description: templatePublishDraft.description.trim() || 'Published from My Slides',
        isShared: isSlidesAdmin ? templatePublishDraft.isShared : false,
      })
      await refreshLibraryData()
      closePublishTemplateDraft()
      setEditorNotice({ tone: 'info', text: `Template "${name}" published.` })
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
      setTemplatePublishBusy(false)
    }
  }, [actor, closePublishTemplateDraft, isSlidesAdmin, refreshLibraryData, templatePublishBusy, templatePublishDraft])

  const handleTemplateVisibilityToggle = useCallback(async (template: SlideTemplateRecord) => {
    const nextShared = !template.is_shared
    if (nextShared && !isSlidesAdmin) {
      setLibraryError('Only admins can publish shared templates.')
      return
    }

    setTemplateActionBusyId(template.id)
    setLibraryError(null)
    try {
      await updateTemplate(actor, template.id, { isShared: nextShared })
      await refreshLibraryData()
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    } finally {
      setTemplateActionBusyId(null)
    }
  }, [actor, isSlidesAdmin, refreshLibraryData])

  const openTransferTemplateDraft = useCallback((template: SlideTemplateRecord) => {
    setLibraryError(null)
    setTemplateTransferDraft({
      templateId: template.id,
      target: '',
    })
  }, [])

  const closeTransferTemplateDraft = useCallback(() => {
    setTemplateTransferDraft(null)
  }, [])

  const refreshTemplateCollaboratorRows = useCallback(async (templateId: string) => {
    const rows = await listTemplateCollaborators(actor, templateId)
    setTemplateCollaboratorsByTemplate((previous) => ({ ...previous, [templateId]: rows }))
  }, [actor])

  const toggleTemplateCollaboratorPanel = useCallback(async (template: SlideTemplateRecord) => {
    if (templateCollaboratorPanelId === template.id) {
      setTemplateCollaboratorPanelId(null)
      setTemplateCollaboratorDraft(null)
      return
    }

    setTemplateCollaboratorPanelId(template.id)
    setTemplateCollaboratorDraft({
      templateId: template.id,
      target: '',
      role: 'viewer',
    })
    try {
      await refreshTemplateCollaboratorRows(template.id)
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    }
  }, [refreshTemplateCollaboratorRows, templateCollaboratorPanelId])

  const handleUpsertTemplateCollaborator = useCallback(async (template: SlideTemplateRecord) => {
    if (!templateCollaboratorDraft || templateCollaboratorDraft.templateId !== template.id) return
    const target = templateCollaboratorDraft.target.trim()
    if (!target) {
      setLibraryError('Collaborator email or user id is required.')
      return
    }

    setTemplateActionBusyId(template.id)
    setLibraryError(null)
    try {
      if (actor.role === 'admin') {
        await upsertTemplateCollaborator(actor, template.id, {
          userEmail: target.includes('@') ? target : undefined,
          userId: target.includes('@') ? undefined : target,
          role: templateCollaboratorDraft.role,
        })
      } else {
        await submitTemplateApproval(actor, {
          templateId: template.id,
          approvalType: 'upsert-collaborator',
          userEmail: target.includes('@') ? target : undefined,
          userId: target.includes('@') ? undefined : target,
          role: templateCollaboratorDraft.role,
        })
      }
      await refreshTemplateCollaboratorRows(template.id)
      await refreshLibraryData()
      setEditorNotice({
        tone: 'info',
        text:
          actor.role === 'admin'
            ? `Updated collaborator access for "${template.name}".`
            : `Submitted collaborator approval request for "${template.name}".`,
      })
      setTemplateCollaboratorDraft((previous) =>
        previous && previous.templateId === template.id
          ? { ...previous, target: '' }
          : previous,
      )
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    } finally {
      setTemplateActionBusyId(null)
    }
  }, [actor, refreshLibraryData, refreshTemplateCollaboratorRows, templateCollaboratorDraft])

  const handleRemoveTemplateCollaborator = useCallback(async (template: SlideTemplateRecord, collaborator: SlideTemplateCollaborator) => {
    setTemplateActionBusyId(template.id)
    setLibraryError(null)
    try {
      if (actor.role === 'admin') {
        await removeTemplateCollaborator(actor, template.id, {
          userId: collaborator.user_id,
          userEmail: collaborator.user_email || undefined,
        })
      } else {
        await submitTemplateApproval(actor, {
          templateId: template.id,
          approvalType: 'remove-collaborator',
          userId: collaborator.user_id,
          userEmail: collaborator.user_email || undefined,
        })
      }
      await refreshTemplateCollaboratorRows(template.id)
      await refreshLibraryData()
      setEditorNotice({
        tone: 'info',
        text:
          actor.role === 'admin'
            ? `Removed collaborator access for "${collaborator.user_email || collaborator.user_id}".`
            : `Submitted collaborator removal approval for "${collaborator.user_email || collaborator.user_id}".`,
      })
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    } finally {
      setTemplateActionBusyId(null)
    }
  }, [actor, refreshLibraryData, refreshTemplateCollaboratorRows])

  const handleTransferTemplateOwnership = useCallback(async (template: SlideTemplateRecord) => {
    if (templateActionBusyId) return
    if (!templateTransferDraft || templateTransferDraft.templateId !== template.id) return
    const target = templateTransferDraft.target.trim()
    if (!target) {
      setLibraryError('New owner email or user id is required.')
      return
    }

    setTemplateActionBusyId(template.id)
    setLibraryError(null)
    try {
      if (actor.role === 'admin') {
        await transferTemplateOwnership(actor, template.id, {
          userEmail: target.includes('@') ? target : undefined,
          userId: target.includes('@') ? undefined : target,
        })
      } else {
        await submitTemplateApproval(actor, {
          templateId: template.id,
          approvalType: 'transfer-template',
          userEmail: target.includes('@') ? target : undefined,
          userId: target.includes('@') ? undefined : target,
        })
      }
      await refreshLibraryData()
      setTemplateTransferDraft(null)
      if (templateCollaboratorPanelId === template.id) {
        setTemplateCollaboratorPanelId(null)
        setTemplateCollaboratorDraft(null)
      }
      setEditorNotice({
        tone: 'info',
        text:
          actor.role === 'admin'
            ? `Transferred template "${template.name}" ownership to ${target}.`
            : `Submitted ownership transfer approval for "${template.name}" to ${target}.`,
      })
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    } finally {
      setTemplateActionBusyId(null)
    }
  }, [actor, refreshLibraryData, templateActionBusyId, templateCollaboratorPanelId, templateTransferDraft])

  const handleArchiveTemplate = useCallback(async (template: SlideTemplateRecord) => {
    const approved = window.confirm(`Archive template "${template.name}"?`)
    if (!approved) return

    setTemplateActionBusyId(template.id)
    setLibraryError(null)
    try {
      await archiveTemplate(actor, template.id)
      await refreshLibraryData()
      if (templateCollaboratorPanelId === template.id) {
        setTemplateCollaboratorPanelId(null)
        setTemplateCollaboratorDraft(null)
      }
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    } finally {
      setTemplateActionBusyId(null)
    }
  }, [actor, refreshLibraryData, templateCollaboratorPanelId])

  const handleResolveTemplateApproval = useCallback(async (approval: SlideTemplateApproval, decision: 'approve' | 'reject') => {
    if (templateApprovalBusyId) return
    if (decision === 'reject') {
      const confirmed = window.confirm(`Reject approval request "${formatTemplateApprovalType(approval.approval_type)}" for this template?`)
      if (!confirmed) return
    }

    setTemplateApprovalBusyId(approval.id)
    setLibraryError(null)
    try {
      await resolveTemplateApproval(actor, approval.id, decision)
      await refreshLibraryData()
      if (templateCollaboratorPanelId === approval.template_id) {
        await refreshTemplateCollaboratorRows(approval.template_id)
      }
      const templateName = templateById.get(approval.template_id)?.name || approval.template_id
      setEditorNotice({
        tone: 'info',
        text:
          decision === 'approve'
            ? `Approved "${formatTemplateApprovalType(approval.approval_type)}" for "${templateName}".`
            : `Rejected "${formatTemplateApprovalType(approval.approval_type)}" for "${templateName}".`,
      })
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    } finally {
      setTemplateApprovalBusyId(null)
    }
  }, [actor, refreshLibraryData, refreshTemplateCollaboratorRows, templateApprovalBusyId, templateById, templateCollaboratorPanelId])

  const handleEscalateTemplateApproval = useCallback(async (approval: SlideTemplateApproval) => {
    if (templateApprovalBusyId) return
    const reasonInput = window.prompt('Optional escalation note for this approval (max 280 chars):', '')
    if (reasonInput === null) return

    const reason = reasonInput.trim()
    if (reason.length > 280) {
      setLibraryError('Escalation note must be 280 characters or fewer.')
      return
    }

    setTemplateApprovalBusyId(approval.id)
    setLibraryError(null)
    try {
      await escalateTemplateApproval(actor, approval.id, reason)
      await refreshLibraryData()
      const templateName = templateById.get(approval.template_id)?.name || approval.template_id
      setEditorNotice({
        tone: 'info',
        text: `Escalated "${formatTemplateApprovalType(approval.approval_type)}" for "${templateName}" to the governance queue.`,
      })
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    } finally {
      setTemplateApprovalBusyId(null)
    }
  }, [actor, refreshLibraryData, templateApprovalBusyId, templateById])

  const handleRunApprovalEscalationSweep = useCallback(async () => {
    if (templateApprovalBusyId) return
    setTemplateApprovalBusyId('sweep')
    setLibraryError(null)
    try {
      const result = await runTemplateApprovalEscalationSweep(actor)
      await refreshLibraryData()
      setEditorNotice({
        tone: 'info',
        text: result.throttled
          ? 'Approval sweep is throttled by automation interval. Retry later or run with force from scheduled job context.'
          : `Approval sweep processed ${result.processed} pending requests and escalated ${result.escalated}.`,
      })
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    } finally {
      setTemplateApprovalBusyId(null)
    }
  }, [actor, refreshLibraryData, templateApprovalBusyId])

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
      const nextHeight =
        nextStyle.textAutoSize && supportsTextAutoSize(component)
          ? measureTextAutoSizeHeight({ ...component, style: nextStyle }, component.width)
          : component.height
      return {
        ...component,
        style: nextStyle,
        height: nextHeight,
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

  const applyBoundsToSelection = useCallback((patch: Partial<Pick<SlideComponent, 'x' | 'y' | 'width' | 'height'>>) => {
    if (!result || selectedComponents.length !== 1) {
      setEditorNotice({ tone: 'error', text: 'Select one unlocked layer before editing bounds.' })
      return
    }

    const component = selectedComponents[0]
    if (component.locked) {
      setEditorNotice({ tone: 'error', text: 'Locked layers cannot be resized or moved from the inspector.' })
      return
    }

    const hasX = Number.isFinite(patch.x)
    const hasY = Number.isFinite(patch.y)
    const hasWidth = Number.isFinite(patch.width)
    const hasHeight = Number.isFinite(patch.height)
    if (!hasX && !hasY && !hasWidth && !hasHeight) return

    const nextWidth = hasWidth
      ? Math.max(MIN_COMPONENT_WIDTH, Math.round(Number(patch.width)))
      : component.width
    const autoSizeEnabled = component.style.textAutoSize && supportsTextAutoSize(component)
    const maxHeight = Math.max(MIN_COMPONENT_HEIGHT, result.canvas.height - component.y)
    const directHeight = hasHeight
      ? Math.max(MIN_COMPONENT_HEIGHT, Math.round(Number(patch.height)))
      : (typeof component.height === 'number' ? component.height : MIN_COMPONENT_HEIGHT)
    const nextHeight = autoSizeEnabled
      ? Math.min(maxHeight, measureTextAutoSizeHeight(component, nextWidth))
      : directHeight

    const nextCoordinates = clampCanvasCoordinates(
      { ...component, width: nextWidth, height: nextHeight },
      result.canvas,
      hasX ? Math.max(0, Math.round(Number(patch.x))) : component.x,
      hasY ? Math.max(0, Math.round(Number(patch.y))) : component.y,
    )

    if (
      nextCoordinates.x === component.x &&
      nextCoordinates.y === component.y &&
      nextWidth === component.width &&
      nextHeight === (typeof component.height === 'number' ? component.height : MIN_COMPONENT_HEIGHT)
    ) {
      return
    }

    pushHistorySnapshot(result.components)
    setResult((previous) => {
      if (!previous) return previous
      return {
        ...previous,
        components: previous.components.map((entry) => (
          entry.id === component.id
            ? {
                ...entry,
                x: nextCoordinates.x,
                y: nextCoordinates.y,
                width: nextWidth,
                height: nextHeight,
              }
            : entry
        )),
      }
    })
    setDirty()
    setEditorNotice({
      tone: 'info',
      text: autoSizeEnabled
        ? 'Updated layer bounds. Height is auto-sized from text content.'
        : 'Updated layer bounds from inspector controls.',
    })
  }, [pushHistorySnapshot, result, selectedComponents, setDirty])

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

  const downloadBlobFile = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }, [])

  const downloadTextFile = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    downloadBlobFile(blob, filename)
  }, [downloadBlobFile])

  const handleExportAuditCsv = useCallback(() => {
    if (audits.length === 0) return
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`
    const rows = audits.map((event) =>
      [
        event.created_at,
        event.action,
        event.entity_type,
        event.entity_id,
        event.outcome,
        event.actor_user_id,
        event.actor_email || '',
        event.error_class || '',
      ].map((value) => escapeCsv(String(value))).join(','),
    )
    const csv = [
      'created_at,action,entity_type,entity_id,outcome,actor_user_id,actor_email,error_class',
      ...rows,
    ].join('\n')
    downloadTextFile(csv, 'slide-audit-events.csv', 'text/csv;charset=utf-8')
  }, [audits, downloadTextFile])

  const handleRequestAuditExportJob = useCallback(async () => {
    setAuditExportRequestBusy(true)
    setLibraryError(null)
    try {
      const job = await requestAuditExportJob(actor, {
        search: searchValue,
        action: auditActionFilter,
        outcome: auditOutcomeFilter,
        entityType: auditEntityTypeFilter,
        dateFrom: auditDateFrom,
        dateTo: auditDateTo,
      })
      await refreshLibraryData()
      const statusLabel = formatAuditExportStatus(job.status)
      if (job.status === 'completed') {
        setEditorNotice({
          tone: 'info',
          text: `Audit export ready: ${job.row_count} row(s) generated.`,
        })
      } else {
        setEditorNotice({
          tone: 'info',
          text: `Audit export job queued (${statusLabel}).`,
        })
      }
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    } finally {
      setAuditExportRequestBusy(false)
    }
  }, [
    actor,
    auditActionFilter,
    auditDateFrom,
    auditDateTo,
    auditEntityTypeFilter,
    auditOutcomeFilter,
    refreshLibraryData,
    searchValue,
  ])

  const handleDownloadAuditExport = useCallback(async (job: SlideAuditExportJob) => {
    setAuditExportDownloadBusyId(job.id)
    setLibraryError(null)
    try {
      const file = await downloadAuditExportJob(actor, job.id)
      downloadTextFile(file.content, file.filename, 'text/csv;charset=utf-8')
      setEditorNotice({ tone: 'info', text: `Downloaded ${file.filename}.` })
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : String(error))
    } finally {
      setAuditExportDownloadBusyId(null)
    }
  }, [actor, downloadTextFile])

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

  const runPptxExport = useCallback(async (
    slidesToExport: Array<{ id: string; title: string; canvas: SlideRecord['canvas']; components: SlideRecord['components'] }>,
    options?: { auditSlideIds?: string[]; filenamePrefix?: string },
  ) => {
    if (slidesToExport.length === 0) {
      setSaveError('Select at least one slide to export as PPTX.')
      return
    }

    setPptxExportBusy(true)
    setPptxExportWarnings([])
    setSaveError(null)
    try {
      const { blob, warnings, slideCount } = convertSlidesToPptx(
        slidesToExport.map((slide) => ({
          id: slide.id,
          title: slide.title,
          canvas: slide.canvas,
          components: slide.components,
        })),
      )
      const prefix = (options?.filenamePrefix || 'slides-export').replace(/\\s+/g, '-').toLowerCase()
      downloadBlobFile(blob, `${prefix}.pptx`)
      setPptxExportWarnings(warnings)

      const auditSlideIds = options?.auditSlideIds || []
      if (auditSlideIds.length > 0) {
        await Promise.all(auditSlideIds.map(async (slideId) => {
          try {
            await recordExportEvent(actor, {
              slideId,
              format: 'pptx',
              outcome: 'success',
            })
          } catch {
            // Do not block user download if one audit event write fails.
          }
        }))
        await refreshLibraryData()
      }

      setEditorNotice({
        tone: 'info',
        text: warnings.length > 0
          ? `Exported ${slideCount} slide(s) to PPTX with ${warnings.length} warning(s).`
          : `Exported ${slideCount} slide(s) to PPTX.`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setSaveError(`PPTX export failed: ${message}`)
      const auditSlideIds = options?.auditSlideIds || []
      if (auditSlideIds.length > 0) {
        await Promise.all(auditSlideIds.map(async (slideId) => {
          try {
            await recordExportEvent(actor, {
              slideId,
              format: 'pptx',
              outcome: 'failure',
              errorClass: message,
            })
          } catch {
            // Keep surfacing the primary error.
          }
        }))
        await refreshLibraryData()
      }
    } finally {
      setPptxExportBusy(false)
    }
  }, [actor, downloadBlobFile, refreshLibraryData])

  const handleExportCurrentAsPptx = useCallback(async () => {
    if (!result) {
      setSaveError('Parse HTML before exporting PPTX.')
      return
    }

    await runPptxExport(
      [{
        id: activeSlideId || 'unsaved-slide',
        title: slideTitle || 'Untitled Slide',
        canvas: result.canvas,
        components: result.components,
      }],
      {
        auditSlideIds: activeSlideId ? [activeSlideId] : [],
        filenamePrefix: slideTitle || 'slide-export',
      },
    )
  }, [activeSlideId, result, runPptxExport, slideTitle])

  const handleExportSelectedSlidesAsPptx = useCallback(async () => {
    if (pptxSelectedSlideIds.length === 0) {
      setSaveError('Select at least one slide to export as PPTX.')
      return
    }

    let exportableSlides = slides
    const selectedIds = Array.from(new Set(pptxSelectedSlideIds))
    const missingSelectedIds = selectedIds.filter((slideId) => !exportableSlides.some((slide) => slide.id === slideId))

    if (missingSelectedIds.length > 0) {
      try {
        exportableSlides = await listSlides(actor, '')
      } catch (error) {
        setSaveError(`Could not load selected hidden slides for export: ${error instanceof Error ? error.message : String(error)}`)
        return
      }
    }

    const selectedSlides = exportableSlides.filter((slide) => selectedIds.includes(slide.id))
    if (selectedSlides.length === 0) {
      setSaveError('Selected slides are no longer available for export.')
      return
    }

    if (selectedSlides.length < selectedIds.length) {
      setEditorNotice({
        tone: 'error',
        text: `Exporting ${selectedSlides.length} slide(s); ${selectedIds.length - selectedSlides.length} selected slide(s) were not found.`,
      })
    }

    await runPptxExport(
      selectedSlides.map((slide) => ({
        id: slide.id,
        title: slide.title,
        canvas: slide.canvas,
        components: slide.components,
      })),
      {
        auditSlideIds: selectedSlides.map((slide) => slide.id),
        filenamePrefix: selectedSlides.length === 1 ? selectedSlides[0].title : 'slides-export',
      },
    )
  }, [actor, pptxSelectedSlideIds, runPptxExport, slides])

  const togglePptxSlideSelection = useCallback((slideId: string) => {
    setPptxSelectedSlideIds((previous) => (
      previous.includes(slideId)
        ? previous.filter((id) => id !== slideId)
        : [...previous, slideId]
    ))
  }, [])

  const selectAllVisibleSlides = useCallback(() => {
    setPptxSelectedSlideIds((previous) => {
      if (slides.length === 0) return previous
      const next = new Set(previous)
      for (const slide of slides) {
        next.add(slide.id)
      }
      return Array.from(next)
    })
  }, [slides])

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
        case 'slides-download-html':
          run = () => { void handleExportHtml() }
          break
        case 'slides-download-pptx':
          run = () => { void handleExportCurrentAsPptx() }
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
      downloadHtmlExport: async () => {
        if (!result) return 'No parsed slide is available. Parse HTML first, then download export.'
        await handleExportHtml()
        return activeSlideId
          ? 'Downloaded HTML export and recorded the export audit event.'
          : 'Downloaded HTML export.'
      },
      downloadPptxExport: async () => {
        if (!result) return 'No parsed slide is available. Parse HTML first, then export PPTX.'
        await handleExportCurrentAsPptx()
        return activeSlideId
          ? 'Downloaded PPTX export and recorded the export audit event.'
          : 'Downloaded PPTX export.'
      },
      openWorkspaceTab: handleWorkspaceTabChange,
    })

    return buildModuleOliverConfig('slides', {
      greeting: "Hi, I'm Oliver. Import HTML slides, validate parser output, then save to My Slides with autosave, export controls, and activity presets.",
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
  }, [activeSlideId, generateExport, handleExportCurrentAsPptx, handleExportHtml, handleSave, handleWorkspaceTabChange, openFilePicker, parseHtmlSync, rawHtml, result, runParseWithProgress, saveStatus])

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
        <ModuleSidebarHeader title="Slide Editor" onBackClick={handleBackToHubClick} />

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
        <ModuleTopbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
        />

        <main className="page slides-page" id="main-content">
          <section className="slides-card">
            <div className="slides-heading-row">
              <div>
                <h1 className="slides-title">HTML to Editable Components</h1>
                <p className="slides-subtitle">
                  Import slide HTML, parse into editable layers, and finish on a 16:9 canvas with autosave and export controls.
                </p>
              </div>
              <p className="slides-workspace-pill">{workspaceLabel}</p>
            </div>

            {recoveryDraft && (
              <div className="slides-recovery" role="status">
                <div>
                  Recovered draft available from {formatDateTime(recoveryDraft.createdAt)}.
                </div>
                <div className="slides-inline-actions">
                  <button type="button" className="btn btn-sm btn-primary btn--compact" onClick={restoreDraft}>Restore Draft</button>
                  <button type="button" className="btn btn-sm btn-ghost btn--compact" onClick={discardDraft}>Discard</button>
                </div>
              </div>
            )}

            {degradedState && (
              <div className="slides-degraded" role="status">
                <div>
                  <strong>Degraded Mode: Local Draft</strong>
                </div>
                <div>{degradedState.message}</div>
                <div className="slides-degraded-meta">
                  Endpoint: {degradedState.endpoint}
                  {degradedState.correlationId ? ` · Correlation ${degradedState.correlationId}` : ''}
                  {degradedState.rayId ? ` · Ray ${degradedState.rayId}` : ''}
                </div>
                <div className="slides-inline-actions">
                  <button type="button" className="btn btn-sm btn-primary btn--compact" onClick={() => void retrySlidesService()}>
                    Retry Slides Service
                  </button>
                  <button type="button" className="btn btn-sm btn-ghost btn--compact" onClick={clearDegradedMode}>
                    Dismiss
                  </button>
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
              <button type="button" className="btn btn-sm btn-ghost btn--compact" onClick={() => void refreshLibraryData()} disabled={libraryLoading}>
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
                <input
                  ref={fileInputRef}
                  id="slides-html-file"
                  type="file"
                  accept=".html,.htm,.css,text/html,text/css"
                  multiple
                  onChange={onFileChange}
                  hidden
                />

                <div className="slides-import-layout">
                  <section className="slides-import-panel">
                    <div className="slides-panel-heading">
                      <h2>Import HTML</h2>
                      <p>Upload HTML (plus optional companion CSS files) or paste markup, then parse into editable layers.</p>
                    </div>

                    <div className="slides-actions">
                      <button type="button" className="btn btn-primary btn--compact" onClick={openFilePicker} disabled={parseStatus === 'parsing'}>
                        Import HTML File
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn--compact"
                        onClick={() => void runParseWithProgress(rawHtml)}
                        disabled={parseStatus === 'parsing'}
                      >
                        Parse Pasted HTML
                      </button>
                      {parseStatus === 'parsing' && (
                        <button type="button" className="btn btn-danger btn--compact" onClick={cancelParse}>
                          Cancel Parse
                        </button>
                      )}
                    </div>

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
                        <button type="button" className="btn btn-sm btn-ghost btn--compact" onClick={() => setImportError(null)}>
                          Clear
                        </button>
                      </div>
                    )}
                  </section>

                  <section className="slides-import-panel slides-import-panel-save">
                    <div className="slides-panel-heading">
                      <h2>Save and Autosave</h2>
                      <p>Set title, track revisions, and handle retries or conflicts.</p>
                    </div>

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
                          className="btn btn-primary btn--compact"
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
                            <button type="button" className="btn btn-sm btn-primary btn--compact" onClick={() => void handleSave({ autosave: true })}>
                              Retry Autosave Now
                            </button>
                            <button type="button" className="btn btn-sm btn-ghost btn--compact" onClick={scheduleAutosaveRetryNow}>
                              Requeue Immediate Retry
                            </button>
                            <button type="button" className="btn btn-sm btn-ghost btn--compact" onClick={dismissAutosaveRetry}>
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
                            <button type="button" className="btn btn-sm btn-ghost btn--compact" onClick={handleConflictReload}>Reload Server Version</button>
                            <button type="button" className="btn btn-sm btn-primary btn--compact" onClick={() => void handleConflictOverwrite()}>Overwrite Server</button>
                            <button type="button" className="btn btn-sm btn-ghost btn--compact" onClick={() => void handleConflictSaveAsCopy()}>Save as Copy</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
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
                          className="btn btn-sm btn-ghost slides-toolbar-icon btn--compact"
                          onClick={() => handleUndo()}
                          disabled={historyPast.length === 0}
                          title="Undo"
                          aria-label="Undo"
                        >
                          ↶
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost slides-toolbar-icon btn--compact"
                          onClick={() => handleRedo()}
                          disabled={historyFuture.length === 0}
                          title="Redo"
                          aria-label="Redo"
                        >
                          ↷
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost slides-toolbar-icon btn--compact"
                          onClick={() => alignSelection('left')}
                          disabled={selectedComponentIds.length < 2}
                          title="Align Left"
                          aria-label="Align Left"
                        >
                          ≡▏
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost slides-toolbar-icon btn--compact"
                          onClick={() => alignSelection('center-x')}
                          disabled={selectedComponentIds.length < 2}
                          title="Align Center"
                          aria-label="Align Center"
                        >
                          ≡¦
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost slides-toolbar-icon btn--compact"
                          onClick={() => alignSelection('right')}
                          disabled={selectedComponentIds.length < 2}
                          title="Align Right"
                          aria-label="Align Right"
                        >
                          ▕≡
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost slides-toolbar-icon btn--compact"
                          onClick={() => alignSelection('top')}
                          disabled={selectedComponentIds.length < 2}
                          title="Align Top"
                          aria-label="Align Top"
                        >
                          ▔≡
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost slides-toolbar-icon btn--compact"
                          onClick={() => alignSelection('center-y')}
                          disabled={selectedComponentIds.length < 2}
                          title="Align Middle"
                          aria-label="Align Middle"
                        >
                          ═≡
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost slides-toolbar-icon btn--compact"
                          onClick={() => alignSelection('bottom')}
                          disabled={selectedComponentIds.length < 2}
                          title="Align Bottom"
                          aria-label="Align Bottom"
                        >
                          ≡▁
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost slides-toolbar-icon btn--compact"
                          onClick={() => distributeSelection('horizontal')}
                          title="Distribute Horizontally"
                          aria-label="Distribute Horizontally"
                        >
                          ⇆≡
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost slides-toolbar-icon btn--compact"
                          onClick={() => distributeSelection('vertical')}
                          title="Distribute Vertically"
                          aria-label="Distribute Vertically"
                        >
                          ⇅≡
                        </button>
                      </div>

                      <div className="slides-editor-toolbar-row slides-editor-toolbar-row--inputs">
                        <label className="slides-editor-field" htmlFor="slides-style-x">
                          <span>X</span>
                          <input
                            id="slides-style-x"
                            type="number"
                            step={1}
                            value={selectedBounds?.x ?? 0}
                            onChange={(event) => applyBoundsToSelection({ x: Number(event.target.value) })}
                            disabled={!selectedBounds}
                          />
                        </label>
                        <label className="slides-editor-field" htmlFor="slides-style-y">
                          <span>Y</span>
                          <input
                            id="slides-style-y"
                            type="number"
                            step={1}
                            value={selectedBounds?.y ?? 0}
                            onChange={(event) => applyBoundsToSelection({ y: Number(event.target.value) })}
                            disabled={!selectedBounds}
                          />
                        </label>
                        <label className="slides-editor-field" htmlFor="slides-style-width">
                          <span>Width</span>
                          <input
                            id="slides-style-width"
                            type="number"
                            min={MIN_COMPONENT_WIDTH}
                            step={1}
                            value={selectedBounds?.width ?? MIN_COMPONENT_WIDTH}
                            onChange={(event) => applyBoundsToSelection({ width: Number(event.target.value) })}
                            disabled={!selectedBounds}
                          />
                        </label>
                        <label className="slides-editor-field" htmlFor="slides-style-height">
                          <span>Height</span>
                          <input
                            id="slides-style-height"
                            type="number"
                            min={MIN_COMPONENT_HEIGHT}
                            step={1}
                            value={selectedBounds?.height ?? MIN_COMPONENT_HEIGHT}
                            onChange={(event) => applyBoundsToSelection({ height: Number(event.target.value) })}
                            disabled={!selectedBounds || selectedStyle?.textAutoSize === true}
                          />
                        </label>
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
                        <label className="slides-editor-field slides-editor-field--checkbox" htmlFor="slides-style-text-auto-size">
                          <span>Text Auto Size</span>
                          <input
                            id="slides-style-text-auto-size"
                            type="checkbox"
                            checked={autoSizeEnabledForSelection}
                            aria-label="Text Auto Size"
                            title={autoSizeMixedSelection ? 'Mixed selection: enabling will normalize selected text layers.' : ''}
                            onChange={(event) => applyStyleToSelection({ textAutoSize: event.target.checked })}
                            disabled={autoSizeEligibleSelection.length === 0}
                          />
                        </label>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost btn--compact"
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
                        <li>Alt+Arrow resizes selected layers by 1px. Use Alt+Shift+Arrow for 10px.</li>
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
                            {canvasSnapGuides.x !== null && (
                              <div
                                className="slides-canvas-guide slides-canvas-guide--vertical"
                                style={{ left: `${canvasSnapGuides.x}px` }}
                                data-snap-guide-axis="x"
                              />
                            )}
                            {canvasSnapGuides.y !== null && (
                              <div
                                className="slides-canvas-guide slides-canvas-guide--horizontal"
                                style={{ top: `${canvasSnapGuides.y}px` }}
                                data-snap-guide-axis="y"
                              />
                            )}
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
                                  data-component-auto-size={component.style.textAutoSize ? 'true' : 'false'}
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
                      <button type="button" className="btn btn-sm btn-ghost btn--compact" onClick={() => void copyParsedJson()}>
                        {jsonCopyState === 'copied' ? 'JSON Copied' : jsonCopyState === 'failed' ? 'Copy Failed' : 'Copy Parsed JSON'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost btn--compact"
                        onClick={() => downloadTextFile(JSON.stringify(result.components, null, 2), `${(slideTitle || 'slide').replace(/\s+/g, '-').toLowerCase()}.json`, 'application/json;charset=utf-8')}
                      >
                        Download JSON
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost btn--compact" onClick={() => generateExport()}>
                        Generate HTML Export
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost btn--compact" onClick={() => void handleExportHtml()}>
                        Download HTML
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost btn--compact" onClick={() => void handleExportPdf()}>
                        Export PDF (Print)
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost btn--compact" onClick={() => void handleExportCurrentAsPptx()} disabled={pptxExportBusy}>
                        {pptxExportBusy ? 'Exporting PPTX…' : 'Export PPTX (Current)'}
                      </button>
                    </div>

                    {pptxExportWarnings.length > 0 && (
                      <div className="slides-warning-group" role="status" aria-live="polite">
                        <h3>PPTX Export Warnings</h3>
                        <ul className="slides-warning-list">
                          {pptxExportWarnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

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
                      className="btn btn-sm btn-ghost btn--compact"
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
                <div className="slides-inline-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost btn--compact"
                    onClick={() => void handleExportSelectedSlidesAsPptx()}
                    disabled={pptxExportBusy || pptxSelectedSlideIds.length === 0}
                  >
                    {pptxExportBusy ? 'Exporting PPTX…' : `Export Selected PPTX (${pptxSelectedSlideIds.length})`}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost btn--compact"
                    onClick={selectAllVisibleSlides}
                    disabled={pptxExportBusy || slides.length === 0 || areAllVisibleSlidesSelected}
                  >
                    Select Visible ({slides.length})
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost btn--compact"
                    onClick={() => setPptxSelectedSlideIds([])}
                    disabled={pptxSelectedSlideIds.length === 0 || pptxExportBusy}
                  >
                    Clear Selection
                  </button>
                </div>
                <p className="slides-selection-hint">
                  Selected for export: {selectedVisibleSlideCount} visible / {pptxSelectedSlideIds.length} total.
                </p>
                {selectedHiddenSlideCount > 0 && (
                  <p className="slides-selection-hint" data-tone="warning">
                    {selectedHiddenSlideCount} selected slide{selectedHiddenSlideCount === 1 ? '' : 's'} {selectedHiddenSlideCount === 1 ? 'is' : 'are'} hidden by the current search filter.
                  </p>
                )}
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
                      <label className="slides-checkbox-row" htmlFor={`slides-pptx-select-${slide.id}`}>
                        <input
                          id={`slides-pptx-select-${slide.id}`}
                          type="checkbox"
                          checked={pptxSelectedSlideIds.includes(slide.id)}
                          onChange={() => togglePptxSlideSelection(slide.id)}
                        />
                        Include in PPTX export
                      </label>
                      <h3>{slide.title}</h3>
                      <p>Updated: {formatDateTime(slide.updated_at)} · Revision: {slide.revision}</p>
                      <p>Components: {slide.components.length}</p>
                    </div>
                    <div className="slides-inline-actions">
                      <button type="button" className="btn btn-sm btn-primary btn--compact" onClick={() => loadSlide(slide)}>Load</button>
                      <button type="button" className="btn btn-sm btn-ghost btn--compact" onClick={() => void handleDuplicateSlide(slide.id)}>Duplicate</button>
                      <button type="button" className="btn btn-sm btn-ghost btn--compact" onClick={() => void handleRenameSlide(slide)}>Rename</button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost btn--compact"
                        onClick={() => openPublishTemplateDraft(slide)}
                      >
                        Publish Template
                      </button>
                      <button type="button" className="btn btn-sm btn-danger btn--compact" onClick={() => void handleDeleteSlide(slide)}>Delete</button>
                    </div>
                    {templatePublishDraft?.slideId === slide.id && (
                      <div className="slides-template-draft">
                        <label className="slides-label" htmlFor="slides-template-name">Template Name</label>
                        <input
                          id="slides-template-name"
                          className="slides-input"
                          value={templatePublishDraft.name}
                          onChange={(event) =>
                            setTemplatePublishDraft((previous) =>
                              previous ? { ...previous, name: event.target.value } : previous,
                            )}
                          placeholder={`${slide.title} Template`}
                        />

                        <label className="slides-label" htmlFor="slides-template-description">Template Description</label>
                        <input
                          id="slides-template-description"
                          className="slides-input"
                          value={templatePublishDraft.description}
                          onChange={(event) =>
                            setTemplatePublishDraft((previous) =>
                              previous ? { ...previous, description: event.target.value } : previous,
                            )}
                          placeholder="Published from My Slides"
                        />

                        <label className="slides-label" htmlFor="slides-template-visibility">Visibility</label>
                        <select
                          id="slides-template-visibility"
                          className="slides-select"
                          value={templatePublishDraft.isShared ? 'shared' : 'private'}
                          onChange={(event) =>
                            setTemplatePublishDraft((previous) =>
                              previous
                                ? { ...previous, isShared: event.target.value === 'shared' && isSlidesAdmin }
                                : previous,
                            )}
                          disabled={!isSlidesAdmin}
                        >
                          <option value="private">Private (owner only)</option>
                          <option value="shared" disabled={!isSlidesAdmin}>Shared (team library)</option>
                        </select>
                        {!isSlidesAdmin && (
                          <p className="slides-card-note">
                            Shared template publishing is restricted to admins. Your template will remain private.
                          </p>
                        )}

                        <div className="slides-inline-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary btn--compact"
                            onClick={() => void handlePublishTemplate()}
                            disabled={templatePublishBusy}
                          >
                            {templatePublishBusy ? 'Publishing…' : 'Confirm Publish Template'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost btn--compact"
                            onClick={closePublishTemplateDraft}
                            disabled={templatePublishBusy}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}

            {workspaceTab === 'templates' && (
              <div className="slides-library-section">
                <h2>Template Library</h2>
                {trimmedSearchValue && rankedTemplates.length > 0 && (
                  <p className="slides-card-note slides-template-search-summary">
                    Showing {rankedTemplates.length} template match{rankedTemplates.length === 1 ? '' : 'es'} sorted by relevance.
                  </p>
                )}
                {showTemplateApprovalQueue && (
                  <div className="slides-template-draft">
                    <p className="slides-card-note">
                      {actor.role === 'admin' ? 'Pending Governance Approvals' : 'My Pending Approval Requests'}
                    </p>
                    {actor.role === 'admin' && (
                      <div className="slides-inline-actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost btn--compact"
                          onClick={() => void handleRunApprovalEscalationSweep()}
                          disabled={!!templateApprovalBusyId || templateApprovals.length === 0}
                        >
                          {templateApprovalBusyId === 'sweep' ? 'Running Sweep…' : 'Run SLA Escalation Sweep'}
                        </button>
                        <span className="slides-card-note">
                          Overdue approvals: {overdueTemplateApprovals}
                        </span>
                      </div>
                    )}
                    {templateApprovals.length === 0 && (
                      <p className="slides-card-note">
                        {actor.role === 'admin'
                          ? 'No pending template approval requests.'
                          : 'No pending requests submitted yet.'}
                      </p>
                    )}
                    {templateApprovals.map((approval) => {
                      const templateName = templateById.get(approval.template_id)?.name || approval.template_id
                      const busy = templateApprovalBusyId === approval.id
                      const sla = getApprovalSlaState(approval)
                      return (
                        <article key={approval.id} className="slides-library-card">
                          <div>
                            <h3>{formatTemplateApprovalType(approval.approval_type)}</h3>
                            <p>Template: {templateName}</p>
                            <p>Target: {formatTemplateApprovalTarget(approval)}</p>
                            <p>
                              Requested by: {approval.requested_by_email || approval.requested_by_user_id} · {formatDateTime(approval.created_at)}
                            </p>
                            <p>
                              SLA:{' '}
                              <span className={`slides-approval-sla slides-approval-sla-${sla.tone}`}>
                                {sla.label}
                              </span>{' '}
                              · Age: {sla.ageLabel}
                            </p>
                            {sla.escalationCount > 0 && (
                              <p className="slides-card-note">
                                Escalations: {sla.escalationCount}
                                {sla.lastEscalatedAt ? ` · Last escalation: ${formatDateTime(sla.lastEscalatedAt)}` : ''}
                              </p>
                            )}
                          </div>
                          <div className="slides-inline-actions">
                            {actor.role === 'admin' && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary btn--compact"
                                  onClick={() => void handleResolveTemplateApproval(approval, 'approve')}
                                  disabled={busy}
                                >
                                  {busy ? 'Saving…' : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger btn--compact"
                                  onClick={() => void handleResolveTemplateApproval(approval, 'reject')}
                                  disabled={busy}
                                >
                                  {busy ? 'Saving…' : 'Reject'}
                                </button>
                              </>
                            )}
                            {sla.canEscalate && (
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost btn--compact"
                                onClick={() => void handleEscalateTemplateApproval(approval)}
                                disabled={busy}
                              >
                                {busy ? 'Saving…' : sla.escalationCount > 0 ? 'Escalate Again' : 'Escalate'}
                              </button>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
                {rankedTemplates.length === 0 && (
                  <p className="slides-empty">
                    {trimmedSearchValue
                      ? `No templates match "${trimmedSearchValue}". Clear or update search to continue.`
                      : 'No templates available yet.'}
                  </p>
                )}
                {rankedTemplates.map((entry) => {
                  const template = entry.template
                  return (
                  <article key={template.id} className="slides-library-card">
                    <div>
                      <div className="slides-template-preview" aria-hidden="true">
                        <div
                          className="slides-template-preview-stage"
                          style={{
                            width: `${template.canvas.width}px`,
                            height: `${template.canvas.height}px`,
                            transform: `scale(${getTemplatePreviewScale(template.canvas, 220, 124)})`,
                          }}
                        >
                          {template.components
                            .filter((component) => component.visible !== false)
                            .slice(0, 10)
                            .map((component) => (
                              <div
                                key={`${template.id}:${component.id}`}
                                className="slides-template-preview-component"
                                data-preview-type={component.type}
                                style={buildCanvasComponentStyle(component)}
                              >
                                {component.type === 'logo' ? (
                                  <span className="slides-template-preview-asset">{component.sourceLabel || component.type}</span>
                                ) : (
                                  <div
                                    className="slides-template-preview-content"
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtmlContent(component.content || '') }}
                                  />
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                      <h3>{template.name}</h3>
                      <p>{template.description || 'No description'}</p>
                      <p>Owner: {template.owner_user_id || 'n/a'}</p>
                      <p>
                        Visibility: {template.is_shared ? 'Shared' : 'Private'} · Updated: {formatDateTime(template.updated_at)}
                      </p>
                      {entry.pendingApprovals > 0 && (
                        <p className="slides-card-note">
                          Pending approvals: {entry.pendingApprovals}
                        </p>
                      )}
                      {trimmedSearchValue && (
                        <p
                          className="slides-card-note slides-template-rank-note"
                          data-rank={entry.isBestMatch ? 'top' : 'match'}
                        >
                          {entry.isBestMatch ? 'Best match' : `Match score ${entry.searchScore}`}
                          {entry.matchSignals.length > 0 ? ` · ${entry.matchSignals.join(' · ')}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="slides-inline-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost btn--compact"
                        onClick={() => setTemplateQuickPreviewId(template.id)}
                      >
                        Quick Preview
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary btn--compact"
                        onClick={() => void handleDuplicateTemplate(template.id)}
                      >
                        Duplicate to My Slides
                      </button>
                      {(isSlidesAdmin || template.owner_user_id === actor.user_id) && (
                        <>
                          {(template.is_shared || isSlidesAdmin) && (
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost btn--compact"
                              onClick={() => void handleTemplateVisibilityToggle(template)}
                              disabled={templateActionBusyId === template.id}
                            >
                              {template.is_shared ? 'Make Private' : 'Make Shared'}
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost btn--compact"
                            onClick={() => openTransferTemplateDraft(template)}
                            disabled={templateActionBusyId === template.id}
                          >
                            Transfer Owner
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost btn--compact"
                            onClick={() => void toggleTemplateCollaboratorPanel(template)}
                            disabled={templateActionBusyId === template.id}
                          >
                            {templateCollaboratorPanelId === template.id ? 'Hide Collaborators' : 'Manage Collaborators'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger btn--compact"
                            onClick={() => void handleArchiveTemplate(template)}
                            disabled={templateActionBusyId === template.id}
                          >
                            Archive Template
                          </button>
                        </>
                      )}
                    </div>
                    {templateTransferDraft?.templateId === template.id && (
                      <div className="slides-template-draft">
                        <label className="slides-label" htmlFor={`slides-template-transfer-${template.id}`}>New Owner</label>
                        <input
                          id={`slides-template-transfer-${template.id}`}
                          className="slides-input"
                          value={templateTransferDraft.target}
                          onChange={(event) =>
                            setTemplateTransferDraft((previous) =>
                              previous && previous.templateId === template.id
                                ? { ...previous, target: event.target.value }
                                : previous,
                            )}
                          placeholder="user@example.com or user_id"
                        />
                        <div className="slides-inline-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary btn--compact"
                            onClick={() => void handleTransferTemplateOwnership(template)}
                            disabled={templateActionBusyId === template.id}
                          >
                            Confirm Transfer
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost btn--compact"
                            onClick={closeTransferTemplateDraft}
                            disabled={templateActionBusyId === template.id}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {templateCollaboratorPanelId === template.id && (
                      <div className="slides-template-draft">
                        <p className="slides-card-note">Collaborator Access</p>
                        {(templateCollaboratorsByTemplate[template.id] || []).length === 0 && (
                          <p className="slides-card-note">No collaborators yet.</p>
                        )}
                        {(templateCollaboratorsByTemplate[template.id] || []).map((collaborator) => (
                          <div key={`${collaborator.template_id}:${collaborator.user_id}`} className="slides-inline-actions">
                            <span className="slides-card-note">
                              {collaborator.user_email || collaborator.user_id} · {collaborator.role}
                            </span>
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost btn--compact"
                              onClick={() => void handleRemoveTemplateCollaborator(template, collaborator)}
                              disabled={templateActionBusyId === template.id}
                            >
                              Remove
                            </button>
                          </div>
                        ))}

                        <label className="slides-label" htmlFor={`slides-template-collaborator-${template.id}`}>Collaborator</label>
                        <input
                          id={`slides-template-collaborator-${template.id}`}
                          className="slides-input"
                          value={templateCollaboratorDraft?.templateId === template.id ? templateCollaboratorDraft.target : ''}
                          onChange={(event) =>
                            setTemplateCollaboratorDraft((previous) =>
                              previous && previous.templateId === template.id
                                ? { ...previous, target: event.target.value }
                                : {
                                    templateId: template.id,
                                    target: event.target.value,
                                    role: 'viewer',
                                  },
                            )}
                          placeholder="user@example.com or user_id"
                        />

                        <label className="slides-label" htmlFor={`slides-template-collaborator-role-${template.id}`}>Role</label>
                        <select
                          id={`slides-template-collaborator-role-${template.id}`}
                          className="slides-select"
                          value={templateCollaboratorDraft?.templateId === template.id ? templateCollaboratorDraft.role : 'viewer'}
                          onChange={(event) =>
                            setTemplateCollaboratorDraft((previous) =>
                              previous && previous.templateId === template.id
                                ? { ...previous, role: event.target.value as SlideTemplateCollaboratorRole }
                                : {
                                    templateId: template.id,
                                    target: '',
                                    role: event.target.value as SlideTemplateCollaboratorRole,
                                  },
                            )}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="editor">Editor</option>
                        </select>

                        <div className="slides-inline-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary btn--compact"
                            onClick={() => void handleUpsertTemplateCollaborator(template)}
                            disabled={templateActionBusyId === template.id}
                          >
                            Save Collaborator
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                  )
                })}
                {activeTemplateQuickPreview && (
                  <div
                    className="slides-template-preview-modal-backdrop"
                    onClick={(event) => {
                      if (event.target !== event.currentTarget) return
                      setTemplateQuickPreviewId(null)
                    }}
                    role="presentation"
                  >
                    <section
                      className="slides-template-preview-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-label={`Quick Preview: ${activeTemplateQuickPreview.template.name}`}
                    >
                      <div className="slides-template-preview-modal-header">
                        <h3>Quick Preview: {activeTemplateQuickPreview.template.name}</h3>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost btn--compact"
                          onClick={() => setTemplateQuickPreviewId(null)}
                        >
                          Close
                        </button>
                      </div>
                      <p className="slides-card-note">
                        {activeTemplateQuickPreview.template.description || 'No description'} · Components: {activeTemplateQuickPreview.template.components.length}
                      </p>
                      <p className="slides-card-note">
                        Visibility: {activeTemplateQuickPreview.template.is_shared ? 'Shared' : 'Private'} · Updated: {formatDateTime(activeTemplateQuickPreview.template.updated_at)}
                      </p>
                      {trimmedSearchValue && (
                        <p className="slides-card-note slides-template-rank-note" data-rank={activeTemplateQuickPreview.isBestMatch ? 'top' : 'match'}>
                          {activeTemplateQuickPreview.isBestMatch ? 'Best match' : `Match score ${activeTemplateQuickPreview.searchScore}`}
                          {activeTemplateQuickPreview.matchSignals.length > 0 ? ` · ${activeTemplateQuickPreview.matchSignals.join(' · ')}` : ''}
                        </p>
                      )}
                      <div className="slides-template-preview-modal-stage-shell">
                        <div
                          className="slides-template-preview-stage"
                          style={{
                            width: `${activeTemplateQuickPreview.template.canvas.width}px`,
                            height: `${activeTemplateQuickPreview.template.canvas.height}px`,
                            transform: `scale(${getTemplatePreviewScale(activeTemplateQuickPreview.template.canvas, 860, 500)})`,
                          }}
                        >
                          {activeTemplateQuickPreview.template.components
                            .filter((component) => component.visible !== false)
                            .slice(0, 28)
                            .map((component) => (
                              <div
                                key={`${activeTemplateQuickPreview.template.id}:${component.id}`}
                                className="slides-template-preview-component"
                                data-preview-type={component.type}
                                style={buildCanvasComponentStyle(component)}
                              >
                                {component.type === 'logo' ? (
                                  <span className="slides-template-preview-asset">{component.sourceLabel || component.type}</span>
                                ) : (
                                  <div
                                    className="slides-template-preview-content"
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtmlContent(component.content || '') }}
                                  />
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                      <div className="slides-inline-actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary btn--compact"
                          onClick={() => {
                            const templateId = activeTemplateQuickPreview.template.id
                            setTemplateQuickPreviewId(null)
                            void handleDuplicateTemplate(templateId)
                          }}
                        >
                          Duplicate to My Slides
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost btn--compact"
                          onClick={() => setTemplateQuickPreviewId(null)}
                        >
                          Close Preview
                        </button>
                      </div>
                    </section>
                  </div>
                )}
              </div>
            )}

            {workspaceTab === 'activity' && (
              <div className="slides-library-section">
                <h2>Slide Operations</h2>
                <div className="slides-audit-presets">
                  <div className="slides-audit-presets-row">
                    <label className="slides-editor-field" htmlFor="slides-audit-preset-select">
                      <span>Saved Presets</span>
                      <select
                        id="slides-audit-preset-select"
                        className="slides-select"
                        value={selectedAuditPresetId}
                        onChange={(event) => setSelectedAuditPresetId(event.target.value)}
                      >
                        <option value="">Select preset</option>
                        {auditPresets.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.scope === 'shared' ? '[Shared] ' : ''}{preset.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost btn--compact"
                      onClick={handleApplySelectedAuditPreset}
                      disabled={!selectedAuditPreset || auditPresetBusy}
                    >
                      Apply Preset
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost btn--compact"
                      onClick={() => setAuditPresetName(selectedAuditPreset?.name || '')}
                      disabled={!selectedAuditPreset || auditPresetBusy}
                    >
                      Use Name
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost btn--compact"
                      onClick={() => void handleDeleteSelectedAuditPreset()}
                      disabled={!selectedAuditPreset || auditPresetBusy}
                    >
                      Delete Preset
                    </button>
                  </div>
                  <div className="slides-audit-presets-row">
                    <label className="slides-editor-field" htmlFor="slides-audit-preset-name">
                      <span>Preset Name</span>
                      <input
                        id="slides-audit-preset-name"
                        className="slides-input"
                        value={auditPresetName}
                        onChange={(event) => setAuditPresetName(event.target.value)}
                        placeholder="Failure exports last 7 days"
                      />
                    </label>
                    <label className="slides-editor-field" htmlFor="slides-audit-preset-scope">
                      <span>Preset Scope</span>
                      <select
                        id="slides-audit-preset-scope"
                        className="slides-select"
                        value={auditPresetScope}
                        onChange={(event) => setAuditPresetScope(event.target.value as typeof auditPresetScope)}
                        disabled={!isSlidesAdmin}
                      >
                        <option value="personal">Personal</option>
                        {isSlidesAdmin && <option value="shared">Shared</option>}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary btn--compact"
                      onClick={() => void handleSaveAuditPreset()}
                      disabled={auditPresetBusy}
                    >
                      Save Preset
                    </button>
                  </div>
                </div>
                <div className="slides-audit-filters">
                  <label className="slides-editor-field" htmlFor="slides-audit-action">
                    <span>Action</span>
                    <select
                      id="slides-audit-action"
                      className="slides-select"
                      value={auditActionFilter}
                      onChange={(event) => setAuditActionFilter(event.target.value as typeof auditActionFilter)}
                    >
                      <option value="all">All actions</option>
                      <option value="save">Save</option>
                      <option value="autosave">Autosave</option>
                      <option value="rename">Rename</option>
                      <option value="duplicate">Duplicate</option>
                      <option value="delete">Delete</option>
                      <option value="publish-template">Publish Template</option>
                      <option value="transfer-template">Transfer Template</option>
                      <option value="upsert-collaborator">Upsert Collaborator</option>
                      <option value="remove-collaborator">Remove Collaborator</option>
                      <option value="submit-approval">Submit Approval</option>
                      <option value="escalate-approval">Escalate Approval</option>
                      <option value="approve-approval">Approve Approval</option>
                      <option value="reject-approval">Reject Approval</option>
                      <option value="export-html">Export HTML</option>
                      <option value="export-pdf">Export PDF</option>
                      <option value="export-pptx">Export PPTX</option>
                    </select>
                  </label>
                  <label className="slides-editor-field" htmlFor="slides-audit-outcome">
                    <span>Outcome</span>
                    <select
                      id="slides-audit-outcome"
                      className="slides-select"
                      value={auditOutcomeFilter}
                      onChange={(event) => setAuditOutcomeFilter(event.target.value as typeof auditOutcomeFilter)}
                    >
                      <option value="all">All outcomes</option>
                      <option value="success">Success</option>
                      <option value="failure">Failure</option>
                    </select>
                  </label>
                  <label className="slides-editor-field" htmlFor="slides-audit-entity">
                    <span>Entity</span>
                    <select
                      id="slides-audit-entity"
                      className="slides-select"
                      value={auditEntityTypeFilter}
                      onChange={(event) => setAuditEntityTypeFilter(event.target.value as typeof auditEntityTypeFilter)}
                    >
                      <option value="all">All entities</option>
                      <option value="slide">Slide</option>
                      <option value="template">Template</option>
                    </select>
                  </label>
                  <label className="slides-editor-field" htmlFor="slides-audit-date-from">
                    <span>Date from</span>
                    <input
                      id="slides-audit-date-from"
                      type="date"
                      className="slides-input"
                      value={auditDateFrom}
                      onChange={(event) => setAuditDateFrom(event.target.value)}
                    />
                  </label>
                  <label className="slides-editor-field" htmlFor="slides-audit-date-to">
                    <span>Date to</span>
                    <input
                      id="slides-audit-date-to"
                      type="date"
                      className="slides-input"
                      value={auditDateTo}
                      onChange={(event) => setAuditDateTo(event.target.value)}
                    />
                  </label>
                </div>

                <div className="slides-inline-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost btn--compact"
                    onClick={resetAuditFilters}
                    disabled={!hasActiveAuditFilters}
                  >
                    Reset Audit Filters
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost btn--compact"
                    onClick={handleExportAuditCsv}
                    disabled={audits.length === 0}
                  >
                    Export Current View CSV
                  </button>
                </div>

                <div className="slides-audit-export-jobs">
                  <div className="slides-audit-export-jobs-toolbar">
                    <label className="slides-editor-field" htmlFor="slides-audit-export-status">
                      <span>Export Job Status</span>
                      <select
                        id="slides-audit-export-status"
                        className="slides-select"
                        value={auditExportStatusFilter}
                        onChange={(event) => setAuditExportStatusFilter(event.target.value as typeof auditExportStatusFilter)}
                      >
                        <option value="all">All statuses</option>
                        <option value="queued">Queued</option>
                        <option value="running">Running</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary btn--compact"
                      onClick={() => void handleRequestAuditExportJob()}
                      disabled={auditExportRequestBusy}
                    >
                      {auditExportRequestBusy ? 'Queuing Export…' : 'Queue Filtered Export Job'}
                    </button>
                  </div>

                  {auditExportJobs.length === 0 && (
                    <p className="slides-empty">
                      No audit export jobs found for this status filter.
                    </p>
                  )}
                  {auditExportJobs.map((job) => (
                    <article key={job.id} className="slides-library-card slides-audit-export-job-card">
                      <div>
                        <h3>Audit Export Job</h3>
                        <p>
                          Status:{' '}
                          <span
                            className={`slides-audit-export-status slides-audit-export-status-${job.status}`}
                          >
                            {formatAuditExportStatus(job.status)}
                          </span>
                          {' · '}Rows: {job.row_count}
                        </p>
                        <p>Requested: {formatDateTime(job.requested_at)}</p>
                        <p>Filters: {formatAuditExportFilters(job.filters)}</p>
                        {job.file_name && <p>File: {job.file_name}</p>}
                        {job.error_message && <p>Error: {job.error_message}</p>}
                      </div>
                      <div className="slides-inline-actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost btn--compact"
                          onClick={() => void handleDownloadAuditExport(job)}
                          disabled={job.status !== 'completed' || auditExportDownloadBusyId === job.id}
                        >
                          {auditExportDownloadBusyId === job.id ? 'Downloading…' : 'Download CSV'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                {audits.length === 0 && (
                  <p className="slides-empty">
                    {trimmedSearchValue
                      ? `No activity events match "${trimmedSearchValue}". Clear or update search to continue.`
                      : hasActiveAuditFilters
                        ? 'No audit events match the selected filters.'
                      : 'No audit events found yet.'}
                  </p>
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

                <div className="slides-inline-actions slides-audit-pagination">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost btn--compact"
                    onClick={handleAuditPreviousPage}
                    disabled={auditOffset === 0 || libraryLoading}
                  >
                    Previous
                  </button>
                  <span className="slides-card-note">
                    Showing {audits.length === 0 ? 0 : auditOffset + 1}-
                    {auditOffset + audits.length}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost btn--compact"
                    onClick={handleAuditNextPage}
                    disabled={!auditHasMore || libraryLoading}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
