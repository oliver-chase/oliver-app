import type { SlideComponent } from '@/components/slides/types'

export interface SlideCanvas {
  width: number
  height: number
  background?: string
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
  is_archived?: boolean
  canvas: SlideCanvas
  components: SlideComponent[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type SlideTemplateCollaboratorRole = 'editor' | 'reviewer' | 'viewer'

export interface SlideTemplateCollaborator {
  template_id: string
  user_id: string
  user_email: string | null
  role: SlideTemplateCollaboratorRole
  created_at: string
  updated_at: string
}

export type SlideTemplateApprovalType = 'transfer-template' | 'upsert-collaborator' | 'remove-collaborator'

export type SlideTemplateApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface SlideTemplateApproval {
  id: string
  template_id: string
  requested_by_user_id: string
  requested_by_email: string | null
  approval_type: SlideTemplateApprovalType
  payload: Record<string, unknown>
  status: SlideTemplateApprovalStatus
  review_note: string | null
  reviewed_by_user_id: string | null
  reviewed_at: string | null
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
  | 'upsert-collaborator'
  | 'remove-collaborator'
  | 'submit-approval'
  | 'escalate-approval'
  | 'approve-approval'
  | 'reject-approval'
  | 'export-html'
  | 'export-pdf'
  | 'export-pptx'

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

export type SlideAuditPresetScope = 'personal' | 'shared'

export interface SlideAuditFilterPreset {
  id: string
  owner_user_id: string
  name: string
  scope: SlideAuditPresetScope
  search: string
  action: SlideAuditAction | 'all'
  outcome: SlideAuditOutcome | 'all'
  entity_type: SlideAuditEvent['entity_type'] | 'all'
  date_from: string
  date_to: string
  created_at: string
  updated_at: string
}

export type SlideAuditExportJobStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface SlideAuditExportJob {
  id: string
  requested_by_user_id: string
  requested_by_email: string | null
  status: SlideAuditExportJobStatus
  filters: {
    search: string
    action: SlideAuditAction | 'all'
    outcome: SlideAuditOutcome | 'all'
    entity_type: SlideAuditEvent['entity_type'] | 'all'
    date_from: string
    date_to: string
  }
  row_count: number
  file_name: string | null
  csv_content?: string | null
  error_message: string | null
  requested_at: string
  started_at: string | null
  completed_at: string | null
  updated_at: string
}

export type SlidePptxExportJobStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export interface SlidePptxExportWarning {
  code: string
  message: string
  slide_id: string
  component_id: string
  component_type: string
}

export interface SlidePptxExportObject {
  slide_id: string
  component_id: string
  component_type: string
  native_kind: 'text' | 'shape' | 'image'
  editable: boolean
}

export interface SlidePptxExportJob {
  id: string
  requested_by_user_id: string
  requested_by_email: string | null
  status: SlidePptxExportJobStatus
  slide_ids: string[]
  options: {
    filename_prefix: string
    include_hidden: boolean
  }
  attempts: number
  max_attempts: number
  warning_count: number
  warnings: SlidePptxExportWarning[]
  native_objects: SlidePptxExportObject[]
  artifact: {
    file_name: string
    expires_at: string
    download_token: string
  } | null
  requested_at: string
  started_at: string | null
  completed_at: string | null
  updated_at: string
  error_message: string | null
  idempotency_key: string | null
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
