import type {
  SlideActor,
  SlideAuditAction,
  SlideAuditEvent,
  SlideRecord,
  SlideSaveInput,
  SlideSaveResponse,
  SlideTemplateCollaborator,
  SlideTemplateCollaboratorRole,
  SlideTemplateRecord,
} from '@/components/slides/persistence-types'

const FORCE_LOCAL_MODE = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === '1'
const LOCAL_STORAGE_KEY = 'oliver-slides-store-v1'

interface LocalSlidesStore {
  slides: SlideRecord[]
  templates: SlideTemplateRecord[]
  collaborators: SlideTemplateCollaborator[]
  audits: SlideAuditEvent[]
  nextAuditId: number
}

interface PublishTemplateOptions {
  name?: string
  description?: string
  isShared?: boolean
}

interface UpdateTemplateOptions {
  name?: string
  description?: string
  isShared?: boolean
}

interface TransferTemplateOwnershipOptions {
  userId?: string
  userEmail?: string
}

interface UpsertTemplateCollaboratorOptions {
  userId?: string
  userEmail?: string
  role: SlideTemplateCollaboratorRole
}

export interface SlideAuditQueryOptions {
  limit?: number
  offset?: number
  search?: string
  action?: SlideAuditAction | 'all'
  outcome?: 'success' | 'failure' | 'all'
  entityType?: 'slide' | 'template' | 'all'
  dateFrom?: string
  dateTo?: string
}

export interface SlideAuditQueryResult {
  items: SlideAuditEvent[]
  pagination: {
    offset: number
    limit: number
    has_more: boolean
    next_offset: number
  }
}

class SlideApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'SlideApiError'
    this.status = status
  }
}

export class SlideConflictError extends Error {
  serverSlide: SlideRecord

  constructor(message: string, serverSlide: SlideRecord) {
    super(message)
    this.name = 'SlideConflictError'
    this.serverSlide = serverSlide
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function safeRandomId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
}

function normalizeActor(actor: SlideActor): SlideActor {
  return {
    user_id: actor.user_id || 'unknown-user',
    user_email: actor.user_email || '',
    role: actor.role || 'admin',
  }
}

function initialTemplates(actor: SlideActor): SlideTemplateRecord[] {
  const timestamp = nowIso()
  return [
    {
      id: 'template-hero-metric',
      owner_user_id: actor.user_id,
      name: 'Hero + Metric Row',
      description: 'Headline with supporting metrics.',
      is_shared: true,
      canvas: { width: 1920, height: 1080 },
      components: [
        {
          id: 't-hero-1',
          type: 'heading',
          sourceLabel: '.hero-title',
          x: 120,
          y: 120,
          width: 1200,
          content: 'Quarterly Growth Plan',
          style: { fontSize: 72, fontWeight: 700, color: '#0f172a' },
          locked: false,
          visible: true,
        },
        {
          id: 't-hero-2',
          type: 'text',
          sourceLabel: '.hero-subtitle',
          x: 120,
          y: 230,
          width: 900,
          content: 'Key priorities, timing, and owner accountability.',
          style: { fontSize: 32, color: '#334155' },
          locked: false,
          visible: true,
        },
      ],
      metadata: { category: 'default' },
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: 'template-kpi-grid',
      owner_user_id: actor.user_id,
      name: 'KPI Grid',
      description: 'Four KPI cards with heading and labels.',
      is_shared: true,
      canvas: { width: 1920, height: 1080 },
      components: [
        {
          id: 't-kpi-1',
          type: 'heading',
          sourceLabel: '.kpi-title',
          x: 120,
          y: 100,
          width: 600,
          content: 'Sales Performance',
          style: { fontSize: 58, fontWeight: 700, color: '#111827' },
          locked: false,
          visible: true,
        },
        {
          id: 't-kpi-2',
          type: 'card',
          sourceLabel: '.kpi-card-1',
          x: 120,
          y: 260,
          width: 380,
          height: 260,
          content: '<h3>Revenue</h3><p>$4.2M</p>',
          style: { backgroundColor: '#f8fafc' },
          locked: false,
          visible: true,
        },
      ],
      metadata: { category: 'default' },
      created_at: timestamp,
      updated_at: timestamp,
    },
  ]
}

function readLocalStore(actor: SlideActor): LocalSlidesStore {
  if (typeof window === 'undefined') {
    return {
      slides: [],
      templates: initialTemplates(actor),
      collaborators: [],
      audits: [],
      nextAuditId: 1,
    }
  }

  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
  if (!raw) {
    const store: LocalSlidesStore = {
      slides: [],
      templates: initialTemplates(actor),
      collaborators: [],
      audits: [],
      nextAuditId: 1,
    }
    writeLocalStore(store)
    return store
  }

  try {
    const parsed = JSON.parse(raw) as LocalSlidesStore
    if (!Array.isArray(parsed.templates) || parsed.templates.length === 0) {
      parsed.templates = initialTemplates(actor)
    }
    if (!Array.isArray(parsed.slides)) parsed.slides = []
    if (!Array.isArray(parsed.collaborators)) parsed.collaborators = []
    if (!Array.isArray(parsed.audits)) parsed.audits = []
    if (!Number.isFinite(parsed.nextAuditId) || parsed.nextAuditId < 1) parsed.nextAuditId = 1
    return parsed
  } catch {
    const store: LocalSlidesStore = {
      slides: [],
      templates: initialTemplates(actor),
      collaborators: [],
      audits: [],
      nextAuditId: 1,
    }
    writeLocalStore(store)
    return store
  }
}

function writeLocalStore(store: LocalSlidesStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store))
}

