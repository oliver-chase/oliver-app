import { supabase } from '@/lib/supabase'
import type {
  AddCampaignMetricsInput,
  CampaignAsset,
  CampaignContentItem,
  CampaignContentMetrics,
  CampaignContentType,
  CampaignJobsAction,
  CampaignJobsRunResult,
  CampaignReportExportJob,
  CampaignReportGroupings,
  CampaignRecord,
  CampaignReminder,
  CampaignReportSummary,
  CampaignReportSummaryResponse,
  CampaignStatus,
  CreateCampaignAssetInput,
  CreateCampaignContentDraftInput,
  CreateCampaignInput,
  CreateCampaignReminderInput,
} from '@/types/campaigns'

type SupabaseLikeError = {
  message?: string
  code?: string
  hint?: string
  details?: string
}

export type CampaignApiActor = {
  user_id?: string
  user_email?: string
}

export type CampaignSyncState = 'ok' | 'syncing' | 'error'

function throwDbError(label: string, error: SupabaseLikeError | null) {
  if (!error) return
  const code = typeof error.code === 'string' && error.code ? error.code : ''
  const hint = typeof error.hint === 'string' && error.hint ? ` hint=${error.hint}` : ''
  const details = typeof error.details === 'string' && error.details ? ` details=${error.details}` : ''
  throw new Error(`${label}: ${code ? `[${code}] ` : ''}${error.message || 'unknown database error'}${hint}${details}`)
}

export function isCampaignsSchemaMissing(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase()
  return (
    (message.includes('campaign') && message.includes('does not exist'))
    || message.includes('could not find the function public.campaign_')
    || (message.includes('function public.campaign_') && message.includes('does not exist'))
  )
}

export function isCampaignsAccessDenied(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase()
  return (
    message.includes('42501')
    || message.includes('permission denied')
    || message.includes('row-level security')
    || message.includes('rls')
    || message.includes('not allowed')
    || message.includes('cmp_permission_denied')
  )
}

type CampaignActivityInput = {
  entity_type: string
  entity_id: string
  action_type: string
  performed_by: string | null
  metadata?: Record<string, unknown>
}

async function logCampaignActivity(input: CampaignActivityInput) {
  const payload = {
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    action_type: input.action_type,
    performed_by: input.performed_by,
    metadata: input.metadata || {},
  }
  const { error } = await supabase
    .from('campaign_activity_log')
    .insert(payload)
  throwDbError('logCampaignActivity', error)
}

function normalizeRpcResult<T>(label: string, data: T | T[] | null): T {
  if (Array.isArray(data)) {
    if (data.length === 0) throw new Error(`${label}: empty RPC response`)
    return data[0] as T
  }
  if (!data) throw new Error(`${label}: empty RPC response`)
  return data
}

async function runContentTransitionRpc(
  rpcName: string,
  params: Record<string, unknown>,
  label: string,
): Promise<CampaignContentItem> {
  const { data, error } = await supabase.rpc(rpcName, params)
  throwDbError(label, error)
  return normalizeRpcResult<CampaignContentItem>(label, (data ?? null) as CampaignContentItem | CampaignContentItem[] | null)
}

export async function listCampaigns(): Promise<CampaignRecord[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('updated_at', { ascending: false })
  throwDbError('listCampaigns', error)
  return (data ?? []) as CampaignRecord[]
}

export async function createCampaign(input: CreateCampaignInput & { created_by: string }): Promise<CampaignRecord> {
  const payload = {
    name: input.name.trim(),
    description: input.description?.trim() || '',
    offer_definition: input.offer_definition?.trim() || '',
    target_audience: input.target_audience?.trim() || '',
    primary_cta: input.primary_cta?.trim() || '',
    keywords: input.keywords || [],
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    cadence_rule: input.cadence_rule || null,
    status: (input.status || 'draft') as CampaignStatus,
    created_by: input.created_by,
  }
  const { data, error } = await supabase
    .from('campaigns')
    .insert(payload)
    .select('*')
    .single()
  throwDbError('createCampaign', error)

  const campaign = data as CampaignRecord
  await logCampaignActivity({
    entity_type: 'campaign',
    entity_id: campaign.id,
    action_type: 'campaign-created',
    performed_by: input.created_by,
    metadata: { status: campaign.status },
  })
  return campaign
}

