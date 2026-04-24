import type {
  SlideActor,
  SlideAuditAction,
  SlideAuditEvent,
  SlideRecord,
  SlideSaveInput,
  SlideSaveResponse,
  SlideTemplateRecord,
} from '@/components/slides/persistence-types'

const FORCE_LOCAL_MODE = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === '1'
const LOCAL_STORAGE_KEY = 'oliver-slides-store-v1'

interface LocalSlidesStore {
  slides: SlideRecord[]
  templates: SlideTemplateRecord[]
  audits: SlideAuditEvent[]
  nextAuditId: number
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
      audits: [],
      nextAuditId: 1,
    }
  }

  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
  if (!raw) {
    const store: LocalSlidesStore = {
      slides: [],
      templates: initialTemplates(actor),
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
    if (!Array.isArray(parsed.audits)) parsed.audits = []
    if (!Number.isFinite(parsed.nextAuditId) || parsed.nextAuditId < 1) parsed.nextAuditId = 1
    return parsed
  } catch {
    const store: LocalSlidesStore = {
      slides: [],
      templates: initialTemplates(actor),
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
      const owned = store.slides.filter((slide) => slide.owner_user_id === actor.user_id)
      return applySearch(owned, search).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
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
      const rows = store.templates.filter((template) => template.is_shared || template.owner_user_id === actor.user_id)
      return applySearch(rows, search).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    },
  )
}

export async function listSlideAudits(actorInput: SlideActor, limit = 30): Promise<SlideAuditEvent[]> {
  const actor = normalizeActor(actorInput)

  return withLocalFallback(
    async () => {
      const params = new URLSearchParams({
        resource: 'audits',
        limit: String(limit),
        user_id: actor.user_id,
      })
      if (actor.user_email) params.set('user_email', actor.user_email)
      const response = await requestJson<{ items: SlideAuditEvent[] }>(`/api/slides?${params.toString()}`)
      return response.items || []
    },
    () => {
      const store = readLocalStore(actor)
      return store.audits.filter((event) => event.actor_user_id === actor.user_id).slice(0, limit)
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

export async function publishTemplateFromSlide(actorInput: SlideActor, slideId: string, name?: string): Promise<SlideTemplateRecord> {
  const actor = normalizeActor(actorInput)

  return withLocalFallback(
    async () => {
      const response = await requestJson<{ template: SlideTemplateRecord }>('/api/slides', {
        method: 'POST',
        body: JSON.stringify({ action: 'publish-template', actor, slide_id: slideId, name }),
      })
      return response.template
    },
    () => {
      const store = readLocalStore(actor)
      const slide = store.slides.find((entry) => entry.id === slideId)
      if (!slide) throw new SlideApiError('Slide not found for template publish', 404)
      const stamp = nowIso()
      const template: SlideTemplateRecord = {
        id: safeRandomId('template'),
        owner_user_id: actor.user_id,
        name: name || `${slide.title} Template`,
        description: 'Published from My Slides',
        is_shared: false,
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
