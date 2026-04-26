import type { OliverFlow } from '@/components/shared/OliverContext'
import type {
  CampaignAdminOverrideAction,
  CampaignAsset,
  CampaignContentItem,
  CampaignContentMetrics,
  CampaignRecord,
  CampaignReminder,
  CampaignReportSummary,
} from '@/types/campaigns'

const asText = (value: unknown) => (value == null ? '' : String(value).trim())

function normalizeScheduleInput(raw: string): string {
  const value = raw.trim()
  if (!value) return ''

  const hasTime = value.includes('T') || value.includes(':')
  const candidate = hasTime ? value : `${value}T09:00:00`
  const parsed = new Date(candidate)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString()
}

type BuildCampaignFlowsContext = {
  isAdmin: boolean
  campaigns: CampaignRecord[]
  allContent: CampaignContentItem[]
  draftContent: CampaignContentItem[]
  needsReviewContent: CampaignContentItem[]
  unclaimedContent: CampaignContentItem[]
  myClaimedContent: CampaignContentItem[]
  postedContent: CampaignContentItem[]
  createCampaign: (payload: {
    name: string
    targetAudience?: string
    primaryCta?: string
    startDate?: string | null
    endDate?: string | null
    cadenceRule?: Record<string, unknown> | null
    status: CampaignRecord['status']
  }) => Promise<CampaignRecord>
  createContentDraft: (payload: {
    title?: string
    body?: string
    contentType: CampaignContentItem['content_type']
    topic?: string
    campaignId?: string | null
  }) => Promise<CampaignContentItem>
  addContentAsset: (payload: {
    contentId: string
    title?: string
    assetType?: string
    url?: string
    fileReference?: string
  }) => Promise<CampaignAsset>
  submitContentReview: (payload: { contentId: string }) => Promise<CampaignContentItem>
  approveContent: (payload: { contentId: string }) => Promise<CampaignContentItem>
  rejectContent: (payload: { contentId: string; reason: string }) => Promise<CampaignContentItem>
  claimContent: (payload: {
    contentId: string
    intendedChannel?: string
    scheduledFor?: string
  }) => Promise<CampaignContentItem>
  unclaimContent: (payload: { contentId: string; reason: string }) => Promise<CampaignContentItem>
  addReminder: (payload: { contentId: string; scheduledFor: string; reminderType: 'ics' | 'slack' | 'email' | 'in-app' }) => Promise<CampaignReminder>
  markPosted: (payload: { contentId: string; postUrl?: string }) => Promise<CampaignContentItem>
  addPostUrl: (payload: { contentId: string; postUrl: string }) => Promise<CampaignContentItem>
  adminOverrideContent: (payload: {
    contentId: string
    action: CampaignAdminOverrideAction
    reason: string
    postUrl?: string
  }) => Promise<CampaignContentItem>
  addPerformanceMetrics: (payload: {
    contentId: string
    impressions?: number | null
    reactions?: number | null
    comments?: number | null
    shares?: number | null
    clicks?: number | null
    conversionCount?: number | null
  }) => Promise<CampaignContentMetrics>
  exportSummary: () => string | Promise<string>
  getSummary: () => CampaignReportSummary
  openContentLibrary: (payload?: { viewMode?: 'action' | 'all'; status?: CampaignContentItem['status'] | 'all'; ownership?: 'all' | 'created-by-me' | 'claimed-by-me' | 'unclaimed' }) => void
  openReviewQueue: () => void
  openCalendar: (payload?: {
    ownership?: 'all' | 'mine'
    timing?: 'all' | 'overdue' | 'today' | 'next-7' | 'unscheduled'
  }) => void
  openReports: () => void
}