export async function listCampaignContentItems(): Promise<CampaignContentItem[]> {
  const { data, error } = await supabase
    .from('campaign_content_items')
    .select('*')
    .order('updated_at', { ascending: false })
  throwDbError('listCampaignContentItems', error)
  return (data ?? []) as CampaignContentItem[]
}

export async function listCampaignAssets(contentIds?: string[]): Promise<CampaignAsset[]> {
  let query = supabase
    .from('campaign_assets')
    .select('*')
    .order('created_at', { ascending: false })

  if (contentIds && contentIds.length > 0) {
    query = query.in('content_id', contentIds)
  }

  const { data, error } = await query
  throwDbError('listCampaignAssets', error)
  return (data ?? []) as CampaignAsset[]
}

export async function createCampaignContentDraft(input: CreateCampaignContentDraftInput & { created_by: string }): Promise<CampaignContentItem> {
  const payload = {
    title: input.title.trim(),
    body: input.body.trim(),
    content_type: (input.content_type || 'other') as CampaignContentType,
    topic: input.topic.trim(),
    campaign_id: input.campaign_id || null,
    status: 'draft',
    intended_channel: input.intended_channel || null,
    attributed_author_id: input.attributed_author_id || null,
    created_by: input.created_by,
  }
  const { data, error } = await supabase
    .from('campaign_content_items')
    .insert(payload)
    .select('*')
    .single()
  throwDbError('createCampaignContentDraft', error)

  const contentItem = data as CampaignContentItem
  await logCampaignActivity({
    entity_type: 'campaign-content',
    entity_id: contentItem.id,
    action_type: 'content-draft-created',
    performed_by: input.created_by,
    metadata: { campaign_id: contentItem.campaign_id, content_type: contentItem.content_type },
  })
  return contentItem
}

export async function createCampaignAsset(input: CreateCampaignAssetInput & { created_by: string }): Promise<CampaignAsset> {
  if (!input.content_id && !input.campaign_id) {
    throw new Error('createCampaignAsset: content_id or campaign_id is required')
  }

  const payload = {
    content_id: input.content_id || null,
    campaign_id: input.campaign_id || null,
    asset_type: input.asset_type?.trim() || 'external-link',
    url: input.url?.trim() || null,
    file_reference: input.file_reference?.trim() || null,
    title: input.title?.trim() || '',
    created_by: input.created_by,
  }

  const { data, error } = await supabase
    .from('campaign_assets')
    .insert(payload)
    .select('*')
    .single()
  throwDbError('createCampaignAsset', error)

  const created = data as CampaignAsset
  await logCampaignActivity({
    entity_type: 'campaign-content',
    entity_id: input.content_id || input.campaign_id || created.id,
    action_type: 'content-asset-added',
    performed_by: input.created_by,
    metadata: {
      asset_id: created.id,
      asset_type: created.asset_type,
      url: created.url,
      file_reference: created.file_reference,
    },
  })

  return created
}

export async function removeCampaignAsset(assetId: string, actorUserId: string): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from('campaign_assets')
    .select('id,content_id,campaign_id,url,file_reference')
    .eq('id', assetId)
    .maybeSingle()
  throwDbError('removeCampaignAsset(load)', existingError)

  const { error } = await supabase
    .from('campaign_assets')
    .delete()
    .eq('id', assetId)
  throwDbError('removeCampaignAsset(delete)', error)

  if (existing) {
    await logCampaignActivity({
      entity_type: 'campaign-content',
      entity_id: (existing.content_id || existing.campaign_id || assetId) as string,
      action_type: 'content-asset-removed',
      performed_by: actorUserId,
      metadata: {
        asset_id: assetId,
        url: existing.url,
        file_reference: existing.file_reference,
      },
    })
  }
}