function makeAuditEvent(
  store: LocalSlidesStore,
  actor: SlideActor,
  action: SlideAuditAction,
  outcome: 'success' | 'failure',
  entityType: 'slide' | 'template',
  entityId: string,
  details: Record<string, unknown> = {},
  errorClass: string | null = null,
): SlideAuditEvent {
  const event: SlideAuditEvent = {
    id: store.nextAuditId,
    actor_user_id: actor.user_id,
    actor_email: actor.user_email || null,
    entity_type: entityType,
    entity_id: entityId,
    action,
    outcome,
    error_class: errorClass,
    details,
    created_at: nowIso(),
  }
  store.nextAuditId += 1
  store.audits.unshift(event)
  if (store.audits.length > 300) store.audits = store.audits.slice(0, 300)
  return event
}

function applySearch<T extends { title?: string; name?: string }>(rows: T[], search: string): T[] {
  const query = search.trim().toLowerCase()
  if (!query) return rows
  return rows.filter((row) => {
    const text = (row.title || row.name || '').toLowerCase()
    return text.includes(query)
  })
}

function getLocalCollaboratorRole(
  store: LocalSlidesStore,
  templateId: string,
  actorUserId: string,
): SlideTemplateCollaboratorRole | null {
  const collaborator = store.collaborators.find((entry) => entry.template_id === templateId && entry.user_id === actorUserId)
  return collaborator?.role || null
}

function isLocalTemplateVisibleToActor(
  store: LocalSlidesStore,
  template: SlideTemplateRecord,
  actor: SlideActor,
): boolean {
  if (actor.role === 'admin') return true
  if (template.is_shared) return true
  if (template.owner_user_id === actor.user_id) return true
  return getLocalCollaboratorRole(store, template.id, actor.user_id) !== null
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })

  if (response.status === 409) {
    const payload = await response.json().catch(() => ({})) as { message?: string; server_slide?: SlideRecord }
    if (payload.server_slide) {
      throw new SlideConflictError(payload.message || 'Slide revision conflict', payload.server_slide)
    }
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new SlideApiError(`${init?.method || 'GET'} ${path} failed: ${response.status} ${text}`, response.status)
  }

  return response.json() as Promise<T>
}

function shouldFallbackToLocal(error: unknown): boolean {
  if (FORCE_LOCAL_MODE) return true
  if (error instanceof SlideConflictError) return false
  if (error instanceof SlideApiError) return [404, 405, 501, 503].includes(error.status)
  if (error instanceof TypeError) return true
  return false
}