export function buildCampaignFlows(ctx: BuildCampaignFlowsContext): OliverFlow[] {
  return [
    {
      id: 'add-campaign',
      label: 'Add Campaign',
      aliases: ['new campaign', 'create campaign', 'add campaign'],
      steps: [
        {
          id: 'campaign_name',
          prompt: 'Campaign name?',
          kind: 'text',
          placeholder: 'Q3 Thought Leadership',
        },
        {
          id: 'target_audience',
          prompt: 'Target audience? (optional)',
          kind: 'text',
          placeholder: 'Who this campaign serves',
          optional: true,
        },
        {
          id: 'primary_cta',
          prompt: 'Primary CTA? (optional)',
          kind: 'text',
          placeholder: 'Book a strategy call',
          optional: true,
        },
        {
          id: 'start_date',
          prompt: 'Start date? (optional)',
          kind: 'text',
          placeholder: '2026-05-01',
          optional: true,
        },
        {
          id: 'end_date',
          prompt: 'End date? (optional)',
          kind: 'text',
          placeholder: '2026-06-30',
          optional: true,
        },
        {
          id: 'cadence_preset',
          prompt: 'Cadence?',
          kind: 'choice',
          choices: [
            { label: 'No cadence', value: 'none' },
            { label: 'Every weekday', value: 'weekdays' },
            { label: 'Every other day', value: 'every-other-day' },
            { label: '3 posts per week', value: 'weekly-3' },
            { label: '5 posts per week', value: 'weekly-5' },
          ],
        },
        {
          id: 'status',
          prompt: 'Campaign status?',
          kind: 'choice',
          choices: [
            { label: 'Draft', value: 'draft' },
            { label: 'Active', value: 'active' },
            { label: 'Paused', value: 'paused' },
          ],
        },
      ],
      run: async (answers) => {
        const campaignName = asText(answers.campaign_name)
        if (!campaignName) return 'Campaign name is required.'
        const startDate = asText(answers.start_date)
        const endDate = asText(answers.end_date)
        if (startDate && endDate && startDate > endDate) return 'Start date must be on or before end date.'

        const cadencePreset = asText(answers.cadence_preset) || 'none'
        const cadenceRule = cadencePreset === 'weekdays'
          ? { preset: 'every-weekday', posts_per_week: 5, days_of_week: [1, 2, 3, 4, 5] }
          : cadencePreset === 'every-other-day'
            ? { preset: 'every-other-day', posts_per_week: 4 }
            : cadencePreset === 'weekly-3'
              ? { preset: 'weekly', posts_per_week: 3 }
              : cadencePreset === 'weekly-5'
                ? { preset: 'weekly', posts_per_week: 5 }
                : null

        const created = await ctx.createCampaign({
          name: campaignName,
          targetAudience: asText(answers.target_audience),
          primaryCta: asText(answers.primary_cta),
          startDate: startDate || null,
          endDate: endDate || null,
          cadenceRule,
          status: (asText(answers.status) as CampaignRecord['status']) || 'draft',
        })

        return 'Campaign created: ' + created.name + '.'
      },
    },
    {
      id: 'add-content-draft',
      label: 'Add Content Draft',
      aliases: ['new content', 'create draft', 'add draft'],
      steps: [
        {
          id: 'title',
          prompt: 'Draft title or hook?',
          kind: 'text',
          placeholder: 'Three ways to reduce campaign friction',
        },
        {
          id: 'body',
          prompt: 'Draft body?',
          kind: 'text',
          placeholder: 'Paste the post copy',
        },
        {
          id: 'content_type',
          prompt: 'Content type?',
          kind: 'choice',
          choices: [
            { label: 'LinkedIn Post', value: 'linkedin-post' },
            { label: 'Blog Post', value: 'blog-post' },
            { label: 'Company Post', value: 'company-post' },
            { label: 'Graphic', value: 'graphic' },
            { label: 'Email Snippet', value: 'email-snippet' },
            { label: 'Other', value: 'other' },
          ],
        },
        {
          id: 'topic',
          prompt: 'Topic?',
          kind: 'text',
          placeholder: 'Campaign execution',
        },
        {
          id: 'campaign_id',
          prompt: 'Attach to a campaign? (optional)',
          kind: 'entity',
          optional: true,
          options: () => ctx.campaigns.map(campaign => ({
            value: campaign.id,
            label: campaign.name,
          })),
        },
      ],
      run: async (answers) => {
        const title = asText(answers.title)
        const body = asText(answers.body)
        const topic = asText(answers.topic)
        if (!title && !body) return 'Title or body is required.'

        const created = await ctx.createContentDraft({
          title,
          body,
          contentType: (asText(answers.content_type) as CampaignContentItem['content_type']) || 'other',
          topic,
          campaignId: asText(answers.campaign_id) || null,
        })

        return 'Draft created: ' + created.title + '.'
      },
    },
    {
      id: 'add-content-asset',
      label: 'Add Content Asset',
      aliases: ['add asset', 'attach asset', 'asset link'],
      steps: [
        {
          id: 'content_id',
          prompt: 'Which content item should receive the asset?',
          kind: 'entity',
          options: () => [...ctx.draftContent, ...ctx.needsReviewContent, ...ctx.unclaimedContent, ...ctx.myClaimedContent].map(content => ({
            value: content.id,
            label: content.title + ' (' + content.status + ')',
          })),
        },
        {
          id: 'asset_title',
          prompt: 'Asset title? (optional)',
          kind: 'text',
          placeholder: 'Creative brief PDF',
          optional: true,
        },
        {
          id: 'asset_type',
          prompt: 'Asset type?',
          kind: 'choice',
          choices: [
            { label: 'External Link', value: 'external-link' },
            { label: 'Image', value: 'image' },
            { label: 'Video', value: 'video' },
            { label: 'Document', value: 'document' },
          ],
        },
        {
          id: 'asset_url',
          prompt: 'Asset URL? (optional if file reference provided)',
          kind: 'text',
          placeholder: 'https://example.com/asset',
          optional: true,
        },
        {
          id: 'file_reference',
          prompt: 'File reference? (optional)',
          kind: 'text',
          placeholder: 'drive://campaigns/q3/brief.pdf',
          optional: true,
        },
      ],
      run: async (answers) => {
        const contentId = asText(answers.content_id)
        const assetUrl = asText(answers.asset_url)
        const fileReference = asText(answers.file_reference)
        if (!contentId) return 'Pick a content item first.'
        if (!assetUrl && !fileReference) return 'Provide an asset URL or file reference.'

        const asset = await ctx.addContentAsset({
          contentId,
          title: asText(answers.asset_title),
          assetType: asText(answers.asset_type) || 'external-link',
          url: assetUrl,
          fileReference,
        })

        return 'Asset added: ' + (asset.title || asset.url || asset.file_reference || asset.id) + '.'
      },
    },
    {
      id: 'submit-content-review',
      label: 'Submit Content Review',
      aliases: ['submit review', 'send to review', 'ready for review'],
      steps: [
        {
          id: 'content_id',
          prompt: 'Which draft should be submitted for review?',
          kind: 'entity',
          options: () => ctx.draftContent.map(content => ({
            value: content.id,
            label: content.title + ' (' + content.topic + ')',
          })),
        },
      ],
      run: async (answers) => {
        const contentId = asText(answers.content_id)
        if (!contentId) return 'Pick one draft to submit.'

        const submitted = await ctx.submitContentReview({ contentId })
        return 'Submitted for review: ' + submitted.title + '.'
      },
    },
    {
      id: 'approve-content',
      label: 'Approve Content',
      aliases: ['approve review item', 'approve post', 'approve draft'],
      steps: [
        {
          id: 'content_id',
          prompt: 'Which item should be approved?',
          kind: 'entity',
          options: () => ctx.needsReviewContent.map(content => ({
            value: content.id,
            label: content.title + ' (' + content.topic + ')',
          })),
        },
      ],
      run: async (answers) => {
        const contentId = asText(answers.content_id)
        if (!contentId) return 'Pick one review item to approve.'

        const approved = await ctx.approveContent({ contentId })
        return 'Approved: ' + approved.title + ' is now unclaimed.'
      },
    },
    {
      id: 'reject-content',
      label: 'Reject Content',
      aliases: ['reject review item', 'send back to draft', 'reject post'],
      steps: [
        {
          id: 'content_id',
          prompt: 'Which review item should be rejected?',
          kind: 'entity',
          options: () => ctx.needsReviewContent.map(content => ({
            value: content.id,
            label: content.title + ' (' + content.topic + ')',
          })),
        },
        {
          id: 'reason',
          prompt: 'What is the rejection reason?',
          kind: 'text',
          placeholder: 'Needs stronger CTA and clearer audience framing',
        },
      ],
      run: async (answers) => {
        const contentId = asText(answers.content_id)
        const reason = asText(answers.reason)
        if (!contentId || !reason) return 'Review item and rejection reason are required.'

        const rejected = await ctx.rejectContent({ contentId, reason })
        return 'Rejected: ' + rejected.title + ' moved back to draft.'
      },
    },
    {
      id: 'claim-content',
      label: 'Claim Content',
      aliases: ['claim post', 'claim unclaimed', 'self claim content'],
      steps: [
        {
          id: 'content_id',
          prompt: 'Which unclaimed content should I claim for you?',
          kind: 'entity',
          options: () => ctx.unclaimedContent.map(content => ({
            value: content.id,
            label: content.title + ' (' + content.topic + ')',
          })),
        },
        {
          id: 'posting_channel',
          prompt: 'Posting channel?',
          kind: 'choice',
          choices: [
            { label: 'LinkedIn', value: 'linkedin' },
            { label: 'Blog', value: 'blog' },
            { label: 'Website', value: 'website' },
            { label: 'Email', value: 'email' },
          ],
        },
        {
          id: 'scheduled_for',
          prompt: 'Target posting date/time? (optional)',
          kind: 'text',
          placeholder: '2026-05-01 09:00',
          optional: true,
        },
      ],
      run: async (answers) => {
        const contentId = asText(answers.content_id)
        if (!contentId) return 'Pick one content item to claim.'

        const normalizedSchedule = normalizeScheduleInput(asText(answers.scheduled_for))
        const claimed = await ctx.claimContent({
          contentId,
          intendedChannel: asText(answers.posting_channel) || 'linkedin',
          scheduledFor: normalizedSchedule,
        })

        return 'Claimed: ' + claimed.title + '. Scheduled for ' + (claimed.scheduled_for || 'today') + '.'
      },
    },
    {
      id: 'unclaim-content',
      label: 'Unclaim Content',
      aliases: ['release claim', 'unassign claim', 'unclaim post'],
      steps: [
        {
          id: 'content_id',
          prompt: 'Which claimed item should be released?',
          kind: 'entity',
          options: () => ctx.myClaimedContent.map(content => ({
            value: content.id,
            label: content.title + ' (' + (content.intended_channel || 'channel not set') + ')',
          })),
        },
        {
          id: 'reason',
          prompt: 'Reason for unclaim?',
          kind: 'text',
          placeholder: 'Need to reassign this post to another owner',
        },
      ],
      run: async (answers) => {
        const contentId = asText(answers.content_id)
        const reason = asText(answers.reason)
        if (!contentId || !reason) return 'Claim and reason are required.'

        const updated = await ctx.unclaimContent({ contentId, reason })
        return 'Unclaimed: ' + updated.title + ' is now available in queue.'
      },
    },
    {
      id: 'add-calendar-reminder',
      label: 'Add Calendar Reminder',
      aliases: ['set reminder', 'schedule reminder', 'calendar reminder'],
      steps: [
        {
          id: 'content_id',
          prompt: 'Choose claimed content for the reminder.',
          kind: 'entity',
          options: () => ctx.myClaimedContent.map(content => ({
            value: content.id,
            label: content.title + ' (' + (content.scheduled_for || 'unscheduled') + ')',
          })),
        },
        {
          id: 'reminder_type',
          prompt: 'Reminder type?',
          kind: 'choice',
          choices: [
            { label: 'In App', value: 'in-app' },
            { label: 'Email', value: 'email' },
            { label: 'Slack', value: 'slack' },
            { label: 'ICS', value: 'ics' },
          ],
        },
        {
          id: 'scheduled_for',
          prompt: 'Reminder date/time?',
          kind: 'text',
          placeholder: '2026-05-01 08:30',
        },
      ],
      run: async (answers) => {
        const contentId = asText(answers.content_id)
        const reminderType = (asText(answers.reminder_type) as 'ics' | 'slack' | 'email' | 'in-app') || 'in-app'
        const scheduledFor = normalizeScheduleInput(asText(answers.scheduled_for))

        if (!contentId || !scheduledFor) return 'Content and valid reminder date/time are required.'

        const reminder = await ctx.addReminder({ contentId, scheduledFor, reminderType })
        return 'Reminder added for ' + reminder.scheduled_for + ' (' + reminder.reminder_type + ').'
      },
    },
    {
      id: 'mark-posted',
      label: 'Mark Posted',
      aliases: ['content posted', 'finish post', 'close content'],
      steps: [
        {
          id: 'content_id',
          prompt: 'Which claimed item should be marked posted?',
          kind: 'entity',
          options: () => ctx.myClaimedContent.map(content => ({
            value: content.id,
            label: content.title + ' (' + (content.intended_channel || 'channel not set') + ')',
          })),
        },
        {
          id: 'post_url',
          prompt: 'Live post URL? (optional)',
          kind: 'text',
          placeholder: 'https://www.linkedin.com/posts/...',
          optional: true,
        },
      ],
      run: async (answers) => {
        const contentId = asText(answers.content_id)
        if (!contentId) return 'Pick one claimed item first.'

        const posted = await ctx.markPosted({ contentId, postUrl: asText(answers.post_url) })
        return 'Marked posted: ' + posted.title + '.'
      },
    },
    {
      id: 'add-post-url',
      label: 'Add Post URL',
      aliases: ['update post url', 'attach post link', 'final url'],
      steps: [
        {
          id: 'content_id',
          prompt: 'Choose claimed or posted content item.',
          kind: 'entity',
          options: () => [...ctx.myClaimedContent, ...ctx.postedContent].map(content => ({
            value: content.id,
            label: content.title + ' (' + content.status + ')',
          })),
        },
        {
          id: 'post_url',
          prompt: 'Post URL?',
          kind: 'text',
          placeholder: 'https://www.linkedin.com/posts/...',
        },
      ],
      run: async (answers) => {
        const contentId = asText(answers.content_id)
        const postUrl = asText(answers.post_url)
        if (!contentId || !postUrl) return 'Content and URL are required.'

        const updated = await ctx.addPostUrl({ contentId, postUrl })
        return 'Post URL saved for: ' + updated.title + '.'
      },
    },
    {
      id: 'admin-override-content',
      label: 'Admin Override Content',
      aliases: ['admin override', 'force status', 'override content'],
      steps: [
        {
          id: 'content_id',
          prompt: 'Which content item needs an admin override?',
          kind: 'entity',
          options: () => ctx.allContent.map(content => ({
            value: content.id,
            label: content.title + ' (' + content.status + ')',
          })),
        },
        {
          id: 'override_action',
          prompt: 'Which override action should be applied?',
          kind: 'choice',
          choices: [
            { label: 'Reset to Draft', value: 'reset-draft' },
            { label: 'Force Unclaimed', value: 'force-unclaimed' },
            { label: 'Force Posted', value: 'force-posted' },
          ],
        },
        {
          id: 'reason',
          prompt: 'Reason for override?',
          kind: 'text',
          placeholder: 'Operational correction after invalid transition',
        },
        {
          id: 'post_url',
          prompt: 'Post URL (optional; applies to Force Posted)',
          kind: 'text',
          placeholder: 'https://www.linkedin.com/posts/...',
          optional: true,
        },
      ],
      run: async (answers) => {
        if (!ctx.isAdmin) return 'Admin override is only available to admin users.'

        const contentId = asText(answers.content_id)
        const overrideAction = asText(answers.override_action) as CampaignAdminOverrideAction
        const reason = asText(answers.reason)
        const postUrl = asText(answers.post_url)
        if (!contentId || !overrideAction || !reason) return 'Content, override action, and reason are required.'
        if (postUrl && !/^https?:\/\//i.test(postUrl)) return 'Post URL must start with http:// or https://.'

        const updated = await ctx.adminOverrideContent({
          contentId,
          action: overrideAction,
          reason,
          postUrl,
        })
        return 'Admin override applied: ' + updated.title + ' is now ' + updated.status + '.'
      },
    },
    {
      id: 'add-performance-metrics',
      label: 'Add Performance Metrics',
      aliases: ['log metrics', 'add analytics', 'record performance'],
      steps: [
        {
          id: 'content_id',
          prompt: 'Which posted content should receive metrics?',
          kind: 'entity',
          options: () => ctx.postedContent.map(content => ({
            value: content.id,
            label: content.title + ' (' + content.topic + ')',
          })),
        },
        {
          id: 'impressions',
          prompt: 'Impressions? (optional)',
          kind: 'number',
          optional: true,
        },
        {
          id: 'reactions',
          prompt: 'Reactions? (optional)',
          kind: 'number',
          optional: true,
        },
        {
          id: 'comments',
          prompt: 'Comments? (optional)',
          kind: 'number',
          optional: true,
        },
        {
          id: 'shares',
          prompt: 'Shares? (optional)',
          kind: 'number',
          optional: true,
        },
        {
          id: 'clicks',
          prompt: 'Clicks? (optional)',
          kind: 'number',
          optional: true,
        },
      ],
      run: async (answers) => {
        const contentId = asText(answers.content_id)
        if (!contentId) return 'Select a posted content item first.'

        const parsed = {
          impressions: Number(asText(answers.impressions) || '0'),
          reactions: Number(asText(answers.reactions) || '0'),
          comments: Number(asText(answers.comments) || '0'),
          shares: Number(asText(answers.shares) || '0'),
          clicks: Number(asText(answers.clicks) || '0'),
        }

        const metrics = await ctx.addPerformanceMetrics({
          contentId,
          impressions: Number.isFinite(parsed.impressions) ? parsed.impressions : null,
          reactions: Number.isFinite(parsed.reactions) ? parsed.reactions : null,
          comments: Number.isFinite(parsed.comments) ? parsed.comments : null,
          shares: Number.isFinite(parsed.shares) ? parsed.shares : null,
          clicks: Number.isFinite(parsed.clicks) ? parsed.clicks : null,
        })

        return 'Metrics saved for content item. Capture id: ' + metrics.id + '.'
      },
    },
    {
      id: 'show-campaign-summary',
      label: 'Show Campaign Summary',
      aliases: ['campaign summary', 'campaign status', 'report summary'],
      steps: [],
      run: async () => {
        const summary = ctx.getSummary()
        return [
          'Campaign summary:',
          'Created: ' + summary.created_count,
          'Submitted: ' + summary.submitted_count,
          'Approved: ' + summary.approved_count,
          'Claimed: ' + summary.claimed_count,
          'Posted: ' + summary.posted_count,
          'Missed: ' + summary.missed_count,
          'Unclaimed: ' + summary.unclaimed_count,
          'Waiting review: ' + summary.waiting_review_count,
          '',
          'Use "Open Reports" to review filters and export history.',
        ].join('\n')
      },
    },
    {
      id: 'export-campaign-summary',
      label: 'Export Campaign Summary',
      aliases: ['export summary', 'download summary', 'campaign export'],
      steps: [],
      run: async () => ctx.exportSummary(),
    },
    {
      id: 'open-content-library',
      label: 'Open Content Library',
      aliases: ['content library', 'available content', 'open unclaimed content'],
      steps: [],
      run: async () => {
        ctx.openContentLibrary({ viewMode: 'all', status: 'all', ownership: 'all' })
        return 'Opened Campaign Content Library.'
      },
    },
    {
      id: 'open-unclaimed-content',
      label: 'Open Unclaimed Content',
      aliases: ['unclaimed content', 'available claims', 'open claim queue'],
      steps: [],
      run: async () => {
        ctx.openContentLibrary({ viewMode: 'action', status: 'unclaimed', ownership: 'unclaimed' })
        return 'Opened unclaimed content queue.'
      },
    },
    {
      id: 'open-my-claimed',
      label: 'Open My Claimed',
      aliases: ['my claimed', 'my schedule', 'my posting queue'],
      steps: [],
      run: async () => {
        ctx.openCalendar({ ownership: 'mine' })
        return 'Opened claimed posting calendar.'
      },
    },
    {
      id: 'open-review-queue',
      label: 'Open Review Queue',
      aliases: ['review queue', 'needs review', 'pending approvals'],
      steps: [],
      run: async () => {
        ctx.openReviewQueue()
        return 'Opened review queue.'
      },
    },
    {
      id: 'open-calendar',
      label: 'Open Calendar',
      aliases: ['posting calendar', 'schedule view', 'open slots'],
      steps: [],
      run: async () => {
        ctx.openCalendar({ ownership: 'all' })
        return 'Opened posting calendar.'
      },
    },
    {
      id: 'open-reports',
      label: 'Open Reports',
      aliases: ['campaign reports', 'report dashboard', 'reporting section'],
      steps: [],
      run: async () => {
        ctx.openReports()
        return 'Opened campaign reports.'
      },
    },
  ]
}