export async function createCampaignReminder(input: CreateCampaignReminderInput): Promise<CampaignReminder> {
  const payload = {
    content_id: input.content_id,
    user_id: input.user_id,
    reminder_type: input.reminder_type,
    scheduled_for: input.scheduled_for,
    status: 'pending',
  }

  const { data, error } = await supabase
    .from('campaign_reminders')
    .insert(payload)
    .select('*')
    .single()

  if (error && error.code === '23505') {
    const { data: existing, error: existingError } = await supabase
      .from('campaign_reminders')
      .select('*')
      .eq('content_id', payload.content_id)
      .eq('user_id', payload.user_id)
      .eq('reminder_type', payload.reminder_type)
      .eq('scheduled_for', payload.scheduled_for)
      .neq('status', 'cancelled')
      .order('scheduled_for', { ascending: false })
      .limit(1)
      .maybeSingle()
    throwDbError('createCampaignReminder(existing)', existingError)
    if (existing) return existing as CampaignReminder
  }

  throwDbError('createCampaignReminder', error)
  return data as CampaignReminder
}

export async function addCampaignPerformanceMetrics(input: AddCampaignMetricsInput): Promise<CampaignContentMetrics> {
  const payload = {
    content_id: input.content_id,
    captured_by_user_id: input.captured_by_user_id,
    impressions: input.impressions ?? null,
    reactions: input.reactions ?? null,
    comments: input.comments ?? null,
    shares: input.shares ?? null,
    clicks: input.clicks ?? null,
    conversion_count: input.conversion_count ?? null,
    engagement_rate: input.engagement_rate ?? null,
    metadata: input.metadata || {},
  }

  const { data, error } = await supabase
    .from('campaign_content_metrics')
    .insert(payload)
    .select('*')
    .single()
  throwDbError('addCampaignPerformanceMetrics', error)

  const metrics = data as CampaignContentMetrics
  await logCampaignActivity({
    entity_type: 'campaign-content',
    entity_id: input.content_id,
    action_type: 'content-metrics-added',
    performed_by: input.captured_by_user_id,
    metadata: {
      metrics_id: metrics.id,
      impressions: metrics.impressions,
      reactions: metrics.reactions,
      comments: metrics.comments,
      shares: metrics.shares,
      clicks: metrics.clicks,
      conversion_count: metrics.conversion_count,
      engagement_rate: metrics.engagement_rate,
    },
  })

  return metrics
}

export async function submitCampaignContentForReview(contentId: string, actorUserId: string): Promise<CampaignContentItem> {
  return runContentTransitionRpc(
    'campaign_submit_for_review',
    { p_content_id: contentId, p_actor_user_id: actorUserId },
    'submitCampaignContentForReview',
  )
}

export async function approveCampaignContent(contentId: string, actorUserId: string): Promise<CampaignContentItem> {
  return runContentTransitionRpc(
    'campaign_approve_content',
    { p_content_id: contentId, p_actor_user_id: actorUserId },
    'approveCampaignContent',
  )
}

export async function rejectCampaignContent(contentId: string, actorUserId: string, reason: string): Promise<CampaignContentItem> {
  return runContentTransitionRpc(
    'campaign_reject_content',
    { p_content_id: contentId, p_actor_user_id: actorUserId, p_reason: reason.trim() },
    'rejectCampaignContent',
  )
}

export async function claimCampaignContent(
  contentId: string,
  actorUserId: string,
  args?: { intended_channel?: string | null; scheduled_for?: string | null; request_id?: string | null },
): Promise<CampaignContentItem> {
  return runContentTransitionRpc(
    'campaign_claim_content',
    {
      p_content_id: contentId,
      p_actor_user_id: actorUserId,
      p_channel: args?.intended_channel || null,
      p_scheduled_for: args?.scheduled_for || null,
      p_request_id: args?.request_id || null,
    },
    'claimCampaignContent',
  )
}

export async function unclaimCampaignContent(contentId: string, actorUserId: string, reason: string): Promise<CampaignContentItem> {
  return runContentTransitionRpc(
    'campaign_unclaim_content',
    { p_content_id: contentId, p_actor_user_id: actorUserId, p_reason: reason.trim() },
    'unclaimCampaignContent',
  )
}

export async function updateCampaignContentSchedule(
  contentId: string,
  actorUserId: string,
  scheduledFor: string,
): Promise<CampaignContentItem> {
  return runContentTransitionRpc(
    'campaign_update_schedule',
    { p_content_id: contentId, p_actor_user_id: actorUserId, p_scheduled_for: scheduledFor },
    'updateCampaignContentSchedule',
  )
}