async function withLocalFallback<T>(remoteCall: () => Promise<T>, localCall: () => Promise<T> | T): Promise<T> {
  if (FORCE_LOCAL_MODE) {
    return Promise.resolve(localCall())
  }

  try {
    return await remoteCall()
  } catch (error) {
    if (shouldFallbackToLocal(error)) {
      return Promise.resolve(localCall())
    }
    throw error
  }
}

function toSlideRecordFromTemplate(template: SlideTemplateRecord, actor: SlideActor, title?: string): SlideRecord {
  const stamp = nowIso()
  return {
    id: safeRandomId('slide'),
    owner_user_id: actor.user_id,
    title: title || `${template.name} (Copy)`,
    canvas: template.canvas,
    components: template.components,
    metadata: { ...template.metadata, sourceTemplateId: template.id },
    revision: 1,
    source: 'template',
    source_template_id: template.id,
    created_at: stamp,
    updated_at: stamp,
    last_edited_at: stamp,
  }
}

export async function listSlides(actorInput: SlideActor, search = ''): Promise<SlideRecord[]> {
  const actor = normalizeActor(actorInput)

  return withLocalFallback(
    async () => {
      const params = new URLSearchParams({
        resource: 'slides',
        search,
        user_id: actor.user_id,
      })
      if (actor.user_email) params.set('user_email', actor.user_email)
      const response = await requestJson<{ items: SlideRecord[] }>(`/api/slides?${params.toString()}`)
      return response.items || []
    },
    () => {
      const store = readLocalStore(actor)
      const rows = actor.role === 'admin'
        ? store.slides
        : store.slides.filter((slide) => slide.owner_user_id === actor.user_id)
      return applySearch(rows, search).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    },
  )
}

export async function listTemplates(actorInput: SlideActor, search = ''): Promise<SlideTemplateRecord[]> {
  const actor = normalizeActor(actorInput)

  return withLocalFallback(
    async () => {
      const params = new URLSearchParams({
        resource: 'templates',
        search,
        user_id: actor.user_id,
      })
      if (actor.user_email) params.set('user_email', actor.user_email)
      const response = await requestJson<{ items: SlideTemplateRecord[] }>(`/api/slides?${params.toString()}`)
      return response.items || []
    },
    () => {
      const store = readLocalStore(actor)
      const rows = store.templates.filter((template) => isLocalTemplateVisibleToActor(store, template, actor))
      return applySearch(rows, search).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    },
  )
}

