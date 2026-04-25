import type { SlideComponent } from '@/components/slides/types'

export interface SlideCanvas {
  width: number
  height: number
}

export interface SlideRecord {
  id: string
  owner_user_id: string
  title: string
  canvas: SlideCanvas
  components: SlideComponent[]
  metadata: Record<string, unknown>
  revision: number
  source: 'import' | 'template' | 'manual'
  source_template_id?: string | null
  created_at: string
  updated_at: string
  last_edited_at: string
}

export interface SlideTemplateRecord {
  id: string
  owner_user_id: string | null
  name: string
  description: string
  is_shared: boolean
  canvas: SlideCanvas
  components: SlideComponent[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type SlideAuditAction =
  | 'save'
  | 'autosave'
  | 'delete'
  | 'duplicate'
  | 'rename'
  | 'publish-template'
  | 'transfer-template'
  | 'export-html'
  | 'export-pdf'

export type SlideAuditOutcome = 'success' | 'failure'

export interface SlideAuditEvent {
  id: number
  actor_user_id: string
  actor_email: string | null
  entity_type: 'slide' | 'template'
  entity_id: string
  action: SlideAuditAction
  outcome: SlideAuditOutcome
  error_class: string | null
  details: Record<string, unknown>
  created_at: string
}

export interface SlideActor {
  user_id: string
  user_email?: string
  role?: string
}

export interface SlideSaveInput {
  id?: string
  title: string
  canvas: SlideCanvas
  components: SlideComponent[]
  metadata?: Record<string, unknown>
  revision?: number
  autosave?: boolean
  overwrite?: boolean
}

export interface SlideSaveResponse {
  slide: SlideRecord
}
