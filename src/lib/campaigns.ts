import { supabase } from '@/lib/supabase'
import type {
  AddCampaignMetricsInput,
  CampaignAdminOverrideInput,
  CampaignActivityLog,
  CampaignAsset,
  CampaignContentItem,
  CampaignContentMetrics,
  CampaignContentType,
  CampaignJobsAction,
  CampaignJobsRunResult,
  CampaignJourneyBranchOutcome,
  CampaignJourneyGraph,
  CampaignJourneyNode,
  CampaignJourneyNodeType,
  CampaignJourneyTimelineEntry,
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
  UpdateCampaignReminderInput,
  CampaignTransitionError,
  CampaignTransitionErrorCode,
  UpdateCampaignInput,
} from '@/types/campaigns'

type SupabaseLikeError = {
  message?: string
  code?: string
  hint?: string
  details?: string
}

const CAMPAIGN_TRANSITION_ERROR_CODES: CampaignTransitionErrorCode[] = [
  'CMP_PERMISSION_DENIED',
  'CMP_NOT_FOUND',
  'CMP_INVALID_STATE',
  'CMP_VALIDATION_FAILED',
  'CMP_CONFLICT',
]

export function parseCampaignTransitionError(error: unknown): CampaignTransitionError | null {
  const message = error instanceof Error ? error.message : String(error || '')
  const normalizedMessage = message.toLowerCase()
  const matchedCode = CAMPAIGN_TRANSITION_ERROR_CODES.find(code => normalizedMessage.includes(code.toLowerCase()))
  if (!matchedCode) return null

  const codeIndex = normalizedMessage.indexOf(matchedCode.toLowerCase())
  const reasonCandidate = codeIndex >= 0 ? normalizedMessage.slice(codeIndex + matchedCode.length) : ''
  const reason = reasonCandidate.replace(/^:\s*/i, '').trim() || 'Campaign transition was not completed.'

  return {
    code: matchedCode,
    reason: reason || 'Campaign transition was not completed.',
    rawMessage: normalizedMessage,
  }
}

function normalizeDbErrorMessage(error: SupabaseLikeError | null): string {
  return typeof error?.message === 'string' ? error.message.toLowerCase() : ''
}

function isMissingCampaignTableError(error: SupabaseLikeError | null, table: string): boolean {
  const message = normalizeDbErrorMessage(error)
  return (
    error?.code === 'PGRST205'
    && (
      message.includes(`public.${table}`.toLowerCase())
      || message.includes('schema cache')
      || message.includes('could not find the table')
    )
  )
}

function isCampaignAssetUnavailableError(error: SupabaseLikeError | null): boolean {
  return isMissingCampaignTableError(error, 'campaign_assets')
}