export async function listSlideAudits(
  actorInput: SlideActor,
  optionsInput: SlideAuditQueryOptions = {},
): Promise<SlideAuditQueryResult> {
  const actor = normalizeActor(actorInput)
  const limitRaw = Number.isFinite(optionsInput.limit) ? Number(optionsInput.limit) : 30
  const offsetRaw = Number.isFinite(optionsInput.offset) ? Number(optionsInput.offset) : 0
  const limit = Math.max(1, Math.min(200, limitRaw))
  const offset = Math.max(0, offsetRaw)
  const search = optionsInput.search || ''

  return withLocalFallback(
    async () => {
      const params = new URLSearchParams({
        resource: 'audits',
        limit: String(limit),
        offset: String(offset),
        search,
        user_id: actor.user_id,
      })
      if (actor.user_email) params.set('user_email', actor.user_email)
      if (optionsInput.action && optionsInput.action !== 'all') params.set('action', optionsInput.action)
      if (optionsInput.outcome && optionsInput.outcome !== 'all') params.set('outcome', optionsInput.outcome)
      if (optionsInput.entityType && optionsInput.entityType !== 'all') params.set('entity_type', optionsInput.entityType)
      if (optionsInput.dateFrom) params.set('date_from', optionsInput.dateFrom)
      if (optionsInput.dateTo) params.set('date_to', optionsInput.dateTo)

      const response = await requestJson<SlideAuditQueryResult>(`/api/slides?${params.toString()}`)
      return {
        items: response.items || [],
        pagination: response.pagination || {
          offset,
          limit,
          has_more: false,
          next_offset: offset,
        },
      }
    },
    () => {
      const store = readLocalStore(actor)
      const filtered = store.audits
        .filter((event) => (actor.role === 'admin' ? true : event.actor_user_id === actor.user_id))
        .filter((event) => {
          if (optionsInput.action && optionsInput.action !== 'all' && event.action !== optionsInput.action) return false
          if (optionsInput.outcome && optionsInput.outcome !== 'all' && event.outcome !== optionsInput.outcome) return false
          if (optionsInput.entityType && optionsInput.entityType !== 'all' && event.entity_type !== optionsInput.entityType) return false
          if (optionsInput.dateFrom && event.created_at < `${optionsInput.dateFrom}T00:00:00.000Z`) return false
          if (optionsInput.dateTo && event.created_at > `${optionsInput.dateTo}T23:59:59.999Z`) return false
          if (!search.trim()) return true
          const query = search.trim().toLowerCase()
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

      const pageRows = filtered.slice(offset, offset + limit + 1)
      const hasMore = pageRows.length > limit
      const items = hasMore ? pageRows.slice(0, limit) : pageRows
      return {
        items,
        pagination: {
          offset,
          limit,
          has_more: hasMore,
          next_offset: offset + items.length,
        },
      }
    },
  )
}

export async function saveSlide(actorInput: SlideActor, input: SlideSaveInput): Promise<SlideSaveResponse> {
  const actor = normalizeActor(actorInput)

  return withLocalFallback(
    async () => requestJson<SlideSaveResponse>('/api/slides', {
      method: 'POST',
      body: JSON.stringify({ action: 'save', actor, slide: input }),
    }),
    () => {
      const store = readLocalStore(actor)
      const timestamp = nowIso()
      const normalizedMetadata = input.metadata || {}

      if (input.id) {
        const index = store.slides.findIndex((slide) => slide.id === input.id)
        if (index < 0) {
          throw new SlideApiError('Slide not found for update', 404)
        }

        const existing = store.slides[index]
        const expectedRevision = Number.isFinite(input.revision) ? input.revision as number : existing.revision

        if (!input.overwrite && expectedRevision !== existing.revision) {
          throw new SlideConflictError('Slide revision conflict', existing)
        }

        const next: SlideRecord = {
          ...existing,
          title: input.title,
          canvas: input.canvas,
          components: input.components,
          metadata: normalizedMetadata,
          revision: existing.revision + 1,
          updated_at: timestamp,
          last_edited_at: timestamp,
        }

        store.slides[index] = next
        makeAuditEvent(
          store,
          actor,
          input.autosave ? 'autosave' : 'save',
          'success',
          'slide',
          next.id,
          { revision: next.revision },
        )
        writeLocalStore(store)
        return { slide: next }
      }

      const created: SlideRecord = {
        id: safeRandomId('slide'),
        owner_user_id: actor.user_id,
        title: input.title,
        canvas: input.canvas,
        components: input.components,
        metadata: normalizedMetadata,
        revision: 1,
        source: 'import',
        source_template_id: null,
        created_at: timestamp,
        updated_at: timestamp,
        last_edited_at: timestamp,
      }

      store.slides.unshift(created)
      makeAuditEvent(
        store,
        actor,
        input.autosave ? 'autosave' : 'save',
        'success',
        'slide',
        created.id,
        { revision: created.revision },
      )
      writeLocalStore(store)
      return { slide: created }
    },
  )
}

export async function duplicateSlide(actorInput: SlideActor, slideId: string): Promise<SlideRecord> {
  const actor = normalizeActor(actorInput)

  return withLocalFallback(
    async () => {
      const response = await requestJson<{ slide: SlideRecord }>('/api/slides', {
        method: 'POST',
        body: JSON.stringify({ action: 'duplicate-slide', actor, slide_id: slideId }),
      })
      return response.slide
    },
    () => {
      const store = readLocalStore(actor)
      const source = store.slides.find((slide) => slide.id === slideId)
      if (!source) throw new SlideApiError('Slide not found for duplicate', 404)
      const stamp = nowIso()
      const copy: SlideRecord = {
        ...source,
        id: safeRandomId('slide'),
        title: `${source.title} (Copy)`,
        revision: 1,
        created_at: stamp,
        updated_at: stamp,
        last_edited_at: stamp,
      }
      store.slides.unshift(copy)
      makeAuditEvent(store, actor, 'duplicate', 'success', 'slide', copy.id, { source_id: source.id })
      writeLocalStore(store)
      return copy
    },
  )
}

export async function duplicateTemplateAsSlide(actorInput: SlideActor, templateId: string): Promise<SlideRecord> {
  const actor = normalizeActor(actorInput)

  return withLocalFallback(
    async () => {
      const response = await requestJson<{ slide: SlideRecord }>('/api/slides', {
        method: 'POST',
        body: JSON.stringify({ action: 'duplicate-template', actor, template_id: templateId }),
      })
      return response.slide
    },
    () => {
      const store = readLocalStore(actor)
      const template = store.templates.find((row) => row.id === templateId)
      if (!template) throw new SlideApiError('Template not found for duplicate', 404)
      if (!isLocalTemplateVisibleToActor(store, template, actor)) {
        throw new SlideApiError('Forbidden. Template is not visible to this user.', 403)
      }
      const slide = toSlideRecordFromTemplate(template, actor)
      store.slides.unshift(slide)
      makeAuditEvent(store, actor, 'duplicate', 'success', 'template', template.id, { slide_id: slide.id })
      writeLocalStore(store)
      return slide
    },
  )
}

export async function renameSlide(actorInput: SlideActor, slideId: string, title: string): Promise<SlideRecord> {
  const actor = normalizeActor(actorInput)

  return withLocalFallback(
    async () => {
      const response = await requestJson<{ slide: SlideRecord }>('/api/slides', {
        method: 'POST',
        body: JSON.stringify({ action: 'rename-slide', actor, slide_id: slideId, title }),
      })
      return response.slide
    },
    () => {
      const store = readLocalStore(actor)
      const index = store.slides.findIndex((slide) => slide.id === slideId)
      if (index < 0) throw new SlideApiError('Slide not found for rename', 404)
      const existing = store.slides[index]
      const updated: SlideRecord = {
        ...existing,
        title,
        revision: existing.revision + 1,
        updated_at: nowIso(),
        last_edited_at: nowIso(),
      }
      store.slides[index] = updated
      makeAuditEvent(store, actor, 'rename', 'success', 'slide', slideId, { title })
      writeLocalStore(store)
      return updated
    },
  )
}

export async function deleteSlide(actorInput: SlideActor, slideId: string): Promise<void> {
  const actor = normalizeActor(actorInput)

  return withLocalFallback(
    async () => {
      await requestJson<{ ok: true }>('/api/slides', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete-slide', actor, slide_id: slideId }),
      })
    },
    () => {
      const store = readLocalStore(actor)
      const nextSlides = store.slides.filter((slide) => slide.id !== slideId)
      if (nextSlides.length === store.slides.length) throw new SlideApiError('Slide not found for delete', 404)
      store.slides = nextSlides
      makeAuditEvent(store, actor, 'delete', 'success', 'slide', slideId)
      writeLocalStore(store)
    },
  )
}

export async function publishTemplateFromSlide(
  actorInput: SlideActor,
  slideId: string,
  optionsOrName?: string | PublishTemplateOptions,
): Promise<SlideTemplateRecord> {
  const actor = normalizeActor(actorInput)
  const options: PublishTemplateOptions =
    typeof optionsOrName === 'string' ? { name: optionsOrName } : (optionsOrName || {})
  const templateName = options.name?.trim()
  const templateDescription = options.description?.trim() || 'Published from My Slides'
  const isShared = options.isShared === true

  return withLocalFallback(
    async () => {
      const response = await requestJson<{ template: SlideTemplateRecord }>('/api/slides', {
        method: 'POST',
        body: JSON.stringify({
          action: 'publish-template',
          actor,
          slide_id: slideId,
          name: templateName || undefined,
          description: templateDescription,
          is_shared: isShared,
        }),
      })
      return response.template
    },
    () => {
      const store = readLocalStore(actor)
      const slide = store.slides.find((entry) => entry.id === slideId)
      if (!slide) throw new SlideApiError('Slide not found for template publish', 404)
      if (isShared && actor.role !== 'admin') {
        throw new SlideApiError('Forbidden. Only admins can publish shared templates.', 403)
      }
      const stamp = nowIso()
      const template: SlideTemplateRecord = {
        id: safeRandomId('template'),
        owner_user_id: actor.user_id,
        name: templateName || `${slide.title} Template`,
        description: templateDescription,
        is_shared: isShared,
        canvas: slide.canvas,
        components: slide.components,
        metadata: { source_slide_id: slide.id },
        created_at: stamp,
        updated_at: stamp,
      }
      store.templates.unshift(template)
      makeAuditEvent(store, actor, 'publish-template', 'success', 'template', template.id, { source_slide_id: slide.id })
      writeLocalStore(store)
      return template
    },
  )
}

export async function updateTemplate(
  actorInput: SlideActor,
  templateId: string,
  options: UpdateTemplateOptions,
): Promise<SlideTemplateRecord> {
  const actor = normalizeActor(actorInput)
  const name = options.name?.trim()
  const description = options.description?.trim()
  const isShared = typeof options.isShared === 'boolean' ? options.isShared : undefined

  return withLocalFallback(
    async () => {
      const response = await requestJson<{ template: SlideTemplateRecord }>('/api/slides', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update-template',
          actor,
          template_id: templateId,
          name,
          description,
          is_shared: isShared,
        }),
      })
      return response.template
    },
    () => {
      const store = readLocalStore(actor)
      const index = store.templates.findIndex((template) => template.id === templateId)
      if (index < 0) throw new SlideApiError('Template not found for update', 404)
      const existing = store.templates[index]
      const isOwner = existing.owner_user_id === actor.user_id
      const isAdmin = actor.role === 'admin'
      const collaboratorRole = isOwner || isAdmin ? null : getLocalCollaboratorRole(store, templateId, actor.user_id)
      const canEditContent = isOwner || isAdmin || collaboratorRole === 'editor'
      if (!canEditContent) {
        throw new SlideApiError('Forbidden. You do not own this template.', 403)
      }
      if (typeof isShared === 'boolean' && !isOwner && !isAdmin) {
        throw new SlideApiError('Forbidden. Only owners/admins can change template visibility.', 403)
      }
      if (isShared === true && !isAdmin) {
        throw new SlideApiError('Forbidden. Only admins can set template visibility to shared.', 403)
      }

      const updated: SlideTemplateRecord = {
        ...existing,
        name: name || existing.name,
        description: description || existing.description,
        is_shared: isShared ?? existing.is_shared,
        updated_at: nowIso(),
      }

      store.templates[index] = updated
      makeAuditEvent(store, actor, 'rename', 'success', 'template', templateId, {
        operation: 'update-template',
        is_shared: updated.is_shared,
      })
      writeLocalStore(store)
      return updated
    },
  )
}

