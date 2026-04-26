export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'

export type CampaignContentStatus = 'draft' | 'needs_review' | 'unclaimed' | 'claimed' | 'posted'

export type CampaignContentType =
  | 'linkedin-post'
  | 'blog-post'
  | 'company-post'
  | 'graphic'
  | 'email-snippet'
  | 'other'

export type CampaignReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled'

export type CampaignReminderType = 'ics' | 'slack' | 'email' | 'in-app'

export interface CampaignRecord {
  id: string
  name: string
  description: string
  offer_definition: string
  target_audience: string
  primary_cta: string
  keywords: string[]
  start_date: string | null
  end_date: string | null
  cadence_rule: Record<string, unknown> | null
  status: CampaignStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface CampaignContentItem {
  id: string
  title: string
  body: string
  content_type: CampaignContentType
  topic: string
  campaign_id: string | null
  status: CampaignContentStatus
  intended_channel: string | null
  attributed_author_id: string | null
  posting_owner_id: string | null
  reviewer_id: string | null
  scheduled_for: string | null
  posted_at: string | null
  post_url: string | null
  rejection_reason: string | null
  created_by: string
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface CampaignAsset {
  id: string
  content_id: string | null
  campaign_id: string | null
  asset_type: string
  url: string | null
  file_reference: string | null
  title: string
  created_by: string
  created_at: string
}

export interface CampaignContentMetrics {
  id: string
  content_id: string
  captured_by_user_id: string
  captured_at: string
  impressions: number | null
  reactions: number | null
  comments: number | null
  shares: number | null
  clicks: number | null
  conversion_count: number | null
  engagement_rate: number | null
  metadata: Record<string, unknown>
}

export interface CampaignActivityLog {
  id: string
  entity_type: string
  entity_id: string
  action_type: string
  performed_by: string | null
  timestamp: string
  metadata: Record<string, unknown>
}

export interface CampaignReminder {
  id: string
  content_id: string
  user_id: string
  reminder_type: CampaignReminderType
  scheduled_for: string
  sent_at: string | null
  status: CampaignReminderStatus
  failure_reason: string | null
}

export interface CampaignDashboardSummary {
  campaigns_total: number
  waiting_for_review_count: number
  unclaimed_count: number
  my_claimed_count: number
  due_today_count: number
  posted_recent_count: number
  missed_count: number
}

export interface CampaignReportSummary {
  created_count: number
  submitted_count: number
  approved_count: number
  claimed_count: number
  posted_count: number
  missed_count: number
  unclaimed_count: number
  waiting_review_count: number
}

export interface CampaignReportGroupingBucket {
  key: string
  count: number
}

export interface CampaignReportGroupings {
  by_campaign: CampaignReportGroupingBucket[]
  by_topic: CampaignReportGroupingBucket[]
  by_user: CampaignReportGroupingBucket[]
}

export interface CampaignReportSummaryResponse {
  summary: CampaignReportSummary
  groupings: CampaignReportGroupings
}

export interface CampaignReportExportJob {
  id: string
  requested_by_user_id: string
  format: string
  filters: Record<string, unknown>
  status: 'queued' | 'running' | 'completed' | 'failed'
  file_name: string | null
  file_payload: string | null
  error_message: string | null
  requested_at: string
  completed_at: string | null
}

export type CampaignJobsAction = 'all' | 'dispatch-reminders' | 'detect-missed'

export interface CampaignJobRunStats {
  ok?: boolean
  inspected?: number
  sent?: number
  failed?: number
  cancelled?: number
  skipped?: number
  newly_missed?: number
  already_marked?: number
  errors?: string[]
  error?: string
}

export interface CampaignJobsRunResult {
  ok: boolean
  action: CampaignJobsAction
  dry_run: boolean
  trigger_source?: string
  actor_user_id?: string | null
  jobs?: {
    reminders?: CampaignJobRunStats
    missed_posts?: CampaignJobRunStats
  }
}

export interface CreateCampaignInput {
  name: string
  description?: string
  offer_definition?: string
  target_audience?: string
  primary_cta?: string
  keywords?: string[]
  start_date?: string | null
  end_date?: string | null
  cadence_rule?: Record<string, unknown> | null
  status?: CampaignStatus
}

export interface CreateCampaignContentDraftInput {
  title: string
  body: string
  content_type: CampaignContentType
  topic: string
  campaign_id?: string | null
  intended_channel?: string | null
  attributed_author_id?: string | null
}

export interface ClaimCampaignContentInput {
  intended_channel?: string | null
  scheduled_for?: string | null
}

export interface CreateCampaignAssetInput {
  content_id?: string | null
  campaign_id?: string | null
  asset_type?: string
  url?: string | null
  file_reference?: string | null
  title?: string
}

export interface CreateCampaignReminderInput {
  content_id: string
  user_id: string
  reminder_type: CampaignReminderType
  scheduled_for: string
}

export interface AddCampaignMetricsInput {
  content_id: string
  captured_by_user_id: string
  impressions?: number | null
  reactions?: number | null
  comments?: number | null
  shares?: number | null
  clicks?: number | null
  conversion_count?: number | null
  engagement_rate?: number | null
  metadata?: Record<string, unknown>
}