export async function isCampaignAssetsTableAvailable(): Promise<boolean> {
  const { error } = await supabase
    .from('campaign_assets')
    .select('id', { count: 'exact', head: true })
    .limit(1)

  if (!error) return true
  if (isCampaignAssetUnavailableError(error)) return false
  throwDbError('isCampaignAssetsTableAvailable', error)
  return false
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

function throwCampaignTransitionError(label: string, error: SupabaseLikeError | null) {
  if (!error) return
  const parsed = parseCampaignTransitionError(error)
  if (!parsed) {
    throwDbError(label, error)
    return
  }
  throw new Error(`${label}: ${parsed.code}: ${parsed.reason}`)
}

export function isCampaignsSchemaMissing(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase()
  return (
    message.includes('pgrst205')
    || (message.includes('could not find the table') && message.includes('public.campaign_'))
    || (message.includes('public.campaign_') && message.includes('schema cache'))
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
  if (error) {
    throwCampaignTransitionError(label, error)
  }
  return normalizeRpcResult<CampaignContentItem>(label, (data ?? null) as CampaignContentItem | CampaignContentItem[] | null)
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map(item => asString(item))
    .filter(Boolean)
}

function normalizeJourneyNodeType(value: unknown): CampaignJourneyNodeType | null {
  const raw = asString(value)
  if (raw === 'action' || raw === 'decision' || raw === 'condition') return raw
  return null
}

function normalizeJourneyBranchOutcome(value: unknown): CampaignJourneyBranchOutcome {
  const raw = asString(value)
  if (raw === 'positive' || raw === 'negative') return raw
  return 'n/a'
}

function normalizeJourneyNode(value: unknown): CampaignJourneyNode | null {
  const source = asRecord(value)
  const id = asString(source.id)
  const type = normalizeJourneyNodeType(source.type)
  const title = asString(source.title)
  if (!id || !type || !title) return null

  return {
    id,
    type,
    title,
    config: asRecord(source.config),
    next_node_ids: asStringArray(source.next_node_ids),
    branch_positive_node_id: asString(source.branch_positive_node_id) || null,
    branch_negative_node_id: asString(source.branch_negative_node_id) || null,
  }
}

function buildJourneyNodeLinks(node: CampaignJourneyNode): string[] {
  const links = [...node.next_node_ids]
  if (node.branch_positive_node_id) links.push(node.branch_positive_node_id)
  if (node.branch_negative_node_id) links.push(node.branch_negative_node_id)
  return [...new Set(links)]
}

function validateJourneyGraph(graph: CampaignJourneyGraph): { ok: true } {
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    throw new Error('Journey graph requires at least one node.')
  }

  const nodeById = new Map<string, CampaignJourneyNode>()
  for (const node of graph.nodes) {
    if (nodeById.has(node.id)) {
      throw new Error(`Journey graph has duplicate node id: ${node.id}`)
    }
    nodeById.set(node.id, node)
    if (node.type === 'action' && !asString(node.config.action_key)) {
      throw new Error(`Journey action node ${node.id} is missing required config.action_key`)
    }
    if (node.type === 'condition' && !asString(node.config.condition_key)) {
      throw new Error(`Journey condition node ${node.id} is missing required config.condition_key`)
    }
    if (node.type === 'decision' && (!asString(node.config.field) || !asString(node.config.operator))) {
      throw new Error(`Journey decision node ${node.id} is missing required config.field/config.operator`)
    }
  }

  for (const node of graph.nodes) {
    for (const linkedNodeId of buildJourneyNodeLinks(node)) {
      if (!nodeById.has(linkedNodeId)) {
        throw new Error(`Journey graph has dangling node reference from ${node.id} to ${linkedNodeId}`)
      }
    }
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (id: string) => {
    if (visiting.has(id)) {
      throw new Error('Journey graph has prohibited cycle references.')
    }
    if (visited.has(id)) return
    visiting.add(id)
    const node = nodeById.get(id)
    if (node) {
      for (const linkedNodeId of buildJourneyNodeLinks(node)) {
        visit(linkedNodeId)
      }
    }
    visiting.delete(id)
    visited.add(id)
  }

  for (const node of graph.nodes) {
    visit(node.id)
  }
  return { ok: true }
}

function parseCampaignJourneyGraph(campaign: CampaignRecord | null): CampaignJourneyGraph | null {
  if (!campaign?.cadence_rule || typeof campaign.cadence_rule !== 'object') return null
  const cadenceRule = campaign.cadence_rule as Record<string, unknown>
  const journey = asRecord(cadenceRule.journey_graph)
  const version = Number(journey.version)
  const publishedAt = asString(journey.published_at)
  const publishedBy = asString(journey.published_by)
  const nodes = Array.isArray(journey.nodes)
    ? journey.nodes.map(normalizeJourneyNode).filter((node): node is CampaignJourneyNode => !!node)
    : []

  if (!Number.isFinite(version) || version <= 0 || !publishedAt || !publishedBy || nodes.length === 0) return null

  return {
    version,
    published_at: publishedAt,
    published_by: publishedBy,
    nodes,
  }
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

export async function updateCampaign(
  campaignId: string,
  input: UpdateCampaignInput,
  actorUserId: string,
): Promise<CampaignRecord> {
  const payload: Record<string, unknown> = {}
  if (input.name !== undefined) payload.name = input.name.trim()
  if (input.description !== undefined) payload.description = input.description.trim()
  if (input.offer_definition !== undefined) payload.offer_definition = input.offer_definition.trim()
  if (input.target_audience !== undefined) payload.target_audience = input.target_audience.trim()
  if (input.primary_cta !== undefined) payload.primary_cta = input.primary_cta.trim()
  if (input.keywords !== undefined) payload.keywords = input.keywords
  if (input.start_date !== undefined) payload.start_date = input.start_date || null
  if (input.end_date !== undefined) payload.end_date = input.end_date || null
  if (input.cadence_rule !== undefined) payload.cadence_rule = input.cadence_rule || null
  if (input.status !== undefined) payload.status = input.status

  if (Object.keys(payload).length === 0) {
    throw new Error('updateCampaign: no fields were provided.')
  }

  const { data, error } = await supabase
    .from('campaigns')
    .update(payload)
    .eq('id', campaignId)
    .select('*')
    .single()
  throwDbError('updateCampaign', error)

  const updated = data as CampaignRecord
  await logCampaignActivity({
    entity_type: 'campaign',
    entity_id: updated.id,
    action_type: 'campaign-updated',
    performed_by: actorUserId,
    metadata: {
      changed_fields: Object.keys(payload),
      status: updated.status,
    },
  })
  return updated
}

export async function getCampaignJourneyGraph(campaignId: string): Promise<CampaignJourneyGraph | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .limit(1)
    .single()
  throwDbError('getCampaignJourneyGraph', error)
  return parseCampaignJourneyGraph(data as CampaignRecord)
}

export async function publishCampaignJourneyGraph(input: {
  campaignId: string
  actorUserId: string
  nodes: CampaignJourneyNode[]
}): Promise<{ campaign: CampaignRecord; graph: CampaignJourneyGraph; previousVersion: number }> {
  const { data: currentData, error: currentError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', input.campaignId)
    .limit(1)
    .single()
  throwDbError('publishCampaignJourneyGraph.loadCampaign', currentError)

  const currentCampaign = currentData as CampaignRecord
  const previousGraph = parseCampaignJourneyGraph(currentCampaign)
  const previousVersion = previousGraph?.version || 0

  const nextGraph: CampaignJourneyGraph = {
    version: previousVersion + 1,
    published_at: new Date().toISOString(),
    published_by: input.actorUserId,
    nodes: input.nodes,
  }
  validateJourneyGraph(nextGraph)

  const currentCadenceRule = asRecord(currentCampaign.cadence_rule)
  const nextCadenceRule: Record<string, unknown> = {
    ...currentCadenceRule,
    journey_graph: nextGraph,
  }

  const { data: updatedData, error: updatedError } = await supabase
    .from('campaigns')
    .update({ cadence_rule: nextCadenceRule })
    .eq('id', input.campaignId)
    .select('*')
    .single()
  throwDbError('publishCampaignJourneyGraph.updateCampaign', updatedError)

  const updatedCampaign = updatedData as CampaignRecord
  await logCampaignActivity({
    entity_type: 'campaign',
    entity_id: updatedCampaign.id,
    action_type: 'campaign-journey-published',
    performed_by: input.actorUserId,
    metadata: {
      before_graph_version: previousVersion,
      after_graph_version: nextGraph.version,
      node_count: nextGraph.nodes.length,
    },
  })

  return {
    campaign: updatedCampaign,
    graph: nextGraph,
    previousVersion,
  }
}

export async function listCampaignJourneyTimelineEntries(input: {
  campaignId: string
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
  branchOutcome?: CampaignJourneyBranchOutcome | ''
  nodeType?: CampaignJourneyNodeType | ''
}): Promise<{ rows: CampaignJourneyTimelineEntry[]; hasMore: boolean }> {
  const safeLimit = Math.max(1, Math.min(input.limit || 50, 200))
  const safeOffset = Math.max(0, input.offset || 0)
  const pageSize = safeLimit + 1

  let query = supabase
    .from('campaign_activity_log')
    .select('*')
    .eq('entity_id', input.campaignId)
    .in('action_type', ['campaign-journey-node-executed', 'campaign-journey-published'])
    .order('timestamp', { ascending: false })
    .range(safeOffset, safeOffset + pageSize - 1)

  if (input.startDate) {
    query = query.gte('timestamp', input.startDate)
  }
  if (input.endDate) {
    query = query.lte('timestamp', input.endDate)
  }
  if (input.branchOutcome && input.branchOutcome !== 'n/a') {
    query = query.eq('metadata->>branch_outcome', input.branchOutcome)
  }
  if (input.nodeType) {
    query = query.eq('metadata->>journey_node_type', input.nodeType)
  }

  const { data, error } = await query
  throwDbError('listCampaignJourneyTimelineEntries', error)
  const rows = (data ?? []) as CampaignActivityLog[]
  const hasMore = rows.length > safeLimit
  const slicedRows = rows.slice(0, safeLimit)

  const normalized = slicedRows.map((row) => {
    const metadata = asRecord(row.metadata)
    const nodeType = normalizeJourneyNodeType(metadata.journey_node_type)
    const branchOutcome = normalizeJourneyBranchOutcome(metadata.branch_outcome)
    const actorType = asString(metadata.actor_type) === 'system' ? 'system' : 'user'
    const message = asString(metadata.message)
      || (row.action_type === 'campaign-journey-published'
        ? `Journey published as version ${metadata.after_graph_version || 'unknown'}`
        : `${nodeType || 'node'} execution recorded`)

    return {
      id: row.id,
      campaign_id: row.entity_id,
      node_id: asString(metadata.journey_node_id) || null,
      node_type: nodeType,
      branch_outcome: row.action_type === 'campaign-journey-published' ? 'n/a' : branchOutcome,
      actor_type: actorType,
      actor_user_id: row.performed_by || null,
      action_type: row.action_type,
      message,
      timestamp: row.timestamp,
      metadata,
    } satisfies CampaignJourneyTimelineEntry
  })

  return {
    rows: normalized,
    hasMore,
  }
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
  if (isMissingCampaignTableError(error, 'campaign_assets')) {
    return []
  }
  throwDbError('listCampaignAssets', error)
  return (data ?? []) as CampaignAsset[]
}

export async function listCampaignActivityLogs(limit = 250): Promise<CampaignActivityLog[]> {
  const safeLimit = Math.max(1, Math.min(limit, 1000))
  const { data, error } = await supabase
    .from('campaign_activity_log')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(safeLimit)
  throwDbError('listCampaignActivityLogs', error)
  return (data ?? []) as CampaignActivityLog[]
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
  if (isCampaignAssetUnavailableError(error)) {
    throw new Error('createCampaignAsset: campaign_assets table is not provisioned.')
  }
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
  if (isCampaignAssetUnavailableError(existingError)) {
    throw new Error('removeCampaignAsset: campaign_assets table is not provisioned.')
  }
  throwDbError('removeCampaignAsset(load)', existingError)

  const { error } = await supabase
    .from('campaign_assets')
    .delete()
    .eq('id', assetId)
  if (isCampaignAssetUnavailableError(error)) {
    throw new Error('removeCampaignAsset: campaign_assets table is not provisioned.')
  }
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

export async function listCampaignReminders(): Promise<CampaignReminder[]> {
  const { data, error } = await supabase
    .from('campaign_reminders')
    .select('*')
    .order('scheduled_for', { ascending: true })
  throwDbError('listCampaignReminders', error)
  return (data ?? []) as CampaignReminder[]
}

export async function updateCampaignReminder(reminderId: string, input: UpdateCampaignReminderInput): Promise<CampaignReminder> {
  const payload: Record<string, unknown> = {}
  if (input.user_id !== undefined) payload.user_id = input.user_id
  if (input.reminder_type !== undefined) payload.reminder_type = input.reminder_type
  if (input.scheduled_for !== undefined) payload.scheduled_for = input.scheduled_for
  if (input.status !== undefined) payload.status = input.status
  if (input.sent_at !== undefined) payload.sent_at = input.sent_at
  if (input.failure_reason !== undefined) payload.failure_reason = input.failure_reason

  if (Object.keys(payload).length === 0) {
    throw new Error('updateCampaignReminder: no fields were provided.')
  }

  const { data, error } = await supabase
    .from('campaign_reminders')
    .update(payload)
    .eq('id', reminderId)
    .select('*')
    .single()
  throwDbError('updateCampaignReminder', error)
  return data as CampaignReminder
}

export async function deleteCampaignReminder(reminderId: string): Promise<void> {
  const { error } = await supabase
    .from('campaign_reminders')
    .delete()
    .eq('id', reminderId)
  throwDbError('deleteCampaignReminder', error)
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

export async function updateCampaignContentDraftBody(
  contentId: string,
  actorUserId: string,
  body: string,
): Promise<CampaignContentItem> {
  const trimmed = body.trim()
  if (!trimmed) {
    throw new Error('updateCampaignContentDraftBody: body is required.')
  }

  const { data, error } = await supabase
    .from('campaign_content_items')
    .update({ body: trimmed })
    .eq('id', contentId)
    .eq('status', 'draft')
    .select('*')
    .single()
  throwDbError('updateCampaignContentDraftBody', error)

  const updated = data as CampaignContentItem
  await logCampaignActivity({
    entity_type: 'campaign-content',
    entity_id: updated.id,
    action_type: 'content-draft-body-updated',
    performed_by: actorUserId,
    metadata: {
      status: updated.status,
    },
  })

  return updated
}

export async function campaignAdminOverrideContent(
  contentId: string,
  actorUserId: string,
  input: CampaignAdminOverrideInput,
): Promise<CampaignContentItem> {
  const reason = input.reason.trim()
  if (!reason) throw new Error('campaignAdminOverrideContent: reason is required.')

  return runContentTransitionRpc(
    'campaign_admin_override',
    {
      p_content_id: contentId,
      p_actor_user_id: actorUserId,
      p_action: input.action,
      p_reason: reason,
      p_payload: {
        post_url: input.post_url?.trim() || null,
        posted_at: input.posted_at?.trim() || null,
      },
    },
    'campaignAdminOverrideContent',
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

export async function getCampaignJourneyTimeline(input: {
  actor: CampaignApiActor
  campaignId: string
  startDate?: string
  endDate?: string
  nodeType?: CampaignJourneyNodeType | ''
  branchOutcome?: CampaignJourneyBranchOutcome | ''
  limit?: number
  offset?: number
}): Promise<{ items: CampaignJourneyTimelineEntry[]; hasMore: boolean; generatedAt: string }> {
  const data = await requestCampaignApi<{
    items: CampaignJourneyTimelineEntry[]
    hasMore?: boolean
    generatedAt?: string
  }>({
    method: 'POST',
    body: {
      action: 'get-journey-timeline',
      actor: input.actor,
      campaign_id: input.campaignId,
      filters: {
        startDate: input.startDate || '',
        endDate: input.endDate || '',
        nodeType: input.nodeType || '',
        branchOutcome: input.branchOutcome || '',
        limit: input.limit || 50,
        offset: input.offset || 0,
      },
    },
  })

  return {
    items: data.items || [],
    hasMore: !!data.hasMore,
    generatedAt: data.generatedAt || new Date().toISOString(),
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

export async function requestCampaignJourneyTimelineExport(input: {
  actor: CampaignApiActor
  campaignId: string
  format: 'csv' | 'json'
  filters?: {
    startDate?: string
    endDate?: string
    nodeType?: CampaignJourneyNodeType | ''
    branchOutcome?: CampaignJourneyBranchOutcome | ''
  }
}): Promise<CampaignReportExportJob> {
  const data = await requestCampaignApi<{ job: CampaignReportExportJob }>({
    method: 'POST',
    body: {
      action: 'request-journey-timeline-export',
      actor: input.actor,
      campaign_id: input.campaignId,
      format: input.format,
      filters: input.filters || {},
    },
  })
  return data.job
}