export async function archiveTemplate(actorInput: SlideActor, templateId: string): Promise<void> {
  const actor = normalizeActor(actorInput)

  return withLocalFallback(
    async () => {
      await requestJson<{ ok: true }>('/api/slides', {
        method: 'POST',
        body: JSON.stringify({
          action: 'archive-template',
          actor,
          template_id: templateId,
        }),
      })
    },
    () => {
      const store = readLocalStore(actor)
      const existing = store.templates.find((template) => template.id === templateId)
      if (!existing) throw new SlideApiError('Template not found for archive', 404)
      const isOwner = existing.owner_user_id === actor.user_id
      const isAdmin = actor.role === 'admin'
      if (!isOwner && !isAdmin) {
        throw new SlideApiError('Forbidden. You do not own this template.', 403)
      }

      store.templates = store.templates.filter((template) => template.id !== templateId)
      store.collaborators = store.collaborators.filter((entry) => entry.template_id !== templateId)
      makeAuditEvent(store, actor, 'delete', 'success', 'template', templateId, { operation: 'archive-template' })
      writeLocalStore(store)
    },
  )
}

export async function transferTemplateOwnership(
  actorInput: SlideActor,
  templateId: string,
  options: TransferTemplateOwnershipOptions,
): Promise<SlideTemplateRecord> {
  const actor = normalizeActor(actorInput)
  const targetUserId = options.userId?.trim() || ''
  const targetUserEmail = options.userEmail?.trim().toLowerCase() || ''
  if (!targetUserId && !targetUserEmail) {
    throw new SlideApiError('Target owner email or user id is required.', 400)
  }

  return withLocalFallback(
    async () => {
      const response = await requestJson<{ template: SlideTemplateRecord }>('/api/slides', {
        method: 'POST',
        body: JSON.stringify({
          action: 'transfer-template-owner',
          actor,
          template_id: templateId,
          target_user_id: targetUserId || undefined,
          target_user_email: targetUserEmail || undefined,
        }),
      })
      return response.template
    },
    () => {
      const store = readLocalStore(actor)
      const index = store.templates.findIndex((template) => template.id === templateId)
      if (index < 0) throw new SlideApiError('Template not found for ownership transfer', 404)
      const existing = store.templates[index]
      const isOwner = existing.owner_user_id === actor.user_id
      const isAdmin = actor.role === 'admin'
      if (!isOwner && !isAdmin) {
        throw new SlideApiError('Forbidden. You do not own this template.', 403)
      }

      const nextOwner = targetUserId || targetUserEmail
      const updated: SlideTemplateRecord = {
        ...existing,
        owner_user_id: nextOwner,
        updated_at: nowIso(),
      }

      store.templates[index] = updated
      store.collaborators = store.collaborators.filter(
        (entry) => !(entry.template_id === templateId && entry.user_id === nextOwner),
      )
      makeAuditEvent(store, actor, 'transfer-template', 'success', 'template', templateId, {
        previous_owner_user_id: existing.owner_user_id,
        next_owner_user_id: updated.owner_user_id,
      })
      writeLocalStore(store)
      return updated
    },
  )
}