export async function markCampaignContentPosted(
  contentId: string,
  actorUserId: string,
  postUrl?: string,
): Promise<CampaignContentItem> {
  return runContentTransitionRpc(
    'campaign_mark_posted',
    { p_content_id: contentId, p_actor_user_id: actorUserId, p_post_url: postUrl?.trim() || null },
    'markCampaignContentPosted',
  )
}

export async function updateCampaignContentPostUrl(
  contentId: string,
  actorUserId: string,
  postUrl: string,
): Promise<CampaignContentItem> {
  return runContentTransitionRpc(
    'campaign_update_post_url',
    { p_content_id: contentId, p_actor_user_id: actorUserId, p_post_url: postUrl.trim() },
    'updateCampaignContentPostUrl',
  )
}

async function requestCampaignApi<T>(input: {
  method?: 'GET' | 'POST' | 'PATCH'
  query?: Record<string, string>
  body?: Record<string, unknown>
}): Promise<T> {
  const method = input.method || 'GET'
  const params = new URLSearchParams()
  if (input.query) {
    for (const [key, value] of Object.entries(input.query)) {
      if (!value) continue
      params.set(key, value)
    }
  }
  const url = '/api/campaigns' + (params.toString() ? `?${params.toString()}` : '')

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(input.body || {}),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof payload?.error === 'string' && payload.error
      ? payload.error
      : `Campaign API request failed (${response.status})`
    throw new Error(message)
  }
  return payload as T
}

export async function getCampaignReportSummary(input: {
  actor: CampaignApiActor
  filters?: {
    startDate?: string
    endDate?: string
    campaignId?: string
    contentType?: string
  }
}): Promise<CampaignReportSummaryResponse> {
  const data = await requestCampaignApi<{ summary: CampaignReportSummary; groupings?: CampaignReportGroupings }>({
    method: 'POST',
    body: {
      action: 'get-report-summary',
      actor: input.actor,
      filters: input.filters || {},
    },
  })
  return {
    summary: data.summary,
    groupings: data.groupings || { by_campaign: [], by_topic: [], by_user: [] },
  }
}

export async function requestCampaignReportExport(input: {
  actor: CampaignApiActor
  format?: 'markdown' | 'html'
  filters?: {
    startDate?: string
    endDate?: string
    campaignId?: string
    contentType?: string
  }
}): Promise<CampaignReportExportJob> {
  const data = await requestCampaignApi<{ job: CampaignReportExportJob }>({
    method: 'POST',
    body: {
      action: 'request-report-export',
      actor: input.actor,
      format: input.format || 'markdown',
      filters: input.filters || {},
    },
  })
  return data.job
}

export async function listCampaignReportExports(input: {
  actor: CampaignApiActor
  limit?: number
}): Promise<CampaignReportExportJob[]> {
  const data = await requestCampaignApi<{ items: CampaignReportExportJob[] }>({
    method: 'GET',
    query: {
      resource: 'exports',
      user_id: input.actor.user_id || '',
      user_email: input.actor.user_email || '',
      limit: input.limit ? String(input.limit) : '',
    },
  })
  return data.items || []
}

export async function downloadCampaignReportExport(input: {
  actor: CampaignApiActor
  exportId: string
}): Promise<{ filename: string; content: string; format: string }> {
  const data = await requestCampaignApi<{ filename: string; content: string; format: string }>({
    method: 'POST',
    body: {
      action: 'download-report-export',
      actor: input.actor,
      export_id: input.exportId,
    },
  })
  return data
}

export async function runCampaignJobs(input: {
  actor: CampaignApiActor
  action: CampaignJobsAction
  dryRun?: boolean
  runDate?: string
}): Promise<CampaignJobsRunResult> {
  const response = await fetch('/api/campaign-jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: input.action,
      dryRun: !!input.dryRun,
      runDate: input.runDate || '',
      actor: input.actor,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof payload?.error === 'string' && payload.error
      ? payload.error
      : `Campaign jobs API request failed (${response.status})`
    throw new Error(message)
  }

  return payload as CampaignJobsRunResult
}