export async function listTemplateCollaborators(
  actorInput: SlideActor,
  templateId: string,
): Promise<SlideTemplateCollaborator[]> {
  const actor = normalizeActor(actorInput)

  return withLocalFallback(
    async () => {
      const params = new URLSearchParams({
        resource: 'template-collaborators',
        template_id: templateId,
        user_id: actor.user_id,
      })
      if (actor.user_email) params.set('user_email', actor.user_email)
      const response = await requestJson<{ items: SlideTemplateCollaborator[] }>(`/api/slides?${params.toString()}`)
      return response.items || []
    },
    () => {
      const store = readLocalStore(actor)
      const template = store.templates.find((entry) => entry.id === templateId)
      if (!template) throw new SlideApiError('Template not found for collaborator read', 404)
      if (!isLocalTemplateVisibleToActor(store, template, actor)) {
        throw new SlideApiError('Forbidden. Template is not visible to this user.', 403)
      }
      return store.collaborators
        .filter((entry) => entry.template_id === templateId)
        .sort((a, b) => a.user_id.localeCompare(b.user_id))
    },
  )
}

export async function upsertTemplateCollaborator(
  actorInput: SlideActor,
  templateId: string,
  options: UpsertTemplateCollaboratorOptions,
): Promise<SlideTemplateCollaborator> {
  const actor = normalizeActor(actorInput)
  const targetUserId = options.userId?.trim() || ''
  const targetUserEmail = options.userEmail?.trim().toLowerCase() || ''
  if (!targetUserId && !targetUserEmail) {
    throw new SlideApiError('Target collaborator email or user id is required.', 400)
  }

  return withLocalFallback(
    async () => {
      const response = await requestJson<{ collaborator: SlideTemplateCollaborator }>('/api/slides', {
        method: 'POST',
        body: JSON.stringify({
          action: 'upsert-template-collaborator',
          actor,
          template_id: templateId,
          target_user_id: targetUserId || undefined,
          target_user_email: targetUserEmail || undefined,
          role: options.role,
        }),
      })
      if (!response.collaborator) throw new SlideApiError('Collaborator upsert failed.', 500)
      return response.collaborator
    },
    () => {
      const store = readLocalStore(actor)
      const template = store.templates.find((entry) => entry.id === templateId)
      if (!template) throw new SlideApiError('Template not found for collaborator update', 404)
      const isOwner = template.owner_user_id === actor.user_id
      const isAdmin = actor.role === 'admin'
      if (!isOwner && !isAdmin) {
        throw new SlideApiError('Forbidden. Only owners/admins can manage collaborators.', 403)
      }
      const target = targetUserId || targetUserEmail
      if (target === template.owner_user_id) {
        throw new SlideApiError('Template owner already has full access; collaborator role is not needed.', 400)
      }
      const now = nowIso()
      const index = store.collaborators.findIndex((entry) => entry.template_id === templateId && entry.user_id === target)
      const next: SlideTemplateCollaborator = {
        template_id: templateId,
        user_id: target,
        user_email: target.includes('@') ? target : null,
        role: options.role,
        created_at: index >= 0 ? store.collaborators[index].created_at : now,
        updated_at: now,
      }
      if (index >= 0) store.collaborators[index] = next
      else store.collaborators.push(next)

      makeAuditEvent(store, actor, 'upsert-collaborator', 'success', 'template', templateId, {
        collaborator_user_id: next.user_id,
        collaborator_email: next.user_email,
        role: next.role,
      })
      writeLocalStore(store)
      return next
    },
  )
}

export async function removeTemplateCollaborator(
  actorInput: SlideActor,
  templateId: string,
  options: { userId?: string; userEmail?: string },
): Promise<void> {
  const actor = normalizeActor(actorInput)
  const targetUserId = options.userId?.trim() || ''
  const targetUserEmail = options.userEmail?.trim().toLowerCase() || ''
  if (!targetUserId && !targetUserEmail) {
    throw new SlideApiError('Target collaborator email or user id is required.', 400)
  }

  return withLocalFallback(
    async () => {
      await requestJson<{ ok: true }>('/api/slides', {
        method: 'POST',
        body: JSON.stringify({
          action: 'remove-template-collaborator',
          actor,
          template_id: templateId,
          target_user_id: targetUserId || undefined,
          target_user_email: targetUserEmail || undefined,
        }),
      })
    },
    () => {
      const store = readLocalStore(actor)
      const template = store.templates.find((entry) => entry.id === templateId)
      if (!template) throw new SlideApiError('Template not found for collaborator removal', 404)
      const isOwner = template.owner_user_id === actor.user_id
      const isAdmin = actor.role === 'admin'
      if (!isOwner && !isAdmin) {
        throw new SlideApiError('Forbidden. Only owners/admins can manage collaborators.', 403)
      }

      const target = targetUserId || targetUserEmail
      store.collaborators = store.collaborators.filter(
        (entry) => !(entry.template_id === templateId && entry.user_id === target),
      )
      makeAuditEvent(store, actor, 'remove-collaborator', 'success', 'template', templateId, {
        collaborator_user_id: target,
      })
      writeLocalStore(store)
    },
  )
}

export async function recordExportEvent(
  actorInput: SlideActor,
  params: {
    slideId: string
    format: 'html' | 'pdf'
    outcome: 'success' | 'failure'
    errorClass?: string
  },
): Promise<void> {
  const actor = normalizeActor(actorInput)

  return withLocalFallback(
    async () => {
      await requestJson<{ ok: true }>('/api/slides', {
        method: 'POST',
        body: JSON.stringify({
          action: 'record-export',
          actor,
          slide_id: params.slideId,
          format: params.format,
          outcome: params.outcome,
          error_class: params.errorClass || null,
        }),
      })
    },
    () => {
      const store = readLocalStore(actor)
      const action: SlideAuditAction = params.format === 'html' ? 'export-html' : 'export-pdf'
      makeAuditEvent(
        store,
        actor,
        action,
        params.outcome,
        'slide',
        params.slideId,
        { format: params.format },
        params.errorClass || null,
      )
      writeLocalStore(store)
    },
  )
}
