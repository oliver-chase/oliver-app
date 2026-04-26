'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRegisterOliver } from '@/components/shared/OliverContext'
import type { OliverAction, OliverConfig } from '@/components/shared/OliverContext'
import CustomPicker from '@/components/shared/CustomPicker'
import { useModuleAccess } from '@/modules/use-module-access'
import { buildModuleOliverConfig } from '@/modules/oliver-config'
import { CAMPAIGNS_COMMANDS } from '@/app/campaigns/commands'
import { buildCampaignFlows } from '@/app/campaigns/flows'
import { CampaignsLanding } from '@/components/campaigns/CampaignsLanding'
import { ModuleSidebarHeader } from '@/components/shared/ModuleSidebarHeader'
import { ModuleTopbar } from '@/components/shared/ModuleTopbar'
import { useUser } from '@/context/UserContext'
import { buildCampaignIcsPayload } from '@/lib/campaign-ics'
import {
  addCampaignPerformanceMetrics,
  approveCampaignContent,
  campaignAdminOverrideContent,
  claimCampaignContent,
  createCampaign,
  createCampaignAsset,
  createCampaignContentDraft,
  createCampaignReminder,
  deleteCampaignReminder,
  isCampaignsAccessDenied,
  isCampaignsSchemaMissing,
  listCampaignActivityLogs,
  listCampaignAssets,
  listCampaignContentItems,
  listCampaignReminders,
  listCampaigns,
  isCampaignAssetsTableAvailable,
  markCampaignContentPosted,
  logCampaignActivityEvent,
  publishCampaignJourneyGraph,
  removeCampaignAsset,
  rejectCampaignContent,
  requestCampaignJourneyTimelineExport,
  requestCampaignReportExport,
  downloadCampaignReportExport,
  getCampaignReportSummary,
  getCampaignJourneyTimeline,
  listCampaignReportExports,
  runCampaignJobs,
  parseCampaignTransitionError,
  submitCampaignContentForReview,
  type CampaignSyncState,
  unclaimCampaignContent,
  updateCampaign,
  updateCampaignContentDraftBody,
  updateCampaignContentPostUrl,
  updateCampaignContentSchedule,
  updateCampaignReminder,
} from '@/lib/campaigns'
import type {
  CampaignActivityLog,
  CampaignAdminOverrideAction,
  CampaignAsset,
  CampaignContentItem,
  CampaignContentMetrics,
  CampaignJourneyBranchOutcome,
  CampaignJourneyGraph,
  CampaignJourneyNode,
  CampaignJourneyNodeType,
  CampaignJourneyTimelineEntry,
  CampaignReportGroupings,
  CampaignJobsAction,
  CampaignJobsRunResult,
  CampaignReminder,
  CampaignRecord,
  CampaignReportExportJob,
  CampaignReportSummary,
} from '@/types/campaigns'

type CampaignSection = 'list' | 'content' | 'review' | 'calendar' | 'reminders' | 'reports' | 'automation'

const SECTION_TO_ANCHOR: Record<CampaignSection, string> = {
  list: 'campaigns-list',
  content: 'campaigns-content',
  review: 'campaigns-review',
  calendar: 'campaigns-calendar',
  reminders: 'campaigns-reminders',
  reports: 'campaigns-reports',
  automation: 'campaigns-automation',
}

const SECTION_TO_ROUTE: Record<CampaignSection, string> = {
  list: '/campaigns/campaigns',
  content: '/campaigns/content',
  review: '/campaigns/review-queue',
  calendar: '/campaigns/calendar',
  reminders: '/campaigns/reminders',
  reports: '/campaigns/reports',
  automation: '/campaigns/automation',
}

function sectionFromPathname(pathname: string): CampaignSection | null {
  const normalized = pathname.replace(/\/+$/, '')
  switch (normalized) {
    case '/campaigns/campaigns':
      return 'list'
    case '/campaigns/content':
      return 'content'
    case '/campaigns/review-queue':
      return 'review'
    case '/campaigns/calendar':
      return 'calendar'
    case '/campaigns/reminders':
      return 'reminders'
    case '/campaigns/reports':
      return 'reports'
    case '/campaigns/automation':
      return 'automation'
    default:
      return null
  }
}

const CAMPAIGN_STATUS_OPTIONS: Array<{ value: CampaignRecord['status']; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
]

const CONTENT_TYPE_OPTIONS: Array<{ value: CampaignContentItem['content_type']; label: string }> = [
  { value: 'linkedin-post', label: 'LinkedIn Post' },
  { value: 'blog-post', label: 'Blog Post' },
  { value: 'company-post', label: 'Company Post' },
  { value: 'other', label: 'Other' },
]

const CAMPAIGNS_ACCESS_POLICY_MESSAGE = 'Campaign module access is blocked by Supabase RLS/permissions. Confirm policy coverage for campaign_* tables.'
const REPORT_FILTERS_STORAGE_KEY = 'campaigns-report-filters-v1'

type CampaignReportPreset = 'last-7' | 'last-30' | 'current-month' | 'custom'

type CampaignReportFilters = {
  preset: CampaignReportPreset
  startDate: string
  endDate: string
  campaignId: string
  contentType: string
}

type ReviewQueueSort = 'oldest' | 'newest' | 'campaign' | 'topic'
type ReviewQueueFilter = 'needs-review' | 'all' | 'unclaimed' | 'assigned-to-me' | 'changes-requested' | 'approved-unscheduled' | 'overdue'
type ContentLibraryOwnershipFilter = 'all' | 'created-by-me' | 'claimed-by-me' | 'unclaimed'
type ContentLibraryViewMode = 'action' | 'all'
type CalendarSort = 'overdue-first' | 'soonest' | 'latest' | 'title'
type CalendarTimingFilter = 'all' | 'overdue' | 'today' | 'next-7' | 'unscheduled'
type CalendarView = 'weekly' | 'monthly' | 'list'
type CampaignCadencePreset = 'none' | 'weekdays' | 'every-other-day' | 'weekly-3' | 'weekly-5'
type CampaignReasonModalMode = 'review-reject' | 'content-unclaim'

type ContentLibraryFilters = {
  query: string
  status: 'all' | CampaignContentItem['status']
  contentType: 'all' | CampaignContentItem['content_type']
  campaignId: string
  ownership: ContentLibraryOwnershipFilter
}

type CalendarFilters = {
  query: string
  campaignId: string
  channel: string
  timing: CalendarTimingFilter
  ownership: 'all' | 'mine'
}

type ReminderEditorDraft = {
  contentId: string
  userId: string
  reminderType: CampaignReminder['reminder_type']
  scheduledFor: string
}

type CampaignReasonModalState = {
  mode: CampaignReasonModalMode
  contentId: string
  title: string
} | null

type CampaignAdminOverrideModalState = {
  contentId: string
  title: string
  currentStatus: CampaignContentItem['status']
} | null

type CalendarTimelineKind = 'claimed' | 'posted' | 'missed' | 'open-slot'

type CalendarTimelineEntry = {
  id: string
  contentId: string | null
  startsAt: Date
  dateKey: string
  title: string
  kind: CalendarTimelineKind
  campaignLabel: string
  channel: string | null
  detail: string
}

type CampaignDetailDraft = {
  name: string
  description: string
  offerDefinition: string
  targetAudience: string
  primaryCta: string
  keywords: string
  startDate: string
  endDate: string
  cadencePreset: CampaignCadencePreset
  status: CampaignRecord['status']
}

type CampaignDensityDay = {
  dateKey: string
  dateLabel: string
  weekdayLabel: string
  scheduledCount: number
  expectedCount: number
  openCount: number
  missedCount: number
  postedCount: number
  status: 'off' | 'open' | 'filled' | 'missed'
}

type CampaignJourneyNodeDraft = {
  id: string
  type: CampaignJourneyNodeType
  title: string
  configJson: string
  nextNodeIdsCsv: string
  branchPositiveNodeId: string
  branchNegativeNodeId: string
}

type CampaignJourneyTimelineFilters = {
  startDate: string
  endDate: string
  nodeType: CampaignJourneyNodeType | ''
  branchOutcome: CampaignJourneyBranchOutcome | ''
}

type CampaignPlanningBoardStatus = 'draft' | 'ready' | 'live' | 'paused'

type CampaignPlanningBoardDraft = {
  objective: string
  targetAudience: string
  channelMix: string
  cta: string
  successMetrics: string
  status: CampaignPlanningBoardStatus
}

type CampaignFocusItemType = 'collect_data' | 'display_notice' | 'emphasize_link'

type CampaignFocusItemStatus = 'draft' | 'active' | 'paused' | 'archived'

type CampaignFocusItem = {
  id: string
  type: CampaignFocusItemType
  title: string
  message: string
  target_url: string
  campaign_node_id: string
  start_at: string
  end_at: string
  domain_allowlist: string[]
  status: CampaignFocusItemStatus
  impressions: number
  conversions: number
  updated_at: string
  updated_by: string
}

type CampaignFocusItemDraft = {
  type: CampaignFocusItemType
  title: string
  message: string
  targetUrl: string
  campaignNodeId: string
  startAt: string
  endAt: string
  domainAllowlist: string
  status: CampaignFocusItemStatus
}

const CAMPAIGN_CADENCE_OPTIONS: Array<{ value: CampaignCadencePreset; label: string }> = [
  { value: 'none', label: 'No Cadence' },
  { value: 'weekdays', label: 'Every Weekday (Mon-Fri)' },
  { value: 'every-other-day', label: 'Every Other Day' },
  { value: 'weekly-3', label: '3 Posts per Week' },
  { value: 'weekly-5', label: '5 Posts per Week' },
]

function buildIcsPayload(item: CampaignContentItem, scheduledIso: string) {
  return buildCampaignIcsPayload({
    item,
    scheduledIso,
    modulePath: '/campaigns',
  })
}

function isHttpUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return false
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function campaignTransitionMessageFromError(error: unknown) {
  const transitionError = parseCampaignTransitionError(error)
  if (!transitionError) {
    const rawMessage = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ''
    const normalized = rawMessage.toLowerCase()
    if (normalized.includes('not found') || normalized.includes('stale')) {
      return {
        message: 'Campaign item not found or stale. Refresh and retry.',
        refreshRecommended: true,
      }
    }
    if (
      normalized.includes('does not exist')
      && !normalized.includes('public.campaign_')
      && !normalized.includes('function public.campaign_')
      && !normalized.includes('could not find the table')
    ) {
      return {
        message: 'Campaign item not found or stale. Refresh and retry.',
        refreshRecommended: true,
      }
    }
    if (normalized.includes('reason_code is required')) {
      return {
        message: 'Reason_code is required.',
        refreshRecommended: false,
      }
    }
    return null
  }

  switch (transitionError.code) {
    case 'CMP_NOT_FOUND':
      return {
        message: `Campaign item not found or stale. Refresh and retry.`,
        refreshRecommended: true,
      }
    case 'CMP_INVALID_STATE':
      return {
        message: `Campaign data changed while this action was running. Refresh and retry.`,
        refreshRecommended: true,
      }
    case 'CMP_PERMISSION_DENIED':
      return {
        message: `You do not have permission to perform this action right now.`,
        refreshRecommended: false,
      }
    case 'CMP_VALIDATION_FAILED':
      {
      const reason = transitionError.reason
        ? `${transitionError.reason.charAt(0).toUpperCase()}${transitionError.reason.slice(1)}`
        : 'Please provide the required information and retry.'
      const message = /[.!?]$/.test(reason) ? reason : `${reason}.`
      return {
        message,
        refreshRecommended: false,
      }
      }
    case 'CMP_CONFLICT':
      return {
        message: `Concurrent content update detected. Refresh and retry.`,
        refreshRecommended: true,
      }
    case 'CMP_UNKNOWN':
      return {
        message: transitionError.reason,
        refreshRecommended: false,
      }
    default:
      return {
        message: transitionError.reason,
        refreshRecommended: false,
      }
  }
}

function humanizeActionType(value: string) {
  const cleaned = value.trim().replace(/[_-]+/g, ' ')
  if (!cleaned) return 'activity'
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

function canonicalStatusFromItem(item: CampaignContentItem) {
  if (item.lifecycle_status) return item.lifecycle_status
  if (item.status === 'draft') return 'draft'
  if (item.status === 'needs_review') return 'in_review'
  if (item.status === 'unclaimed') return 'approved'
  if (item.status === 'claimed') return 'scheduled'
  if (item.status === 'posted' && item.archived_at) return 'archived'
  if (item.status === 'posted') return 'posted'
  return 'draft'
}

function formatCanonicalStatusLabel(value: string) {
  if (value === 'in_review') return 'In Review'
  if (value === 'changes_requested') return 'Changes Requested'
  return humanizeActionType(value)
}

function toDateTimeLocalValue(input: string | null) {
  if (!input) return ''
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function localDateTimeToIso(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return null
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getPresetDateRange(preset: CampaignReportPreset): { startDate: string; endDate: string } {
  const now = new Date()
  const endDate = toDateInputValue(now)

  if (preset === 'current-month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { startDate: toDateInputValue(start), endDate }
  }

  if (preset === 'last-7' || preset === 'last-30') {
    const days = preset === 'last-7' ? 7 : 30
    const start = new Date(now)
    start.setDate(now.getDate() - (days - 1))
    return { startDate: toDateInputValue(start), endDate }
  }

  return { startDate: '', endDate: '' }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return { ...(value as Record<string, unknown>) }
}

function buildCadenceRuleFromPreset(
  preset: CampaignCadencePreset,
  existingRule?: CampaignRecord['cadence_rule'],
): Record<string, unknown> | null {
  const preserved = asRecord(existingRule)
  delete preserved.preset
  delete preserved.posts_per_week
  delete preserved.postsPerWeek
  delete preserved.days_of_week
  delete preserved.weekly_target
  delete preserved.weeklyTarget

  if (preset === 'none') {
    return Object.keys(preserved).length > 0 ? preserved : null
  }

  const scheduled: Record<string, unknown> = {}
  if (preset === 'weekdays') {
    Object.assign(scheduled, {
      preset: 'every-weekday',
      posts_per_week: 5,
      days_of_week: [1, 2, 3, 4, 5],
    })
  } else if (preset === 'every-other-day') {
    Object.assign(scheduled, {
      preset: 'every-other-day',
      posts_per_week: 4,
    })
  } else if (preset === 'weekly-3') {
    Object.assign(scheduled, {
      preset: 'weekly',
      posts_per_week: 3,
    })
  } else {
    Object.assign(scheduled, {
      preset: 'weekly',
      posts_per_week: 5,
    })
  }

  return {
    ...preserved,
    ...scheduled,
  }
}

function getCadencePresetFromRule(rule: CampaignRecord['cadence_rule']): CampaignCadencePreset {
  if (!rule || typeof rule !== 'object') return 'none'
  const source = rule as Record<string, unknown>
  const preset = typeof source.preset === 'string' ? source.preset : ''
  if (preset === 'every-weekday') return 'weekdays'
  if (preset === 'every-other-day') return 'every-other-day'

  const weeklyTargetRaw = source.posts_per_week ?? source.postsPerWeek ?? source.weekly_target ?? source.weeklyTarget
  const weeklyTarget = Number(weeklyTargetRaw)
  if (Number.isFinite(weeklyTarget) && weeklyTarget >= 5) return 'weekly-5'
  if (Number.isFinite(weeklyTarget) && weeklyTarget >= 3) return 'weekly-3'
  return 'none'
}

function buildCampaignDetailDraft(campaign: CampaignRecord | null): CampaignDetailDraft {
  if (!campaign) {
    return {
      name: '',
      description: '',
      offerDefinition: '',
      targetAudience: '',
      primaryCta: '',
      keywords: '',
      startDate: '',
      endDate: '',
      cadencePreset: 'none',
      status: 'draft',
    }
  }
  return {
    name: campaign.name || '',
    description: campaign.description || '',
    offerDefinition: campaign.offer_definition || '',
    targetAudience: campaign.target_audience || '',
    primaryCta: campaign.primary_cta || '',
    keywords: Array.isArray(campaign.keywords) ? campaign.keywords.join(', ') : '',
    startDate: campaign.start_date || '',
    endDate: campaign.end_date || '',
    cadencePreset: getCadencePresetFromRule(campaign.cadence_rule),
    status: campaign.status,
  }
}

function normalizeCadence(cadenceRule: CampaignRecord['cadence_rule']): {
  postsPerWeek: number | null
  preferredWeekdays: number[] | null
  label: string
} {
  if (!cadenceRule || typeof cadenceRule !== 'object') {
    return { postsPerWeek: null, preferredWeekdays: null, label: 'No cadence' }
  }

  const source = cadenceRule as Record<string, unknown>
  const rawPostsPerWeek =
    source.posts_per_week
    ?? source.postsPerWeek
    ?? source.weekly_target
    ?? source.weeklyTarget

  const parsedPosts = Number(rawPostsPerWeek)
  const postsPerWeek = Number.isFinite(parsedPosts) && parsedPosts > 0
    ? Math.floor(parsedPosts)
    : null

  const rawDays = source.days_of_week
  const preferredWeekdays = Array.isArray(rawDays)
    ? rawDays
      .map(day => Number(day))
      .filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
      .map(day => Math.floor(day))
      .sort((left, right) => left - right)
    : null

  const preset = typeof source.preset === 'string' ? source.preset : ''
  const presetLabelMap: Record<string, string> = {
    'every-weekday': 'Every weekday',
    'every-other-day': 'Every other day',
    'weekly': postsPerWeek ? `${postsPerWeek} post${postsPerWeek === 1 ? '' : 's'} per week` : 'Weekly',
  }
  const label = presetLabelMap[preset] || (postsPerWeek ? `${postsPerWeek} post${postsPerWeek === 1 ? '' : 's'} per week` : 'Custom cadence')
  return { postsPerWeek, preferredWeekdays: preferredWeekdays && preferredWeekdays.length > 0 ? preferredWeekdays : null, label }
}

function dayWithinRange(dateValue: Date, startDate: string | null, endDate: string | null) {
  const check = new Date(dateValue)
  check.setHours(0, 0, 0, 0)

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`)
    start.setHours(0, 0, 0, 0)
    if (check.getTime() < start.getTime()) return false
  }
  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`)
    if (check.getTime() > end.getTime()) return false
  }
  return true
}

function resolveNextOpenSlotDate(params: {
  campaign: CampaignRecord
  preferredWeekdays: number[] | null
  scheduledByDay: Set<string>
}): Date | null {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = new Date(start)
    candidate.setDate(start.getDate() + offset)
    if (!dayWithinRange(candidate, params.campaign.start_date, params.campaign.end_date)) continue
    if (params.preferredWeekdays && params.preferredWeekdays.length > 0 && !params.preferredWeekdays.includes(candidate.getDay())) continue
    const dayKey = candidate.toISOString().slice(0, 10)
    if (!params.scheduledByDay.has(dayKey)) return candidate
  }

  return null
}

function startOfWeek(dateValue: Date) {
  const value = new Date(dateValue)
  value.setHours(0, 0, 0, 0)
  const day = value.getDay()
  const offset = (day + 6) % 7
  value.setDate(value.getDate() - offset)
  return value
}

function endOfWeek(dateValue: Date) {
  const value = startOfWeek(dateValue)
  value.setDate(value.getDate() + 6)
  value.setHours(23, 59, 59, 999)
  return value
}

function addDays(dateValue: Date, count: number) {
  const value = new Date(dateValue)
  value.setDate(value.getDate() + count)
  return value
}

function countReportGroupings(rows: CampaignContentItem[], groupBy: (item: CampaignContentItem) => string): CampaignReportGroupings['by_campaign'] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = groupBy(row) || 'unknown'
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

function parseJourneyGraphFromCampaign(campaign: CampaignRecord | null): CampaignJourneyGraph | null {
  if (!campaign?.cadence_rule || typeof campaign.cadence_rule !== 'object') return null
  const cadenceRule = campaign.cadence_rule as Record<string, unknown>
  const raw = cadenceRule.journey_graph
  if (!raw || typeof raw !== 'object') return null

  const graph = raw as Record<string, unknown>
  const version = Number(graph.version || 0)
  const publishedAt = typeof graph.published_at === 'string' ? graph.published_at : ''
  const publishedBy = typeof graph.published_by === 'string' ? graph.published_by : ''
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : []
  if (!Number.isFinite(version) || version <= 0 || !publishedAt || !publishedBy) return null

  const normalizedNodes = nodes
    .map((row): CampaignJourneyNode | null => {
      if (!row || typeof row !== 'object') return null
      const source = row as Record<string, unknown>
      const id = typeof source.id === 'string' ? source.id.trim() : ''
      const type = source.type
      const title = typeof source.title === 'string' ? source.title.trim() : ''
      if (!id || !title || (type !== 'action' && type !== 'decision' && type !== 'condition')) return null
      const nextNodeIds = Array.isArray(source.next_node_ids)
        ? source.next_node_ids.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        : []
      return {
        id,
        type,
        title,
        config: source.config && typeof source.config === 'object' && !Array.isArray(source.config)
          ? source.config as Record<string, unknown>
          : {},
        next_node_ids: nextNodeIds,
        branch_positive_node_id: typeof source.branch_positive_node_id === 'string' ? source.branch_positive_node_id.trim() : null,
        branch_negative_node_id: typeof source.branch_negative_node_id === 'string' ? source.branch_negative_node_id.trim() : null,
      }
    })
    .filter((node): node is CampaignJourneyNode => !!node)

  if (normalizedNodes.length === 0) return null
  return {
    version,
    published_at: publishedAt,
    published_by: publishedBy,
    nodes: normalizedNodes,
  }
}

function nodeDraftFromNode(node: CampaignJourneyNode): CampaignJourneyNodeDraft {
  return {
    id: node.id,
    type: node.type,
    title: node.title,
    configJson: JSON.stringify(node.config || {}, null, 2),
    nextNodeIdsCsv: (node.next_node_ids || []).join(','),
    branchPositiveNodeId: node.branch_positive_node_id || '',
    branchNegativeNodeId: node.branch_negative_node_id || '',
  }
}

function createDefaultJourneyNodeDraft(type: CampaignJourneyNodeType = 'action'): CampaignJourneyNodeDraft {
  const stamp = Math.random().toString(36).slice(2, 7)
  return {
    id: `${type}-${stamp}`,
    type,
    title: type === 'action' ? 'Action node' : type === 'decision' ? 'Decision node' : 'Condition node',
    configJson: type === 'action'
      ? JSON.stringify({ action_key: 'send-message' }, null, 2)
      : type === 'decision'
        ? JSON.stringify({ field: 'engagement_score', operator: '>=' }, null, 2)
        : JSON.stringify({ condition_key: 'in_segment' }, null, 2),
    nextNodeIdsCsv: '',
    branchPositiveNodeId: '',
    branchNegativeNodeId: '',
  }
}

function parsePlanningBoardDraft(campaign: CampaignRecord | null): CampaignPlanningBoardDraft {
  const cadenceRule = asRecord(campaign?.cadence_rule)
  const planning = asRecord(cadenceRule.planning_board)
  const status = planning.status === 'ready' || planning.status === 'live' || planning.status === 'paused'
    ? planning.status
    : 'draft'
  return {
    objective: typeof planning.objective === 'string' ? planning.objective : '',
    targetAudience: typeof planning.target_audience === 'string' ? planning.target_audience : '',
    channelMix: typeof planning.channel_mix === 'string' ? planning.channel_mix : '',
    cta: typeof planning.cta === 'string' ? planning.cta : '',
    successMetrics: typeof planning.success_metrics === 'string' ? planning.success_metrics : '',
    status,
  }
}

function parseFocusItems(campaign: CampaignRecord | null): CampaignFocusItem[] {
  const cadenceRule = asRecord(campaign?.cadence_rule)
  const rawItems = Array.isArray(cadenceRule.focus_items) ? cadenceRule.focus_items : []
  return rawItems
    .map((row): CampaignFocusItem | null => {
      if (!row || typeof row !== 'object') return null
      const source = row as Record<string, unknown>
      const id = typeof source.id === 'string' && source.id.trim() ? source.id.trim() : ''
      const type = source.type
      if (type !== 'collect_data' && type !== 'display_notice' && type !== 'emphasize_link') return null
      const status = source.status === 'active' || source.status === 'paused' || source.status === 'archived'
        ? source.status
        : 'draft'
      const domains = Array.isArray(source.domain_allowlist)
        ? source.domain_allowlist.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        : []
      const impressions = Number(source.impressions || 0)
      const conversions = Number(source.conversions || 0)
      return {
        id: id || `focus-${Math.random().toString(36).slice(2, 8)}`,
        type,
        title: typeof source.title === 'string' ? source.title : '',
        message: typeof source.message === 'string' ? source.message : '',
        target_url: typeof source.target_url === 'string' ? source.target_url : '',
        campaign_node_id: typeof source.campaign_node_id === 'string' ? source.campaign_node_id : '',
        start_at: typeof source.start_at === 'string' ? source.start_at : '',
        end_at: typeof source.end_at === 'string' ? source.end_at : '',
        domain_allowlist: domains,
        status,
        impressions: Number.isFinite(impressions) ? impressions : 0,
        conversions: Number.isFinite(conversions) ? conversions : 0,
        updated_at: typeof source.updated_at === 'string' ? source.updated_at : '',
        updated_by: typeof source.updated_by === 'string' ? source.updated_by : '',
      }
    })
    .filter((row): row is CampaignFocusItem => !!row)
}

function createDefaultFocusItemDraft(): CampaignFocusItemDraft {
  return {
    type: 'display_notice',
    title: '',
    message: '',
    targetUrl: '',
    campaignNodeId: '',
    startAt: '',
    endAt: '',
    domainAllowlist: '',
    status: 'draft',
  }
}

function buildPlanningBoardCompleteness(draft: CampaignPlanningBoardDraft) {
  const requiredChecks = [
    draft.objective.trim().length > 0,
    draft.targetAudience.trim().length > 0,
    draft.channelMix.trim().length > 0,
    draft.cta.trim().length > 0,
    draft.successMetrics.trim().length > 0,
  ]
  const completeCount = requiredChecks.filter(Boolean).length
  return {
    completeCount,
    totalCount: requiredChecks.length,
    isComplete: completeCount === requiredChecks.length,
  }
}

export default function CampaignsPage() {
  const pathname = usePathname()
  const router = useRouter()
  const { allowRender } = useModuleAccess('campaigns')
  const { appUser, isAdmin } = useUser()
  const routedSection = useMemo(() => sectionFromPathname(pathname || ''), [pathname])
  const sectionPageMode = routedSection !== null
  const activeSidebarSection = routedSection || 'list'

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([])
  const [contentItems, setContentItems] = useState<CampaignContentItem[]>([])
  const [assets, setAssets] = useState<CampaignAsset[]>([])
  const [activityLogs, setActivityLogs] = useState<CampaignActivityLog[]>([])
  const [serverReportSummary, setServerReportSummary] = useState<CampaignReportSummary | null>(null)
  const [serverReportGroupings, setServerReportGroupings] = useState<CampaignReportGroupings | null>(null)
  const [reportSummaryLoading, setReportSummaryLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncState, setSyncState] = useState<CampaignSyncState>('syncing')
  const [error, setError] = useState<string | null>(null)
  const [refreshRecommended, setRefreshRecommended] = useState(false)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [policyBlocked, setPolicyBlocked] = useState(false)
  const initialRange = useMemo(() => getPresetDateRange('last-30'), [])
  const [reportFiltersDraft, setReportFiltersDraft] = useState<CampaignReportFilters>({
    preset: 'last-30',
    startDate: initialRange.startDate,
    endDate: initialRange.endDate,
    campaignId: '',
    contentType: '',
  })
  const [reportFiltersApplied, setReportFiltersApplied] = useState<CampaignReportFilters>({
    preset: 'last-30',
    startDate: initialRange.startDate,
    endDate: initialRange.endDate,
    campaignId: '',
    contentType: '',
  })
  const [exportJobs, setExportJobs] = useState<CampaignReportExportJob[]>([])
  const [exportJobsLoading, setExportJobsLoading] = useState(false)
  const reportFilterDateError = useMemo(() => {
    if (!reportFiltersDraft.startDate || !reportFiltersDraft.endDate) return null
    if (reportFiltersDraft.startDate <= reportFiltersDraft.endDate) return null
    return 'Start date must be on or before end date.'
  }, [reportFiltersDraft.endDate, reportFiltersDraft.startDate])
  const [reviewQueueSort, setReviewQueueSort] = useState<ReviewQueueSort>('oldest')
  const [reviewQueueFilter, setReviewQueueFilter] = useState<ReviewQueueFilter>('needs-review')
  const [reviewSelectedById, setReviewSelectedById] = useState<Record<string, boolean>>({})
  const [reviewBulkRunning, setReviewBulkRunning] = useState(false)
  const [reviewBulkMessage, setReviewBulkMessage] = useState<string | null>(null)
  const [reviewBulkRejectModalOpen, setReviewBulkRejectModalOpen] = useState(false)
  const [reviewBulkRejectReason, setReviewBulkRejectReason] = useState('')
  const [reviewBulkRejectError, setReviewBulkRejectError] = useState<string | null>(null)
  const [reasonModalState, setReasonModalState] = useState<CampaignReasonModalState>(null)
  const [reasonModalInput, setReasonModalInput] = useState('')
  const [reasonModalError, setReasonModalError] = useState<string | null>(null)
  const [reasonModalRunning, setReasonModalRunning] = useState(false)
  const [adminOverrideModalState, setAdminOverrideModalState] = useState<CampaignAdminOverrideModalState>(null)
  const [adminOverrideAction, setAdminOverrideAction] = useState<CampaignAdminOverrideAction>('reset-draft')
  const [adminOverrideReason, setAdminOverrideReason] = useState('')
  const [adminOverridePostUrl, setAdminOverridePostUrl] = useState('')
  const [adminOverrideError, setAdminOverrideError] = useState<string | null>(null)
  const [adminOverrideRunning, setAdminOverrideRunning] = useState(false)
  const [campaignAssetsAvailable, setCampaignAssetsAvailable] = useState(true)
  const [contentLibraryFilters, setContentLibraryFilters] = useState<ContentLibraryFilters>({
    query: '',
    status: 'all',
    contentType: 'all',
    campaignId: '',
    ownership: 'all',
  })
  const [contentLibraryViewMode, setContentLibraryViewMode] = useState<ContentLibraryViewMode>('action')
  const [calendarSort, setCalendarSort] = useState<CalendarSort>('overdue-first')
  const [calendarFilters, setCalendarFilters] = useState<CalendarFilters>({
    query: '',
    campaignId: '',
    channel: 'all',
    timing: 'all',
    ownership: 'mine',
  })
  const [focusedCampaignId, setFocusedCampaignId] = useState('')
  const [calendarView, setCalendarView] = useState<CalendarView>('weekly')
  const [calendarCursorDate, setCalendarCursorDate] = useState(() => toDateInputValue(new Date()))
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [campaignDetailDraft, setCampaignDetailDraft] = useState<CampaignDetailDraft>(() => buildCampaignDetailDraft(null))
  const [campaignDetailSaving, setCampaignDetailSaving] = useState(false)
  const [contentFocusId, setContentFocusId] = useState('')
  const [contentPanelId, setContentPanelId] = useState('')
  const [contentPanelDraftBody, setContentPanelDraftBody] = useState('')
  const [contentPanelSaving, setContentPanelSaving] = useState(false)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [reminders, setReminders] = useState<CampaignReminder[]>([])
  const [reminderEditor, setReminderEditor] = useState<ReminderEditorDraft>({
    contentId: '',
    userId: appUser?.user_id || '',
    reminderType: 'in-app',
    scheduledFor: '',
  })
  const [journeyNodeDrafts, setJourneyNodeDrafts] = useState<CampaignJourneyNodeDraft[]>([createDefaultJourneyNodeDraft('action')])
  const [journeyGraphMeta, setJourneyGraphMeta] = useState<CampaignJourneyGraph | null>(null)
  const [journeySaving, setJourneySaving] = useState(false)
  const [journeyTimelineEntries, setJourneyTimelineEntries] = useState<CampaignJourneyTimelineEntry[]>([])
  const [journeyTimelineLoading, setJourneyTimelineLoading] = useState(false)
  const [journeyTimelineOffset, setJourneyTimelineOffset] = useState(0)
  const [journeyTimelineHasMore, setJourneyTimelineHasMore] = useState(false)
  const [journeyTimelineFilters, setJourneyTimelineFilters] = useState<CampaignJourneyTimelineFilters>({
    startDate: '',
    endDate: '',
    nodeType: '',
    branchOutcome: '',
  })
  const [journeyTimelineGeneratedAt, setJourneyTimelineGeneratedAt] = useState('')
  const [highlightedJourneyNodeId, setHighlightedJourneyNodeId] = useState('')
  const [planningBoardDraft, setPlanningBoardDraft] = useState<CampaignPlanningBoardDraft>({
    objective: '',
    targetAudience: '',
    channelMix: '',
    cta: '',
    successMetrics: '',
    status: 'draft',
  })
  const [planningBoardSaving, setPlanningBoardSaving] = useState(false)
  const [focusItems, setFocusItems] = useState<CampaignFocusItem[]>([])
  const [focusItemDraft, setFocusItemDraft] = useState<CampaignFocusItemDraft>(createDefaultFocusItemDraft())
  const [focusItemSaving, setFocusItemSaving] = useState(false)

  const [campaignDraft, setCampaignDraft] = useState({
    name: '',
    targetAudience: '',
    primaryCta: '',
    startDate: '',
    endDate: '',
    cadencePreset: 'none' as CampaignCadencePreset,
    status: 'draft' as CampaignRecord['status'],
  })

  const [contentDraft, setContentDraft] = useState({
    title: '',
    body: '',
    topic: '',
    contentType: 'linkedin-post' as CampaignContentItem['content_type'],
    campaignId: '',
  })
  const [assetDraftByContentId, setAssetDraftByContentId] = useState<Record<string, { title: string; url: string }>>({})
  const [postUrlDraftByContentId, setPostUrlDraftByContentId] = useState<Record<string, string>>({})
  const [scheduleDraftByContentId, setScheduleDraftByContentId] = useState<Record<string, string>>({})
  const [jobRunning, setJobRunning] = useState(false)
  const [jobRunMessage, setJobRunMessage] = useState<string | null>(null)
  const [jobRunDetails, setJobRunDetails] = useState<CampaignJobsRunResult | null>(null)
  const campaignDateError = useMemo(() => {
    if (!campaignDraft.startDate || !campaignDraft.endDate) return null
    if (campaignDraft.startDate <= campaignDraft.endDate) return null
    return 'Campaign start date must be on or before end date.'
  }, [campaignDraft.endDate, campaignDraft.startDate])

  const campaignNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const campaign of campaigns) map.set(campaign.id, campaign.name)
    return map
  }, [campaigns])

  const campaignOptions = useMemo(
    () => campaigns.map(campaign => ({ value: campaign.id, label: campaign.name })),
    [campaigns],
  )

  const selectedCampaign = useMemo(
    () => campaigns.find(campaign => campaign.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId],
  )

  const selectedCampaignContent = useMemo(
    () => (selectedCampaign ? contentItems.filter(item => item.campaign_id === selectedCampaign.id) : []),
    [contentItems, selectedCampaign],
  )

  const selectedCampaignContentByStatus = useMemo(() => ({
    draft: selectedCampaignContent.filter(item => item.status === 'draft'),
    needs_review: selectedCampaignContent.filter(item => item.status === 'needs_review'),
    unclaimed: selectedCampaignContent.filter(item => item.status === 'unclaimed'),
    claimed: selectedCampaignContent.filter(item => item.status === 'claimed'),
    posted: selectedCampaignContent.filter(item => item.status === 'posted'),
  }), [selectedCampaignContent])

  const selectedCampaignLifecycleGroups = useMemo(() => ([
    { key: 'draft', label: 'Draft', items: selectedCampaignContentByStatus.draft },
    { key: 'needs_review', label: 'Needs Review', items: selectedCampaignContentByStatus.needs_review },
    { key: 'unclaimed', label: 'Unclaimed', items: selectedCampaignContentByStatus.unclaimed },
    { key: 'claimed', label: 'Claimed', items: selectedCampaignContentByStatus.claimed },
    { key: 'posted', label: 'Posted', items: selectedCampaignContentByStatus.posted },
  ]), [selectedCampaignContentByStatus])

  const selectedCampaignUpcomingClaimed = useMemo(
    () => selectedCampaignContentByStatus.claimed
      .filter(item => !!item.scheduled_for)
      .sort((left, right) => new Date(left.scheduled_for || 0).getTime() - new Date(right.scheduled_for || 0).getTime())
      .slice(0, 5),
    [selectedCampaignContentByStatus.claimed],
  )

  const selectedCampaignRecentPosted = useMemo(
    () => selectedCampaignContentByStatus.posted
      .sort((left, right) => new Date(right.posted_at || right.updated_at || 0).getTime() - new Date(left.posted_at || left.updated_at || 0).getTime())
      .slice(0, 5),
    [selectedCampaignContentByStatus.posted],
  )

  const selectedCampaignActivity = useMemo(() => {
    if (!selectedCampaign) return []
    const contentIdSet = new Set(selectedCampaignContent.map(item => item.id))
    return activityLogs
      .filter(entry => {
        if (entry.entity_type === 'campaign' && entry.entity_id === selectedCampaign.id) return true
        if (entry.entity_type === 'campaign-content' && contentIdSet.has(entry.entity_id)) return true
        const metadataCampaignId = typeof entry.metadata?.campaign_id === 'string' ? entry.metadata.campaign_id : ''
        return metadataCampaignId === selectedCampaign.id
      })
      .slice(0, 12)
  }, [activityLogs, selectedCampaign, selectedCampaignContent])

  const campaignDetailDateError = useMemo(() => {
    if (!campaignDetailDraft.startDate || !campaignDetailDraft.endDate) return null
    if (campaignDetailDraft.startDate <= campaignDetailDraft.endDate) return null
    return 'Campaign start date must be on or before end date.'
  }, [campaignDetailDraft.endDate, campaignDetailDraft.startDate])

  const campaignDetailDirty = useMemo(() => {
    if (!selectedCampaign) return false
    const selectedKeywords = Array.isArray(selectedCampaign.keywords) ? selectedCampaign.keywords.join(', ').trim() : ''
    const currentKeywords = campaignDetailDraft.keywords.trim()
    return (
      campaignDetailDraft.name.trim() !== (selectedCampaign.name || '')
      || campaignDetailDraft.description.trim() !== (selectedCampaign.description || '')
      || campaignDetailDraft.offerDefinition.trim() !== (selectedCampaign.offer_definition || '')
      || campaignDetailDraft.targetAudience.trim() !== (selectedCampaign.target_audience || '')
      || campaignDetailDraft.primaryCta.trim() !== (selectedCampaign.primary_cta || '')
      || campaignDetailDraft.startDate !== (selectedCampaign.start_date || '')
      || campaignDetailDraft.endDate !== (selectedCampaign.end_date || '')
      || campaignDetailDraft.status !== selectedCampaign.status
      || campaignDetailDraft.cadencePreset !== getCadencePresetFromRule(selectedCampaign.cadence_rule)
      || currentKeywords !== selectedKeywords
    )
  }, [campaignDetailDraft, selectedCampaign])

  useEffect(() => {
    if (!focusedCampaignId) return
    if (campaigns.some(campaign => campaign.id === focusedCampaignId)) return
    setFocusedCampaignId('')
  }, [campaigns, focusedCampaignId])

  useEffect(() => {
    if (campaigns.length === 0) {
      if (selectedCampaignId) setSelectedCampaignId('')
      return
    }
    if (selectedCampaignId && campaigns.some(campaign => campaign.id === selectedCampaignId)) return
    setSelectedCampaignId(campaigns[0].id)
  }, [campaigns, selectedCampaignId])

  useEffect(() => {
    setCampaignDetailDraft(buildCampaignDetailDraft(selectedCampaign))
  }, [selectedCampaign])

  useEffect(() => {
    const graph = parseJourneyGraphFromCampaign(selectedCampaign)
    setJourneyGraphMeta(graph)
    if (graph?.nodes.length) {
      setJourneyNodeDrafts(graph.nodes.map(nodeDraftFromNode))
      return
    }
    setJourneyNodeDrafts([createDefaultJourneyNodeDraft('action')])
    setPlanningBoardDraft(parsePlanningBoardDraft(selectedCampaign))
    setFocusItems(parseFocusItems(selectedCampaign))
    setFocusItemDraft(createDefaultFocusItemDraft())
  }, [selectedCampaign])

  useEffect(() => {
    if (!appUser?.user_id) return
    setReminderEditor(previous => (
      previous.userId
        ? previous
        : { ...previous, userId: appUser.user_id }
    ))
  }, [appUser?.user_id])

  useEffect(() => {
    if (!infoMessage) return
    const timer = window.setTimeout(() => setInfoMessage(null), 2800)
    return () => window.clearTimeout(timer)
  }, [infoMessage])

  const contentPanelItem = useMemo(
    () => contentItems.find(item => item.id === contentPanelId) || null,
    [contentItems, contentPanelId],
  )
  const contentPanelActivity = useMemo(() => {
    if (!contentPanelItem) return []
    return activityLogs
      .filter(log => log.entity_type === 'campaign-content' && log.entity_id === contentPanelItem.id)
      .slice(0, 8)
  }, [activityLogs, contentPanelItem])
  const contentPanelReviewThread = useMemo(() => {
    if (!contentPanelItem) return []
    return contentPanelActivity
      .filter(log => /review|approve|reject|submit/i.test(log.action_type))
      .slice(0, 6)
  }, [contentPanelActivity, contentPanelItem])
  const contentPanelMissingMetadata = useMemo(() => {
    if (!contentPanelItem) return []
    const missing: string[] = []
    if (!contentPanelItem.title?.trim()) missing.push('title')
    if (!contentPanelItem.topic?.trim()) missing.push('topic')
    if (!contentPanelItem.body?.trim()) missing.push('body')
    return missing
  }, [contentPanelItem])
  const contentPanelIsOverdue = useMemo(() => {
    if (!contentPanelItem?.scheduled_for) return false
    if (contentPanelItem.status !== 'claimed') return false
    return new Date(contentPanelItem.scheduled_for).getTime() < Date.now()
  }, [contentPanelItem])
  useEffect(() => {
    if (!contentPanelItem) {
      setContentPanelDraftBody('')
      return
    }
    setContentPanelDraftBody(contentPanelItem.body || '')
  }, [contentPanelItem])

  useEffect(() => {
    if (!contentPanelId) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setContentPanelId('')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [contentPanelId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.sessionStorage.getItem(REPORT_FILTERS_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as {
        draft?: CampaignReportFilters
        applied?: CampaignReportFilters
      }
      if (parsed.draft) setReportFiltersDraft(parsed.draft)
      if (parsed.applied) setReportFiltersApplied(parsed.applied)
    } catch {
      // ignore storage parse failures
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(REPORT_FILTERS_STORAGE_KEY, JSON.stringify({
      draft: reportFiltersDraft,
      applied: reportFiltersApplied,
    }))
  }, [reportFiltersApplied, reportFiltersDraft])

  const sortedReviewQueue = useMemo(() => {
    const now = Date.now()
    const baseRows = contentItems.filter(item => {
      const isChangesRequested = item.status === 'draft' && !!item.rejection_reason
      const isApprovedUnscheduled = item.status === 'unclaimed' && !item.scheduled_for
      const isOverdue = item.status === 'claimed' && !!item.scheduled_for && new Date(item.scheduled_for).getTime() < now

      if (reviewQueueFilter === 'needs-review') return item.status === 'needs_review'
      if (reviewQueueFilter === 'unclaimed') return item.status === 'unclaimed'
      if (reviewQueueFilter === 'assigned-to-me') return item.status === 'claimed' && item.posting_owner_id === appUser?.user_id
      if (reviewQueueFilter === 'changes-requested') return isChangesRequested
      if (reviewQueueFilter === 'approved-unscheduled') return isApprovedUnscheduled
      if (reviewQueueFilter === 'overdue') return isOverdue

      return (
        item.status === 'needs_review'
        || item.status === 'unclaimed'
        || item.status === 'claimed'
        || isChangesRequested
      )
    })

    const rows = [...baseRows]
    rows.sort((left, right) => {
      const leftOverdue = left.status === 'claimed' && !!left.scheduled_for && new Date(left.scheduled_for).getTime() < now
      const rightOverdue = right.status === 'claimed' && !!right.scheduled_for && new Date(right.scheduled_for).getTime() < now
      if (leftOverdue && !rightOverdue) return -1
      if (!leftOverdue && rightOverdue) return 1

      if (reviewQueueSort === 'campaign') {
        const leftCampaign = (left.campaign_id ? campaignNameById.get(left.campaign_id) : '') || 'Unassigned'
        const rightCampaign = (right.campaign_id ? campaignNameById.get(right.campaign_id) : '') || 'Unassigned'
        return leftCampaign.localeCompare(rightCampaign) || left.title.localeCompare(right.title)
      }
      if (reviewQueueSort === 'topic') {
        return left.topic.localeCompare(right.topic) || left.title.localeCompare(right.title)
      }
      const leftCreated = new Date(left.created_at || 0).getTime()
      const rightCreated = new Date(right.created_at || 0).getTime()
      if (reviewQueueSort === 'newest') return rightCreated - leftCreated
      return leftCreated - rightCreated
    })
    return rows
  }, [appUser?.user_id, campaignNameById, contentItems, reviewQueueFilter, reviewQueueSort])

  const reviewQueueNeedsReviewRows = useMemo(
    () => sortedReviewQueue.filter(item => item.status === 'needs_review'),
    [sortedReviewQueue],
  )

  const selectedReviewIds = useMemo(
    () => reviewQueueNeedsReviewRows.filter(item => reviewSelectedById[item.id]).map(item => item.id),
    [reviewQueueNeedsReviewRows, reviewSelectedById],
  )

  const queueDraft = useMemo(
    () => contentItems.filter(item => item.status === 'draft'),
    [contentItems],
  )

  const queueUnclaimed = useMemo(
    () => contentItems.filter(item => item.status === 'unclaimed'),
    [contentItems],
  )

  const myClaimed = useMemo(
    () => contentItems.filter(item => item.status === 'claimed' && item.posting_owner_id === appUser?.user_id),
    [appUser?.user_id, contentItems],
  )

  const allClaimed = useMemo(
    () => contentItems.filter(item => item.status === 'claimed'),
    [contentItems],
  )

  const calendarChannelOptions = useMemo(() => {
    const channels = new Set<string>()
    const source = calendarFilters.ownership === 'mine' ? myClaimed : allClaimed
    for (const item of source) {
      const channel = (item.intended_channel || '').trim()
      if (!channel) continue
      channels.add(channel)
    }
    return [...channels].sort((left, right) => left.localeCompare(right))
  }, [allClaimed, calendarFilters.ownership, myClaimed])

  const postedContent = useMemo(
    () => contentItems.filter(item => item.status === 'posted'),
    [contentItems],
  )

  const campaignStatsById = useMemo(() => {
    const map = new Map<string, {
      draft: number
      needsReview: number
      unclaimed: number
      claimed: number
      posted: number
      cadenceLabel: string
      scheduledThisWeek: number
      openSlotsThisWeek: number | null
      nextOpenSlotDate: string | null
    }>()

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const endOfWeekWindow = new Date(startOfToday)
    endOfWeekWindow.setDate(endOfWeekWindow.getDate() + 6)
    endOfWeekWindow.setHours(23, 59, 59, 999)

    for (const campaign of campaigns) {
      const relatedRows = contentItems.filter(item => item.campaign_id === campaign.id)
      const cadence = normalizeCadence(campaign.cadence_rule)
      const scheduledByDay = new Set<string>()
      let scheduledThisWeek = 0

      for (const item of relatedRows) {
        if (!item.scheduled_for) continue
        if (item.status !== 'claimed' && item.status !== 'posted') continue
        const scheduledAt = new Date(item.scheduled_for)
        if (Number.isNaN(scheduledAt.getTime())) continue
        if (scheduledAt < startOfToday || scheduledAt > endOfWeekWindow) continue
        if (!dayWithinRange(scheduledAt, campaign.start_date, campaign.end_date)) continue
        scheduledThisWeek += 1
        scheduledByDay.add(scheduledAt.toISOString().slice(0, 10))
      }

      const openSlotsThisWeek = cadence.postsPerWeek != null
        ? Math.max(cadence.postsPerWeek - scheduledThisWeek, 0)
        : null
      const nextOpenSlotDate = openSlotsThisWeek && openSlotsThisWeek > 0
        ? resolveNextOpenSlotDate({
          campaign,
          preferredWeekdays: cadence.preferredWeekdays,
          scheduledByDay,
        })?.toLocaleDateString() || null
        : null

      map.set(campaign.id, {
        draft: relatedRows.filter(item => item.status === 'draft').length,
        needsReview: relatedRows.filter(item => item.status === 'needs_review').length,
        unclaimed: relatedRows.filter(item => item.status === 'unclaimed').length,
        claimed: relatedRows.filter(item => item.status === 'claimed').length,
        posted: relatedRows.filter(item => item.status === 'posted').length,
        cadenceLabel: cadence.label,
        scheduledThisWeek,
        openSlotsThisWeek,
        nextOpenSlotDate,
      })
    }

    return map
  }, [campaigns, contentItems])

  const selectedCampaignStats = useMemo(
    () => (selectedCampaign ? campaignStatsById.get(selectedCampaign.id) || null : null),
    [campaignStatsById, selectedCampaign],
  )
  const planningBoardCompleteness = useMemo(
    () => buildPlanningBoardCompleteness(planningBoardDraft),
    [planningBoardDraft],
  )
  const focusTotals = useMemo(() => {
    const impressions = focusItems.reduce((total, item) => total + item.impressions, 0)
    const conversions = focusItems.reduce((total, item) => total + item.conversions, 0)
    const conversionRate = impressions > 0 ? (conversions / impressions) * 100 : 0
    return { impressions, conversions, conversionRate }
  }, [focusItems])
  const journeyNodeOptions = useMemo(
    () => journeyNodeDrafts
      .map(node => ({ id: node.id.trim(), title: node.title.trim() }))
      .filter(node => node.id.length > 0),
    [journeyNodeDrafts],
  )

  const capabilityMatrix = useMemo(() => ({
    canReview: isAdmin,
    canAdminOverride: isAdmin,
    canRunJobs: isAdmin,
    canEditOwnDraft: (item: CampaignContentItem) => item.status === 'draft' && item.created_by === appUser?.user_id,
    canReleaseClaim: (item: CampaignContentItem) => item.status === 'claimed' && (isAdmin || item.posting_owner_id === appUser?.user_id),
    canClaim: (item: CampaignContentItem) => item.status === 'unclaimed',
    canReassignToMe: (item: CampaignContentItem) => isAdmin && item.status === 'claimed' && item.posting_owner_id !== appUser?.user_id,
  }), [appUser?.user_id, isAdmin])
  const contentPanelPrimaryAction = useMemo(() => {
    if (!contentPanelItem) return 'No action'
    if (contentPanelItem.status === 'draft') {
      return contentPanelItem.created_by === appUser?.user_id ? 'Next: Submit for Review' : 'Awaiting author update'
    }
    if (contentPanelItem.status === 'needs_review') {
      return isAdmin ? 'Next: Approve or Request Changes' : 'Awaiting reviewer decision'
    }
    if (contentPanelItem.status === 'unclaimed') {
      return 'Next: Claim and schedule'
    }
    if (contentPanelItem.status === 'claimed') {
      return (isAdmin || contentPanelItem.posting_owner_id === appUser?.user_id)
        ? 'Next: Post or release claim'
        : 'Awaiting posting owner'
    }
    if (contentPanelItem.status === 'posted') return 'Posted'
    return 'No action'
  }, [appUser?.user_id, contentPanelItem, isAdmin])


  const focusedCampaignDensity = useMemo(() => {
    const focusedCampaign = campaigns.find(campaign => campaign.id === focusedCampaignId) || null
    if (!focusedCampaign) {
      return {
        campaign: null,
        dayRows: [] as CampaignDensityDay[],
        totalExpected: 0,
        totalScheduled: 0,
        totalMissed: 0,
        totalOpen: 0,
      }
    }

    const relatedRows = contentItems.filter(item => item.campaign_id === focusedCampaign.id)
    const cadence = normalizeCadence(focusedCampaign.cadence_rule)
    const dayRows: CampaignDensityDay[] = []
    const now = Date.now()
    const windowStart = new Date()
    windowStart.setHours(0, 0, 0, 0)

    const expectedByDayKey = new Map<string, number>()
    if (cadence.postsPerWeek || (cadence.preferredWeekdays && cadence.preferredWeekdays.length > 0)) {
      for (let weekOffset = 0; weekOffset <= 7; weekOffset += 7) {
        const weekStart = addDays(startOfWeek(windowStart), weekOffset)
        const weekCandidateDays: Date[] = []
        for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
          const day = addDays(weekStart, dayOffset)
          if (day < windowStart || day >= addDays(windowStart, 14)) continue
          if (!dayWithinRange(day, focusedCampaign.start_date, focusedCampaign.end_date)) continue
          if (cadence.preferredWeekdays && cadence.preferredWeekdays.length > 0 && !cadence.preferredWeekdays.includes(day.getDay())) continue
          weekCandidateDays.push(day)
        }
        if (weekCandidateDays.length === 0) continue
        const weeklyTarget = cadence.postsPerWeek
          ? Math.min(cadence.postsPerWeek, weekCandidateDays.length)
          : weekCandidateDays.length
        for (let index = 0; index < weeklyTarget; index += 1) {
          const key = weekCandidateDays[index].toISOString().slice(0, 10)
          expectedByDayKey.set(key, (expectedByDayKey.get(key) || 0) + 1)
        }
      }
    }

    let totalExpected = 0
    let totalScheduled = 0
    let totalMissed = 0
    let totalOpen = 0

    for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
      const date = addDays(windowStart, dayOffset)
      const dateKey = date.toISOString().slice(0, 10)
      const inRange = dayWithinRange(date, focusedCampaign.start_date, focusedCampaign.end_date)
      const expectedCount = inRange ? (expectedByDayKey.get(dateKey) || 0) : 0

      const scheduledRows = relatedRows.filter(item => {
        if (!item.scheduled_for) return false
        if (item.status !== 'claimed' && item.status !== 'posted') return false
        return item.scheduled_for.slice(0, 10) === dateKey
      })
      const postedCount = relatedRows.filter(item => item.status === 'posted' && item.posted_at && item.posted_at.slice(0, 10) === dateKey).length
      const missedCount = relatedRows.filter(item => item.status === 'claimed' && item.scheduled_for && item.scheduled_for.slice(0, 10) === dateKey && new Date(item.scheduled_for).getTime() < now).length
      const scheduledCount = scheduledRows.length
      const openCount = Math.max(expectedCount - scheduledCount, 0)

      const status: CampaignDensityDay['status'] = !inRange
        ? 'off'
        : missedCount > 0
          ? 'missed'
          : scheduledCount > 0
            ? 'filled'
            : openCount > 0
              ? 'open'
              : 'off'

      if (expectedCount > 0) totalExpected += expectedCount
      totalScheduled += scheduledCount
      totalMissed += missedCount
      totalOpen += openCount

      dayRows.push({
        dateKey,
        dateLabel: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        weekdayLabel: date.toLocaleDateString(undefined, { weekday: 'short' }),
        scheduledCount,
        expectedCount,
        openCount,
        missedCount,
        postedCount,
        status,
      })
    }

    return {
      campaign: focusedCampaign,
      dayRows,
      totalExpected,
      totalScheduled,
      totalMissed,
      totalOpen,
    }
  }, [campaigns, contentItems, focusedCampaignId])

  const filteredContentItems = useMemo(() => {
    const query = contentLibraryFilters.query.trim().toLowerCase()
    return contentItems.filter(item => {
      if (contentLibraryFilters.status !== 'all' && item.status !== contentLibraryFilters.status) return false
      if (contentLibraryFilters.contentType !== 'all' && item.content_type !== contentLibraryFilters.contentType) return false
      if (contentLibraryFilters.campaignId && item.campaign_id !== contentLibraryFilters.campaignId) return false
      if (contentLibraryFilters.ownership === 'created-by-me' && item.created_by !== appUser?.user_id) return false
      if (contentLibraryFilters.ownership === 'claimed-by-me' && item.posting_owner_id !== appUser?.user_id) return false
      if (contentLibraryFilters.ownership === 'unclaimed' && item.status !== 'unclaimed') return false
      if (!query) return true
      const campaignLabel = item.campaign_id ? (campaignNameById.get(item.campaign_id) || '') : ''
      const haystack = `${item.title} ${item.topic} ${item.body} ${campaignLabel}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [appUser?.user_id, campaignNameById, contentItems, contentLibraryFilters.campaignId, contentLibraryFilters.contentType, contentLibraryFilters.ownership, contentLibraryFilters.query, contentLibraryFilters.status])

  const contentActionSummary = useMemo(() => ({
    unclaimed: filteredContentItems.filter(item => item.status === 'unclaimed').length,
    myClaimed: filteredContentItems.filter(item => item.status === 'claimed' && item.posting_owner_id === appUser?.user_id).length,
    myDrafts: filteredContentItems.filter(item => item.status === 'draft' && item.created_by === appUser?.user_id).length,
    reviewQueue: filteredContentItems.filter(item => item.status === 'needs_review').length,
  }), [appUser?.user_id, filteredContentItems])

  const contentLibraryVisibleItems = useMemo(() => {
    const rows = filteredContentItems.filter(item => {
      if (contentLibraryViewMode === 'all') return true
      if (item.status === 'posted') return false
      if (item.status === 'unclaimed') return true
      if (item.status === 'claimed' && item.posting_owner_id === appUser?.user_id) return true
      if (item.status === 'draft') return true
      if (item.status === 'needs_review' && isAdmin) return true
      return false
    })

    const rank = (item: CampaignContentItem) => {
      if (contentLibraryViewMode === 'all') return 50
      if (item.status === 'unclaimed') return 0
      if (item.status === 'claimed' && item.posting_owner_id === appUser?.user_id) return 1
      if (item.status === 'needs_review' && isAdmin) return 2
      if (item.status === 'draft' && item.created_by === appUser?.user_id) return 3
      if (item.status === 'draft') return 3
      if (item.status === 'claimed') return 5
      return 6
    }

    return rows.sort((left, right) => {
      const rankDelta = rank(left) - rank(right)
      if (rankDelta !== 0) return rankDelta
      const updatedDelta = new Date(right.updated_at || 0).getTime() - new Date(left.updated_at || 0).getTime()
      if (updatedDelta !== 0) return updatedDelta
      return left.title.localeCompare(right.title)
    })
  }, [appUser?.user_id, contentLibraryViewMode, filteredContentItems, isAdmin])

  const activeContentFilterChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onRemove: () => void }> = []

    if (contentLibraryViewMode === 'action') {
      chips.push({
        id: 'view-mode-action',
        label: 'View: Action Queue',
        onRemove: () => setContentLibraryViewMode('all'),
      })
    }
    if (contentLibraryFilters.query.trim()) {
      chips.push({
        id: 'query',
        label: `Search: ${contentLibraryFilters.query.trim()}`,
        onRemove: () => setContentLibraryFilters(prev => ({ ...prev, query: '' })),
      })
    }
    if (contentLibraryFilters.status !== 'all') {
      chips.push({
        id: 'status',
        label: `Status: ${contentLibraryFilters.status}`,
        onRemove: () => setContentLibraryFilters(prev => ({ ...prev, status: 'all' })),
      })
    }
    if (contentLibraryFilters.contentType !== 'all') {
      chips.push({
        id: 'content-type',
        label: `Type: ${contentLibraryFilters.contentType}`,
        onRemove: () => setContentLibraryFilters(prev => ({ ...prev, contentType: 'all' })),
      })
    }
    if (contentLibraryFilters.campaignId) {
      chips.push({
        id: 'campaign',
        label: `Campaign: ${campaignNameById.get(contentLibraryFilters.campaignId) || contentLibraryFilters.campaignId}`,
        onRemove: () => setContentLibraryFilters(prev => ({ ...prev, campaignId: '' })),
      })
    }
    if (contentLibraryFilters.ownership !== 'all') {
      chips.push({
        id: 'ownership',
        label: `Ownership: ${contentLibraryFilters.ownership}`,
        onRemove: () => setContentLibraryFilters(prev => ({ ...prev, ownership: 'all' })),
      })
    }

    return chips
  }, [campaignNameById, contentLibraryFilters.campaignId, contentLibraryFilters.contentType, contentLibraryFilters.ownership, contentLibraryFilters.query, contentLibraryFilters.status, contentLibraryViewMode])

  const activeCalendarFilterChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onRemove: () => void }> = []
    if (calendarFilters.query.trim()) {
      chips.push({
        id: 'query',
        label: `Search: ${calendarFilters.query.trim()}`,
        onRemove: () => setCalendarFilters(previous => ({ ...previous, query: '' })),
      })
    }
    if (calendarFilters.campaignId) {
      chips.push({
        id: 'campaign',
        label: `Campaign: ${campaignNameById.get(calendarFilters.campaignId) || calendarFilters.campaignId}`,
        onRemove: () => setCalendarFilters(previous => ({ ...previous, campaignId: '' })),
      })
    }
    if (calendarFilters.channel !== 'all') {
      chips.push({
        id: 'channel',
        label: `Channel: ${calendarFilters.channel}`,
        onRemove: () => setCalendarFilters(previous => ({ ...previous, channel: 'all' })),
      })
    }
    if (calendarFilters.ownership !== 'all') {
      chips.push({
        id: 'ownership',
        label: 'Ownership: mine',
        onRemove: () => setCalendarFilters(previous => ({ ...previous, ownership: 'all' })),
      })
    }
    if (calendarFilters.timing !== 'all') {
      chips.push({
        id: 'timing',
        label: `Timing: ${calendarFilters.timing}`,
        onRemove: () => setCalendarFilters(previous => ({ ...previous, timing: 'all' })),
      })
    }
    return chips
  }, [calendarFilters.campaignId, calendarFilters.channel, calendarFilters.ownership, calendarFilters.query, calendarFilters.timing, campaignNameById])

  const filteredMyClaimed = useMemo(() => {
    const query = calendarFilters.query.trim().toLowerCase()
    const now = Date.now()
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)
    const next7 = new Date(endOfToday)
    next7.setDate(next7.getDate() + 7)
    const source = calendarFilters.ownership === 'mine' ? myClaimed : allClaimed

    return source.filter(item => {
      if (calendarFilters.campaignId && item.campaign_id !== calendarFilters.campaignId) return false
      if (calendarFilters.channel !== 'all' && (item.intended_channel || '') !== calendarFilters.channel) return false

      const scheduledAt = item.scheduled_for ? new Date(item.scheduled_for).getTime() : null
      if (calendarFilters.timing === 'unscheduled' && item.scheduled_for) return false
      if (calendarFilters.timing === 'overdue') {
        if (!scheduledAt) return false
        if (scheduledAt >= now) return false
      }
      if (calendarFilters.timing === 'today') {
        if (!scheduledAt) return false
        if (scheduledAt < startOfToday.getTime() || scheduledAt > endOfToday.getTime()) return false
      }
      if (calendarFilters.timing === 'next-7') {
        if (!scheduledAt) return false
        if (scheduledAt < now || scheduledAt > next7.getTime()) return false
      }

      if (!query) return true
      const campaignLabel = item.campaign_id ? (campaignNameById.get(item.campaign_id) || '') : ''
      const haystack = `${item.title} ${item.topic} ${item.body} ${campaignLabel}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [
    allClaimed,
    calendarFilters.campaignId,
    calendarFilters.channel,
    calendarFilters.ownership,
    calendarFilters.query,
    calendarFilters.timing,
    campaignNameById,
    myClaimed,
  ])

  const calendarWindow = useMemo(() => {
    const parsedCursor = calendarCursorDate ? new Date(`${calendarCursorDate}T00:00:00`) : new Date()
    const cursor = Number.isNaN(parsedCursor.getTime()) ? new Date() : parsedCursor
    cursor.setHours(0, 0, 0, 0)

    if (calendarView === 'monthly') {
      const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      end.setHours(23, 59, 59, 999)
      return {
        start,
        end,
        label: start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      }
    }

    if (calendarView === 'weekly') {
      const start = startOfWeek(cursor)
      const end = endOfWeek(cursor)
      return {
        start,
        end,
        label: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
      }
    }

    const start = new Date(cursor)
    const end = addDays(start, 13)
    end.setHours(23, 59, 59, 999)
    return {
      start,
      end,
      label: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
    }
  }, [calendarCursorDate, calendarView])

  const calendarTimelineEntries = useMemo<CalendarTimelineEntry[]>(() => {
    const entries: CalendarTimelineEntry[] = []
    const now = Date.now()
    const query = calendarFilters.query.trim().toLowerCase()

    const withinWindow = (value: Date) => value >= calendarWindow.start && value <= calendarWindow.end
    const matchesCalendarBase = (item: CampaignContentItem) => {
      if (calendarFilters.campaignId && item.campaign_id !== calendarFilters.campaignId) return false
      if (calendarFilters.channel !== 'all' && (item.intended_channel || '') !== calendarFilters.channel) return false
      if (calendarFilters.ownership === 'mine' && item.posting_owner_id !== appUser?.user_id) return false
      if (!query) return true
      const haystack = `${item.title} ${item.topic} ${item.body}`.toLowerCase()
      return haystack.includes(query)
    }

    for (const item of filteredMyClaimed) {
      if (!item.scheduled_for) continue
      const startsAt = new Date(item.scheduled_for)
      if (Number.isNaN(startsAt.getTime())) continue
      if (!withinWindow(startsAt)) continue
      const dateKey = startsAt.toISOString().slice(0, 10)
      const isMissed = startsAt.getTime() < now
      entries.push({
        id: `claimed-${item.id}`,
        contentId: item.id,
        startsAt,
        dateKey,
        title: item.title,
        kind: isMissed ? 'missed' : 'claimed',
        campaignLabel: item.campaign_id ? (campaignNameById.get(item.campaign_id) || item.campaign_id) : 'Unassigned',
        channel: item.intended_channel || null,
        detail: isMissed ? 'Missed claimed post' : 'Claimed post',
      })
    }

    for (const item of postedContent) {
      if (!matchesCalendarBase(item)) continue
      const postedAt = item.posted_at || item.scheduled_for
      if (!postedAt) continue
      const startsAt = new Date(postedAt)
      if (Number.isNaN(startsAt.getTime())) continue
      if (!withinWindow(startsAt)) continue
      const dateKey = startsAt.toISOString().slice(0, 10)
      entries.push({
        id: `posted-${item.id}`,
        contentId: item.id,
        startsAt,
        dateKey,
        title: item.title,
        kind: 'posted',
        campaignLabel: item.campaign_id ? (campaignNameById.get(item.campaign_id) || item.campaign_id) : 'Unassigned',
        channel: item.intended_channel || null,
        detail: 'Posted',
      })
    }

    for (const campaign of campaigns) {
      if (calendarFilters.campaignId && campaign.id !== calendarFilters.campaignId) continue

      const cadence = normalizeCadence(campaign.cadence_rule)
      if (!cadence.postsPerWeek && (!cadence.preferredWeekdays || cadence.preferredWeekdays.length === 0)) continue

      const scheduledByDay = new Set<string>()
      for (const item of contentItems) {
        if (item.campaign_id !== campaign.id) continue
        if (item.status !== 'claimed' && item.status !== 'posted') continue
        if (!item.scheduled_for) continue
        if (calendarFilters.channel !== 'all' && (item.intended_channel || '') !== calendarFilters.channel) continue
        const scheduledAt = new Date(item.scheduled_for)
        if (Number.isNaN(scheduledAt.getTime())) continue
        if (!withinWindow(scheduledAt)) continue
        if (!dayWithinRange(scheduledAt, campaign.start_date, campaign.end_date)) continue
        scheduledByDay.add(scheduledAt.toISOString().slice(0, 10))
      }

      if (cadence.preferredWeekdays && cadence.preferredWeekdays.length > 0) {
        for (
          let cursor = new Date(calendarWindow.start);
          cursor <= calendarWindow.end;
          cursor = addDays(cursor, 1)
        ) {
          if (!dayWithinRange(cursor, campaign.start_date, campaign.end_date)) continue
          if (!cadence.preferredWeekdays.includes(cursor.getDay())) continue
          const dateKey = cursor.toISOString().slice(0, 10)
          if (scheduledByDay.has(dateKey)) continue
          entries.push({
            id: `open-slot-${campaign.id}-${dateKey}`,
            contentId: null,
            startsAt: new Date(cursor),
            dateKey,
            title: campaign.name,
            kind: 'open-slot',
            campaignLabel: campaign.name,
            channel: null,
            detail: 'Open slot',
          })
        }
        continue
      }

      if (!cadence.postsPerWeek) continue

      for (
        let weekStart = startOfWeek(calendarWindow.start);
        weekStart <= calendarWindow.end;
        weekStart = addDays(weekStart, 7)
      ) {
        const weekEnd = endOfWeek(weekStart)
        let scheduledCount = 0
        for (let idx = 0; idx < 7; idx += 1) {
          const day = addDays(weekStart, idx)
          if (day < calendarWindow.start || day > calendarWindow.end) continue
          if (!dayWithinRange(day, campaign.start_date, campaign.end_date)) continue
          const dateKey = day.toISOString().slice(0, 10)
          if (scheduledByDay.has(dateKey)) scheduledCount += 1
        }
        const openSlots = Math.max(cadence.postsPerWeek - scheduledCount, 0)
        if (openSlots <= 0) continue
        const marker = weekStart < calendarWindow.start ? calendarWindow.start : weekStart
        if (marker > calendarWindow.end) continue
        const markerDate = new Date(marker)
        const dateKey = markerDate.toISOString().slice(0, 10)
        entries.push({
          id: `open-slot-${campaign.id}-week-${dateKey}`,
          contentId: null,
          startsAt: markerDate,
          dateKey,
          title: campaign.name,
          kind: 'open-slot',
          campaignLabel: campaign.name,
          channel: null,
          detail: `${openSlots} open slot${openSlots === 1 ? '' : 's'} this week`,
        })
      }
    }

    const rankByKind: Record<CalendarTimelineKind, number> = {
      missed: 0,
      claimed: 1,
      posted: 2,
      'open-slot': 3,
    }
    return entries.sort((left, right) => {
      const timeDelta = left.startsAt.getTime() - right.startsAt.getTime()
      if (timeDelta !== 0) return timeDelta
      return rankByKind[left.kind] - rankByKind[right.kind]
    })
  }, [
    calendarFilters.campaignId,
    calendarFilters.channel,
    calendarFilters.ownership,
    calendarFilters.query,
    calendarWindow.end,
    calendarWindow.start,
    campaignNameById,
    campaigns,
    contentItems,
    filteredMyClaimed,
    postedContent,
    appUser?.user_id,
  ])

  const calendarTimelineGroups = useMemo(() => {
    const grouped = new Map<string, CalendarTimelineEntry[]>()
    for (const entry of calendarTimelineEntries) {
      const bucket = grouped.get(entry.dateKey) || []
      bucket.push(entry)
      grouped.set(entry.dateKey, bucket)
    }
    return [...grouped.entries()]
      .map(([dateKey, entries]) => ({
        dateKey,
        dateLabel: new Date(`${dateKey}T00:00:00`).toLocaleDateString(),
        entries,
      }))
      .sort((left, right) => left.dateKey.localeCompare(right.dateKey))
  }, [calendarTimelineEntries])

  const sortedMyClaimed = useMemo(() => {
    const rows = [...filteredMyClaimed]
    const now = Date.now()
    rows.sort((left, right) => {
      const leftMissing = !left.scheduled_for
      const rightMissing = !right.scheduled_for
      const leftTime = left.scheduled_for ? new Date(left.scheduled_for).getTime() : Number.POSITIVE_INFINITY
      const rightTime = right.scheduled_for ? new Date(right.scheduled_for).getTime() : Number.POSITIVE_INFINITY

      if (calendarSort === 'title') return left.title.localeCompare(right.title)
      if (leftMissing && !rightMissing) return 1
      if (!leftMissing && rightMissing) return -1
      if (calendarSort === 'latest') return rightTime - leftTime
      if (calendarSort === 'soonest') return leftTime - rightTime

      const leftOverdue = Number.isFinite(leftTime) && leftTime < now
      const rightOverdue = Number.isFinite(rightTime) && rightTime < now
      if (leftOverdue && !rightOverdue) return -1
      if (!leftOverdue && rightOverdue) return 1
      return leftTime - rightTime
    })
    return rows
  }, [calendarSort, filteredMyClaimed])

  const approvedUnscheduledRows = useMemo(
    () => contentItems
      .filter(item => item.status === 'unclaimed' && !item.scheduled_for)
      .filter(item => !calendarFilters.campaignId || item.campaign_id === calendarFilters.campaignId)
      .filter(item => calendarFilters.channel === 'all' || (item.intended_channel || '') === calendarFilters.channel)
      .sort((left, right) => {
        const leftUpdated = new Date(left.updated_at || 0).getTime()
        const rightUpdated = new Date(right.updated_at || 0).getTime()
        return rightUpdated - leftUpdated
      }),
    [calendarFilters.campaignId, calendarFilters.channel, contentItems],
  )

  const reminderRows = useMemo(() => {
    const now = Date.now()
    return reminders
      .map(reminder => {
        const content = contentItems.find(item => item.id === reminder.content_id) || null
        const campaignLabel = content?.campaign_id
          ? (campaignNameById.get(content.campaign_id) || content.campaign_id)
          : 'Unassigned'
        const dueAt = new Date(reminder.scheduled_for)
        const isOverdue = reminder.status === 'pending' && !Number.isNaN(dueAt.getTime()) && dueAt.getTime() < now
        return {
          reminder,
          content,
          campaignLabel,
          isOverdue,
        }
      })
      .sort((left, right) => new Date(left.reminder.scheduled_for).getTime() - new Date(right.reminder.scheduled_for).getTime())
  }, [campaignNameById, contentItems, reminders])

  const reminderAssignableUsers = useMemo(() => {
    const values = new Set<string>()
    if (appUser?.user_id) values.add(appUser.user_id)
    for (const row of contentItems) {
      if (row.created_by) values.add(row.created_by)
      if (row.posting_owner_id) values.add(row.posting_owner_id)
      if (row.reviewer_id) values.add(row.reviewer_id)
    }
    return [...values].sort((left, right) => left.localeCompare(right))
  }, [appUser?.user_id, contentItems])

  const assetsByContentId = useMemo(() => {
    const map = new Map<string, CampaignAsset[]>()
    for (const asset of assets) {
      if (!asset.content_id) continue
      const bucket = map.get(asset.content_id) || []
      bucket.push(asset)
      map.set(asset.content_id, bucket)
    }
    return map
  }, [assets])

  const reportFilteredContentItems = useMemo(() => {
    const startIso = reportFiltersApplied.startDate ? new Date(`${reportFiltersApplied.startDate}T00:00:00`).toISOString() : null
    const endIso = reportFiltersApplied.endDate ? new Date(`${reportFiltersApplied.endDate}T23:59:59.999`).toISOString() : null
    return contentItems.filter(item => {
      if (reportFiltersApplied.campaignId && item.campaign_id !== reportFiltersApplied.campaignId) return false
      if (reportFiltersApplied.contentType && item.content_type !== reportFiltersApplied.contentType) return false
      const createdAt = item.created_at || ''
      if (startIso && createdAt && createdAt < startIso) return false
      if (endIso && createdAt && createdAt > endIso) return false
      return true
    })
  }, [contentItems, reportFiltersApplied.campaignId, reportFiltersApplied.contentType, reportFiltersApplied.endDate, reportFiltersApplied.startDate])

  const localReportSummary = useMemo<CampaignReportSummary>(() => {
    const now = Date.now()
    const waitingReview = reportFilteredContentItems.filter(item => item.status === 'needs_review').length
    const unclaimed = reportFilteredContentItems.filter(item => item.status === 'unclaimed').length
    const claimed = reportFilteredContentItems.filter(item => item.status === 'claimed').length
    const posted = reportFilteredContentItems.filter(item => item.status === 'posted').length
    const submitted = waitingReview + unclaimed + claimed + posted
    const approved = unclaimed + claimed + posted
    const missed = reportFilteredContentItems.filter(item => {
      if (item.status !== 'claimed') return false
      if (!item.scheduled_for) return false
      return new Date(item.scheduled_for).getTime() < now
    }).length

    return {
      created_count: reportFilteredContentItems.length,
      submitted_count: submitted,
      approved_count: approved,
      claimed_count: claimed,
      posted_count: posted,
      missed_count: missed,
      unclaimed_count: unclaimed,
      waiting_review_count: waitingReview,
    }
  }, [reportFilteredContentItems])

  const localReportGroupings = useMemo<CampaignReportGroupings>(() => ({
    by_campaign: countReportGroupings(reportFilteredContentItems, item => item.campaign_id || 'unassigned'),
    by_topic: countReportGroupings(reportFilteredContentItems, item => item.topic || 'untagged'),
    by_user: countReportGroupings(reportFilteredContentItems, item => item.posting_owner_id || item.created_by || 'unknown'),
  }), [reportFilteredContentItems])

  const reportSummary = serverReportSummary || localReportSummary
  const reportGroupings = serverReportGroupings || localReportGroupings

  const setErrorFromException = useCallback((exception: unknown) => {
    if (isCampaignsSchemaMissing(exception)) {
      setSchemaMissing(true)
      setPolicyBlocked(false)
      setRefreshRecommended(false)
      setError('Campaign schema is not migrated yet. Run supabase/migrations/014_campaign_content_posting_foundation.sql.')
      return
    }
    const transitionMessage = campaignTransitionMessageFromError(exception)
    if (transitionMessage) {
      setSchemaMissing(false)
      setPolicyBlocked(false)
      setRefreshRecommended(Boolean(transitionMessage.refreshRecommended))
      setError(transitionMessage.message)
      return
    }
    if (isCampaignsAccessDenied(exception)) {
      setSchemaMissing(false)
      setPolicyBlocked(true)
      setRefreshRecommended(false)
      setError(CAMPAIGNS_ACCESS_POLICY_MESSAGE)
      return
    }
    setSchemaMissing(false)
    setPolicyBlocked(false)
    setRefreshRecommended(false)
    setError(exception instanceof Error ? exception.message : String(exception))
  }, [])

  const markMutationSuccess = useCallback((message?: string) => {
    setSyncState('ok')
    setRefreshRecommended(false)
    if (message) setInfoMessage(message)
  }, [])

  const loadData = useCallback(async () => {
    setSyncState('syncing')
    setError(null)
    setRefreshRecommended(false)
    setExportJobsLoading(true)
    try {
      const exportJobsPromise = appUser?.user_id
        ? listCampaignReportExports({
          actor: {
            user_id: appUser.user_id,
            user_email: appUser.email || '',
          },
          limit: 10,
        }).catch(() => [])
        : Promise.resolve([])

      const [campaignRows, contentRows, assetRows, reminderRows, jobs, assetsSupported] = await Promise.all([
        listCampaigns(),
        listCampaignContentItems(),
        listCampaignAssets(),
        listCampaignReminders().catch(() => []),
        exportJobsPromise,
        isCampaignAssetsTableAvailable().catch(() => false),
      ])
      setCampaigns(campaignRows)
      setContentItems(contentRows)
      setAssets(assetRows)
      setReminders(reminderRows)
      setExportJobs(jobs)
      setCampaignAssetsAvailable(assetsSupported)
      void listCampaignActivityLogs(300).then(setActivityLogs).catch(() => {})
      setSchemaMissing(false)
      setPolicyBlocked(false)
      setRefreshRecommended(false)
      setSyncState('ok')
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
    } finally {
      setExportJobsLoading(false)
      setLoading(false)
    }
  }, [
    appUser?.email,
    appUser?.user_id,
    setErrorFromException,
  ])

  const loadReportSummary = useCallback(async () => {
    if (!appUser?.user_id) {
      setServerReportSummary(null)
      setServerReportGroupings(null)
      return
    }

    setReportSummaryLoading(true)
    try {
      const report = await getCampaignReportSummary({
        actor: {
          user_id: appUser.user_id,
          user_email: appUser.email || '',
        },
        filters: {
          startDate: reportFiltersApplied.startDate || undefined,
          endDate: reportFiltersApplied.endDate || undefined,
          campaignId: reportFiltersApplied.campaignId || undefined,
          contentType: reportFiltersApplied.contentType || undefined,
        },
      })
      setServerReportSummary(report.summary)
      setServerReportGroupings(report.groupings)
    } catch {
      setServerReportSummary(null)
      setServerReportGroupings(null)
    } finally {
      setReportSummaryLoading(false)
    }
  }, [
    appUser?.email,
    appUser?.user_id,
    reportFiltersApplied.campaignId,
    reportFiltersApplied.contentType,
    reportFiltersApplied.endDate,
    reportFiltersApplied.startDate,
  ])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    void loadReportSummary()
  }, [loadReportSummary])

  useEffect(() => {
    setReviewSelectedById(previous => {
      const next: Record<string, boolean> = {}
      let changed = false
      for (const item of reviewQueueNeedsReviewRows) {
        if (!previous[item.id]) continue
        next[item.id] = true
      }
      const previousIds = Object.keys(previous).filter(id => previous[id])
      const nextIds = Object.keys(next)
      if (previousIds.length !== nextIds.length) changed = true
      if (!changed) {
        for (const id of previousIds) {
          if (!next[id]) {
            changed = true
            break
          }
        }
      }
      return changed ? next : previous
    })
  }, [reviewQueueNeedsReviewRows])

  useEffect(() => {
    if (!reviewBulkRejectModalOpen) return
    if (selectedReviewIds.length > 0) return
    setReviewBulkRejectModalOpen(false)
    setReviewBulkRejectReason('')
    setReviewBulkRejectError(null)
  }, [reviewBulkRejectModalOpen, selectedReviewIds.length])

  useEffect(() => {
    if (!reasonModalState) return
    const row = contentItems.find(item => item.id === reasonModalState.contentId)
    if (!row) {
      setReasonModalState(null)
      setReasonModalInput('')
      setReasonModalError(null)
      return
    }
    if (reasonModalState.mode === 'review-reject' && row.status !== 'needs_review') {
      setReasonModalState(null)
      setReasonModalInput('')
      setReasonModalError(null)
      return
    }
    if (reasonModalState.mode === 'content-unclaim' && row.status !== 'claimed') {
      setReasonModalState(null)
      setReasonModalInput('')
      setReasonModalError(null)
    }
  }, [contentItems, reasonModalState])

  useEffect(() => {
    if (!adminOverrideModalState) return
    const row = contentItems.find(item => item.id === adminOverrideModalState.contentId)
    if (!row) {
      setAdminOverrideModalState(null)
      setAdminOverrideAction('reset-draft')
      setAdminOverrideReason('')
      setAdminOverridePostUrl('')
      setAdminOverrideError(null)
    }
  }, [adminOverrideModalState, contentItems])

  const upsertContentItem = useCallback((row: CampaignContentItem) => {
    setServerReportSummary(null)
    setServerReportGroupings(null)
    setContentItems(previous => {
      const existingIdx = previous.findIndex(item => item.id === row.id)
      if (existingIdx < 0) return [row, ...previous]
      const clone = [...previous]
      clone[existingIdx] = row
      return clone
    })
  }, [])

  const upsertAsset = useCallback((row: CampaignAsset) => {
    setAssets(previous => {
      const existingIdx = previous.findIndex(asset => asset.id === row.id)
      if (existingIdx < 0) return [row, ...previous]
      const clone = [...previous]
      clone[existingIdx] = row
      return clone
    })
  }, [])

  const removeAssetFromState = useCallback((assetId: string) => {
    setAssets(previous => previous.filter(asset => asset.id !== assetId))
  }, [])

  const upsertReminder = useCallback((row: CampaignReminder) => {
    setReminders(previous => {
      const existingIdx = previous.findIndex(reminder => reminder.id === row.id)
      if (existingIdx < 0) return [row, ...previous]
      const clone = [...previous]
      clone[existingIdx] = row
      return clone
    })
  }, [])

  const removeReminderFromState = useCallback((reminderId: string) => {
    setReminders(previous => previous.filter(reminder => reminder.id !== reminderId))
  }, [])

  const createCampaignFromInput = useCallback(async (payload: {
    name: string
    targetAudience?: string
    primaryCta?: string
    startDate?: string | null
    endDate?: string | null
    cadenceRule?: Record<string, unknown> | null
    status: CampaignRecord['status']
  }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const created = await createCampaign({
        name: payload.name,
        target_audience: payload.targetAudience || '',
        primary_cta: payload.primaryCta || '',
        start_date: payload.startDate || null,
        end_date: payload.endDate || null,
        cadence_rule: payload.cadenceRule || null,
        status: payload.status,
        created_by: appUser.user_id,
      })
      setCampaigns(previous => [created, ...previous])
      setSelectedCampaignId(created.id)
      void listCampaignActivityLogs(300).then(setActivityLogs).catch(() => {})
      markMutationSuccess(`Campaign created: ${created.name}.`)
      return created
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, markMutationSuccess, setErrorFromException])

  const saveCampaignDetailFromInput = useCallback(async () => {
    if (!selectedCampaign || !appUser?.user_id) return
    if (!campaignDetailDraft.name.trim()) {
      setError('Campaign name is required.')
      return
    }
    if (campaignDetailDateError) {
      setError(campaignDetailDateError)
      return
    }

    const keywords = campaignDetailDraft.keywords
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)

    setCampaignDetailSaving(true)
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await updateCampaign(
        selectedCampaign.id,
        {
          name: campaignDetailDraft.name,
          description: campaignDetailDraft.description,
          offer_definition: campaignDetailDraft.offerDefinition,
          target_audience: campaignDetailDraft.targetAudience,
          primary_cta: campaignDetailDraft.primaryCta,
          keywords,
          start_date: campaignDetailDraft.startDate || null,
          end_date: campaignDetailDraft.endDate || null,
          cadence_rule: buildCadenceRuleFromPreset(campaignDetailDraft.cadencePreset, selectedCampaign.cadence_rule),
          status: campaignDetailDraft.status,
        },
        appUser.user_id,
      )
      setCampaigns(previous => previous.map(campaign => (
        campaign.id === updated.id ? updated : campaign
      )))
      setCampaignDetailDraft(buildCampaignDetailDraft(updated))
      void listCampaignActivityLogs(300).then(setActivityLogs).catch(() => {})
      markMutationSuccess('Campaign details saved.')
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
    } finally {
      setCampaignDetailSaving(false)
    }
  }, [
    appUser?.user_id,
    campaignDetailDateError,
    campaignDetailDraft,
    markMutationSuccess,
    selectedCampaign,
    setErrorFromException,
  ])

  const parseJourneyDraftNodes = useCallback((): CampaignJourneyNode[] => {
    return journeyNodeDrafts.map((draft, index) => {
      const id = draft.id.trim()
      const title = draft.title.trim()
      if (!id || !title) {
        throw new Error(`Journey node ${index + 1} requires both id and title.`)
      }
      let config: Record<string, unknown> = {}
      if (draft.configJson.trim()) {
        try {
          const parsed = JSON.parse(draft.configJson)
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Node config must be a JSON object.')
          }
          config = parsed as Record<string, unknown>
        } catch (error) {
          throw new Error(`Journey node ${id} has invalid JSON config: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
      const nextNodeIds = draft.nextNodeIdsCsv
        .split(',')
        .map(value => value.trim())
        .filter(Boolean)
      return {
        id,
        type: draft.type,
        title,
        config,
        next_node_ids: nextNodeIds,
        branch_positive_node_id: draft.branchPositiveNodeId.trim() || null,
        branch_negative_node_id: draft.branchNegativeNodeId.trim() || null,
      }
    })
  }, [journeyNodeDrafts])

  const loadJourneyTimelineFromInput = useCallback(async (offset = 0) => {
    if (!selectedCampaign || !appUser?.user_id) {
      setJourneyTimelineEntries([])
      setJourneyTimelineHasMore(false)
      return
    }

    setJourneyTimelineLoading(true)
    try {
      const response = await getCampaignJourneyTimeline({
        actor: {
          user_id: appUser.user_id,
          user_email: appUser.email || '',
        },
        campaignId: selectedCampaign.id,
        startDate: journeyTimelineFilters.startDate || '',
        endDate: journeyTimelineFilters.endDate || '',
        nodeType: journeyTimelineFilters.nodeType,
        branchOutcome: journeyTimelineFilters.branchOutcome,
        limit: 25,
        offset,
      })
      if (offset === 0) {
        setJourneyTimelineEntries(response.items)
      } else {
        setJourneyTimelineEntries(previous => [...previous, ...response.items])
      }
      setJourneyTimelineHasMore(response.hasMore)
      setJourneyTimelineGeneratedAt(response.generatedAt)
      setJourneyTimelineOffset(offset)
    } catch {
      if (offset === 0) setJourneyTimelineEntries([])
      setJourneyTimelineHasMore(false)
      setJourneyTimelineGeneratedAt('')
    } finally {
      setJourneyTimelineLoading(false)
    }
  }, [
    appUser?.email,
    appUser?.user_id,
    journeyTimelineFilters.branchOutcome,
    journeyTimelineFilters.endDate,
    journeyTimelineFilters.nodeType,
    journeyTimelineFilters.startDate,
    selectedCampaign,
  ])

  const saveJourneyGraphFromInput = useCallback(async () => {
    if (!selectedCampaign || !appUser?.user_id) return
    if (!isAdmin) {
      setError('Journey editing requires campaign-admin access.')
      return
    }
    setJourneySaving(true)
    setSyncState('syncing')
    setError(null)
    try {
      const nodes = parseJourneyDraftNodes()
      const result = await publishCampaignJourneyGraph({
        campaignId: selectedCampaign.id,
        actorUserId: appUser.user_id,
        nodes,
      })
      setCampaigns(previous => previous.map(campaign => (
        campaign.id === result.campaign.id ? result.campaign : campaign
      )))
      setJourneyGraphMeta(result.graph)
      void listCampaignActivityLogs(300).then(setActivityLogs).catch(() => {})
      markMutationSuccess(`Journey graph published as version ${result.graph.version}.`)
      void loadJourneyTimelineFromInput(0)
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
    } finally {
      setJourneySaving(false)
    }
  }, [
    appUser?.user_id,
    isAdmin,
    loadJourneyTimelineFromInput,
    markMutationSuccess,
    parseJourneyDraftNodes,
    selectedCampaign,
    setErrorFromException,
  ])

  const exportJourneyTimelineFromInput = useCallback(async (format: 'csv' | 'json') => {
    if (!selectedCampaign || !appUser?.user_id) return
    setSyncState('syncing')
    setError(null)
    try {
      const job = await requestCampaignJourneyTimelineExport({
        actor: {
          user_id: appUser.user_id,
          user_email: appUser.email || '',
        },
        campaignId: selectedCampaign.id,
        format,
        filters: {
          startDate: journeyTimelineFilters.startDate || '',
          endDate: journeyTimelineFilters.endDate || '',
          nodeType: journeyTimelineFilters.nodeType,
          branchOutcome: journeyTimelineFilters.branchOutcome,
        },
      })

      const downloaded = await downloadCampaignReportExport({
        actor: {
          user_id: appUser.user_id,
          user_email: appUser.email || '',
        },
        exportId: job.id,
      })
      const mime = downloaded.format === 'json'
        ? 'application/json;charset=utf-8'
        : 'text/csv;charset=utf-8'
      const blob = new Blob([downloaded.content], { type: mime })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = downloaded.filename || `campaign-journey-timeline-${new Date().toISOString().slice(0, 10)}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
      markMutationSuccess(`Journey timeline exported (${format.toUpperCase()}).`)
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
    }
  }, [
    appUser?.email,
    appUser?.user_id,
    journeyTimelineFilters.branchOutcome,
    journeyTimelineFilters.endDate,
    journeyTimelineFilters.nodeType,
    journeyTimelineFilters.startDate,
    markMutationSuccess,
    selectedCampaign,
    setErrorFromException,
  ])

  useEffect(() => {
    if (!selectedCampaign?.id) {
      setJourneyTimelineEntries([])
      setJourneyTimelineHasMore(false)
      setJourneyTimelineOffset(0)
      setJourneyTimelineGeneratedAt('')
      return
    }
    void loadJourneyTimelineFromInput(0)
  }, [loadJourneyTimelineFromInput, selectedCampaign?.id])

  const savePlanningBoardFromInput = useCallback(async () => {
    if (!selectedCampaign || !appUser?.user_id) return
    setPlanningBoardSaving(true)
    setSyncState('syncing')
    setError(null)
    try {
      const existingCadenceRule = selectedCampaign.cadence_rule
      const nextCadenceRule = buildCadenceRuleFromPreset(campaignDetailDraft.cadencePreset, {
        ...(existingCadenceRule && typeof existingCadenceRule === 'object' ? existingCadenceRule : {}),
        planning_board: {
          objective: planningBoardDraft.objective.trim(),
          target_audience: planningBoardDraft.targetAudience.trim(),
          channel_mix: planningBoardDraft.channelMix.trim(),
          cta: planningBoardDraft.cta.trim(),
          success_metrics: planningBoardDraft.successMetrics.trim(),
          status: planningBoardDraft.status,
          updated_at: new Date().toISOString(),
          updated_by: appUser.user_id,
        },
      })

      const updated = await updateCampaign(
        selectedCampaign.id,
        {
          cadence_rule: nextCadenceRule,
        },
        appUser.user_id,
      )
      setCampaigns(previous => previous.map(campaign => (
        campaign.id === updated.id ? updated : campaign
      )))
      await logCampaignActivityEvent({
        entity_type: 'campaign',
        entity_id: selectedCampaign.id,
        action_type: 'campaign-planning-board-snapshot',
        performed_by: appUser.user_id,
        metadata: {
          status: planningBoardDraft.status,
          completeness: buildPlanningBoardCompleteness(planningBoardDraft),
        },
      })
      void listCampaignActivityLogs(300).then(setActivityLogs).catch(() => {})
      markMutationSuccess('Planning board saved.')
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
    } finally {
      setPlanningBoardSaving(false)
    }
  }, [
    appUser?.user_id,
    campaignDetailDraft.cadencePreset,
    markMutationSuccess,
    planningBoardDraft,
    selectedCampaign,
    setErrorFromException,
  ])

  const createFocusItemFromInput = useCallback(async () => {
    if (!selectedCampaign || !appUser?.user_id) return
    const title = focusItemDraft.title.trim()
    const message = focusItemDraft.message.trim()
    const startAt = focusItemDraft.startAt ? localDateTimeToIso(focusItemDraft.startAt) : null
    const endAt = focusItemDraft.endAt ? localDateTimeToIso(focusItemDraft.endAt) : null
    if (!title || !message) {
      setError('Focus item title and message are required.')
      return
    }
    if (focusItemDraft.targetUrl.trim() && !isHttpUrl(focusItemDraft.targetUrl.trim())) {
      setError('Focus target URL must start with `http://` or `https://`.')
      return
    }
    if (startAt && endAt && startAt > endAt) {
      setError('Focus active start must be before end date.')
      return
    }
    const domains = focusItemDraft.domainAllowlist
      .split(',')
      .map(domain => domain.trim().toLowerCase())
      .filter(Boolean)
      .map(domain => domain.replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    if (focusItemDraft.status === 'active' && domains.length === 0) {
      setError('Domain allowlist is required before enabling a focus item.')
      return
    }

    const newItem: CampaignFocusItem = {
      id: `focus-${Math.random().toString(36).slice(2, 10)}`,
      type: focusItemDraft.type,
      title,
      message,
      target_url: focusItemDraft.targetUrl.trim(),
      campaign_node_id: focusItemDraft.campaignNodeId.trim(),
      start_at: startAt || '',
      end_at: endAt || '',
      domain_allowlist: [...new Set(domains)],
      status: focusItemDraft.status,
      impressions: 0,
      conversions: 0,
      updated_at: new Date().toISOString(),
      updated_by: appUser.user_id,
    }

    setFocusItemSaving(true)
    setSyncState('syncing')
    setError(null)
    try {
      const nextFocusItems = [newItem, ...focusItems]
      const nextCadenceRule = buildCadenceRuleFromPreset(campaignDetailDraft.cadencePreset, {
        ...(selectedCampaign.cadence_rule && typeof selectedCampaign.cadence_rule === 'object' ? selectedCampaign.cadence_rule : {}),
        focus_items: nextFocusItems,
      })
      const updated = await updateCampaign(
        selectedCampaign.id,
        { cadence_rule: nextCadenceRule },
        appUser.user_id,
      )
      setCampaigns(previous => previous.map(campaign => (
        campaign.id === updated.id ? updated : campaign
      )))
      setFocusItems(nextFocusItems)
      setFocusItemDraft(createDefaultFocusItemDraft())
      await logCampaignActivityEvent({
        entity_type: 'campaign',
        entity_id: selectedCampaign.id,
        action_type: 'campaign-focus-item-created',
        performed_by: appUser.user_id,
        metadata: {
          focus_item_id: newItem.id,
          focus_item_type: newItem.type,
          campaign_node_id: newItem.campaign_node_id || null,
          domain_allowlist_count: newItem.domain_allowlist.length,
        },
      })
      void listCampaignActivityLogs(300).then(setActivityLogs).catch(() => {})
      markMutationSuccess('Focus item created.')
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
    } finally {
      setFocusItemSaving(false)
    }
  }, [
    appUser?.user_id,
    campaignDetailDraft.cadencePreset,
    focusItemDraft,
    focusItems,
    markMutationSuccess,
    selectedCampaign,
    setErrorFromException,
  ])

  const updateFocusItemMetricFromInput = useCallback(async (
    focusItemId: string,
    metric: 'impression' | 'conversion',
  ) => {
    if (!selectedCampaign || !appUser?.user_id) return
    const updatedItems = focusItems.map(item => {
      if (item.id !== focusItemId) return item
      return {
        ...item,
        impressions: metric === 'impression' ? item.impressions + 1 : item.impressions,
        conversions: metric === 'conversion' ? item.conversions + 1 : item.conversions,
        updated_at: new Date().toISOString(),
        updated_by: appUser.user_id,
      }
    })

    setSyncState('syncing')
    setError(null)
    try {
      const nextCadenceRule = buildCadenceRuleFromPreset(campaignDetailDraft.cadencePreset, {
        ...(selectedCampaign.cadence_rule && typeof selectedCampaign.cadence_rule === 'object' ? selectedCampaign.cadence_rule : {}),
        focus_items: updatedItems,
      })
      const updated = await updateCampaign(
        selectedCampaign.id,
        { cadence_rule: nextCadenceRule },
        appUser.user_id,
      )
      setCampaigns(previous => previous.map(campaign => (
        campaign.id === updated.id ? updated : campaign
      )))
      setFocusItems(updatedItems)
      await logCampaignActivityEvent({
        entity_type: 'campaign',
        entity_id: selectedCampaign.id,
        action_type: metric === 'impression' ? 'campaign-focus-impression-tracked' : 'campaign-focus-conversion-tracked',
        performed_by: appUser.user_id,
        metadata: {
          focus_item_id: focusItemId,
        },
      })
      markMutationSuccess(metric === 'impression' ? 'Focus impression tracked.' : 'Focus conversion tracked.')
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
    }
  }, [
    appUser?.user_id,
    campaignDetailDraft.cadencePreset,
    focusItems,
    markMutationSuccess,
    selectedCampaign,
    setErrorFromException,
  ])

  const createContentDraftFromInput = useCallback(async (payload: {
    title?: string
    body?: string
    topic?: string
    contentType: CampaignContentItem['content_type']
    campaignId?: string | null
  }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    const trimmedTitle = (payload.title || '').trim()
    const trimmedBody = (payload.body || '').trim()
    if (!trimmedTitle && !trimmedBody) {
      throw new Error('Draft requires a title or body.')
    }
    const fallbackTitle = trimmedBody
      ? trimmedBody.replace(/\s+/g, ' ').slice(0, 72)
      : 'Untitled draft'
    const normalizedTitle = trimmedTitle || fallbackTitle || 'Untitled draft'
    const normalizedTopic = (payload.topic || '').trim() || 'general'

    setSyncState('syncing')
    setError(null)
    try {
      const created = await createCampaignContentDraft({
        title: normalizedTitle,
        body: trimmedBody,
        topic: normalizedTopic,
        content_type: payload.contentType,
        campaign_id: payload.campaignId || null,
        created_by: appUser.user_id,
      })
      upsertContentItem(created)
      markMutationSuccess(`Draft created: ${created.title}.`)
      return created
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, markMutationSuccess, setErrorFromException, upsertContentItem])

  const claimFromInput = useCallback(async (payload: {
    contentId: string
    intendedChannel?: string
    scheduledFor?: string
  }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await claimCampaignContent(payload.contentId, appUser.user_id, {
        intended_channel: payload.intendedChannel || 'linkedin',
        scheduled_for: payload.scheduledFor || new Date().toISOString(),
      })
      upsertContentItem(updated)
      markMutationSuccess(`Claimed content: ${updated.title}.`)
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, markMutationSuccess, setErrorFromException, upsertContentItem])

  const addAssetFromInput = useCallback(async (payload: {
    contentId: string
    campaignId?: string | null
    title: string
    url: string
  }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    if (!campaignAssetsAvailable) throw new Error('Campaign assets are not available in this environment.')
    setSyncState('syncing')
    setError(null)
    try {
      const created = await createCampaignAsset({
        content_id: payload.contentId,
        campaign_id: payload.campaignId || null,
        title: payload.title,
        url: payload.url,
        created_by: appUser.user_id,
      })
      upsertAsset(created)
      markMutationSuccess(`Asset added: ${created.title || 'untitled asset'}.`)
      return created
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [
    appUser?.user_id,
    campaignAssetsAvailable,
    markMutationSuccess,
    setErrorFromException,
    upsertAsset,
  ])

  const removeAssetFromInput = useCallback(async (assetId: string) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    if (!campaignAssetsAvailable) throw new Error('Campaign assets are not available in this environment.')
    setSyncState('syncing')
    setError(null)
    try {
      await removeCampaignAsset(assetId, appUser.user_id)
      removeAssetFromState(assetId)
      markMutationSuccess('Asset removed.')
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [
    appUser?.user_id,
    campaignAssetsAvailable,
    markMutationSuccess,
    removeAssetFromState,
    setErrorFromException,
  ])

  const savePostUrlFromInput = useCallback(async (payload: { contentId: string; postUrl: string }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await updateCampaignContentPostUrl(payload.contentId, appUser.user_id, payload.postUrl)
      upsertContentItem(updated)
      markMutationSuccess('Post URL saved.')
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, markMutationSuccess, setErrorFromException, upsertContentItem])

  const saveDraftBodyFromInput = useCallback(async (payload: { contentId: string; body: string }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await updateCampaignContentDraftBody(payload.contentId, appUser.user_id, payload.body)
      upsertContentItem(updated)
      markMutationSuccess('Draft content updated.')
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, markMutationSuccess, setErrorFromException, upsertContentItem])

  const submitReviewFromInput = useCallback(async (payload: { contentId: string }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await submitCampaignContentForReview(payload.contentId, appUser.user_id)
      upsertContentItem(updated)
      markMutationSuccess(`Submitted for review: ${updated.title}.`)
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, markMutationSuccess, setErrorFromException, upsertContentItem])

  const approveFromInput = useCallback(async (payload: { contentId: string }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await approveCampaignContent(payload.contentId, appUser.user_id)
      upsertContentItem(updated)
      markMutationSuccess(`Approved: ${updated.title}.`)
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, markMutationSuccess, setErrorFromException, upsertContentItem])

  const rejectFromInput = useCallback(async (payload: { contentId: string; reason: string }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await rejectCampaignContent(payload.contentId, appUser.user_id, payload.reason)
      upsertContentItem(updated)
      markMutationSuccess(`Rejected: ${updated.title}.`)
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, markMutationSuccess, setErrorFromException, upsertContentItem])

  const unclaimFromInput = useCallback(async (payload: { contentId: string; reason: string }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await unclaimCampaignContent(payload.contentId, appUser.user_id, payload.reason)
      upsertContentItem(updated)
      markMutationSuccess(`Unclaimed: ${updated.title}.`)
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, markMutationSuccess, setErrorFromException, upsertContentItem])

  const addReminderFromInput = useCallback(async (payload: {
    contentId: string
    scheduledFor: string
    reminderType: 'ics' | 'slack' | 'email' | 'in-app'
  }): Promise<CampaignReminder> => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const created = await createCampaignReminder({
        content_id: payload.contentId,
        user_id: appUser.user_id,
        reminder_type: payload.reminderType,
        scheduled_for: payload.scheduledFor,
      })
      upsertReminder(created)
      markMutationSuccess('Reminder added.')
      return created
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, markMutationSuccess, setErrorFromException, upsertReminder])

  const updateReminderFromInput = useCallback(async (
    reminderId: string,
    payload: {
      userId?: string
      reminderType?: CampaignReminder['reminder_type']
      scheduledFor?: string
      status?: CampaignReminder['status']
      sentAt?: string | null
      failureReason?: string | null
    },
  ): Promise<CampaignReminder> => {
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await updateCampaignReminder(reminderId, {
        user_id: payload.userId,
        reminder_type: payload.reminderType,
        scheduled_for: payload.scheduledFor,
        status: payload.status,
        sent_at: payload.sentAt,
        failure_reason: payload.failureReason,
      })
      upsertReminder(updated)
      markMutationSuccess('Reminder updated.')
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [markMutationSuccess, setErrorFromException, upsertReminder])

  const deleteReminderFromInput = useCallback(async (reminderId: string): Promise<void> => {
    setSyncState('syncing')
    setError(null)
    try {
      await deleteCampaignReminder(reminderId)
      removeReminderFromState(reminderId)
      markMutationSuccess('Reminder deleted.')
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [markMutationSuccess, removeReminderFromState, setErrorFromException])

  const reassignClaimToMeFromInput = useCallback(async (contentId: string): Promise<CampaignContentItem> => {
    if (!appUser?.user_id) throw new Error('No active user.')
    const current = contentItems.find(item => item.id === contentId)
    if (!current) throw new Error('Content item not found.')
    if (current.status !== 'claimed') throw new Error('Only claimed content can be reassigned.')
    if (current.posting_owner_id === appUser.user_id) return current

    setSyncState('syncing')
    setError(null)
    try {
      await unclaimCampaignContent(contentId, appUser.user_id, 'Queue reassign to current reviewer')
      const reclaimed = await claimCampaignContent(contentId, appUser.user_id, {
        intended_channel: current.intended_channel || 'linkedin',
        scheduled_for: current.scheduled_for || new Date().toISOString(),
      })
      upsertContentItem(reclaimed)
      markMutationSuccess(`Reassigned to you: ${reclaimed.title}.`)
      return reclaimed
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, contentItems, markMutationSuccess, setErrorFromException, upsertContentItem])

  const markPostedFromInput = useCallback(async (payload: { contentId: string; postUrl?: string }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await markCampaignContentPosted(payload.contentId, appUser.user_id, payload.postUrl || undefined)
      upsertContentItem(updated)
      markMutationSuccess(`Marked posted: ${updated.title}.`)
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, markMutationSuccess, setErrorFromException, upsertContentItem])

  const adminOverrideFromInput = useCallback(async (payload: {
    contentId: string
    action: CampaignAdminOverrideAction
    reason: string
    postUrl?: string
  }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    if (!isAdmin) throw new Error('Admin permissions required for override.')
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await campaignAdminOverrideContent(payload.contentId, appUser.user_id, {
        action: payload.action,
        reason: payload.reason,
        post_url: payload.postUrl || null,
      })
      upsertContentItem(updated)
      markMutationSuccess(`Admin override applied: ${updated.title} is now ${updated.status}.`)
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, isAdmin, markMutationSuccess, setErrorFromException, upsertContentItem])

  const addPerformanceMetricsFromInput = useCallback(async (payload: {
    contentId: string
    impressions?: number | null
    reactions?: number | null
    comments?: number | null
    shares?: number | null
    clicks?: number | null
    conversionCount?: number | null
  }): Promise<CampaignContentMetrics> => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const created = await addCampaignPerformanceMetrics({
        content_id: payload.contentId,
        captured_by_user_id: appUser.user_id,
        impressions: payload.impressions ?? null,
        reactions: payload.reactions ?? null,
        comments: payload.comments ?? null,
        shares: payload.shares ?? null,
        clicks: payload.clicks ?? null,
        conversion_count: payload.conversionCount ?? null,
      })
      markMutationSuccess('Performance metrics saved.')
      return created
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, markMutationSuccess, setErrorFromException])

  const updateScheduleFromInput = useCallback(async (payload: { contentId: string; scheduledFor: string }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await updateCampaignContentSchedule(payload.contentId, appUser.user_id, payload.scheduledFor)
      upsertContentItem(updated)
      markMutationSuccess('Schedule updated.')
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, markMutationSuccess, setErrorFromException, upsertContentItem])

  const addMetricsFromInput = useCallback((payload: {
    contentId: string
    impressions?: number | null
    reactions?: number | null
    comments?: number | null
    shares?: number | null
    clicks?: number | null
    conversionCount?: number | null
  }): Promise<CampaignContentMetrics> => addPerformanceMetricsFromInput(payload), [addPerformanceMetricsFromInput])

  const exportSummaryFromInput = useCallback(async (): Promise<string> => {
    const fallbackMarkdown = [
      '# Campaign Execution Summary',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      '| Metric | Count |',
      '| --- | ---: |',
      `| Created | ${reportSummary.created_count} |`,
      `| Submitted | ${reportSummary.submitted_count} |`,
      `| Approved | ${reportSummary.approved_count} |`,
      `| Waiting Review | ${reportSummary.waiting_review_count} |`,
      `| Unclaimed | ${reportSummary.unclaimed_count} |`,
      `| Claimed | ${reportSummary.claimed_count} |`,
      `| Posted | ${reportSummary.posted_count} |`,
      `| Missed | ${reportSummary.missed_count} |`,
      '',
      '## Active Campaigns',
      ...campaigns.map(campaign => `- ${campaign.name} (${campaign.status})`),
    ].join('\n')

    const downloadContent = (content: string, fileName: string, mimeType: string) => {
      const blob = new Blob([content], { type: mimeType })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    }

    if (!appUser?.user_id) {
      downloadContent(
        fallbackMarkdown,
        `campaign-summary-${new Date().toISOString().slice(0, 10)}.md`,
        'text/markdown;charset=utf-8',
      )
      return 'Campaign summary exported to markdown.'
    }

    setSyncState('syncing')
    setError(null)
    try {
      const actor = {
        user_id: appUser.user_id,
        user_email: appUser.email || '',
      }
      const job = await requestCampaignReportExport({
        actor,
        format: 'markdown',
        filters: {
          startDate: reportFiltersApplied.startDate || undefined,
          endDate: reportFiltersApplied.endDate || undefined,
          campaignId: reportFiltersApplied.campaignId || undefined,
          contentType: reportFiltersApplied.contentType || undefined,
        },
      })

      let filename = job.file_name || `campaign-summary-${new Date().toISOString().slice(0, 10)}.md`
      let content = job.file_payload || ''
      let format = job.format || 'markdown'
      if (!content && job.id) {
        const downloaded = await downloadCampaignReportExport({
          actor,
          exportId: job.id,
        })
        filename = downloaded.filename || filename
        content = downloaded.content || ''
        format = downloaded.format || format
      }
      if (!content) throw new Error('Export payload is empty.')

      const mime = format === 'html'
        ? 'text/html;charset=utf-8'
        : 'text/markdown;charset=utf-8'
      downloadContent(content, filename, mime)
      const latestJobs = await listCampaignReportExports({
        actor,
        limit: 10,
      }).catch(() => null)
      if (latestJobs) setExportJobs(latestJobs)
      markMutationSuccess('Campaign summary exported.')
      return 'Campaign summary exported via campaign export job.'
    } catch {
      downloadContent(
        fallbackMarkdown,
        `campaign-summary-${new Date().toISOString().slice(0, 10)}.md`,
        'text/markdown;charset=utf-8',
      )
      markMutationSuccess('Campaign summary exported.')
      return 'Campaign summary exported to markdown.'
    }
  }, [
    appUser?.email,
    appUser?.user_id,
    campaigns,
    markMutationSuccess,
    reportFiltersApplied.campaignId,
    reportFiltersApplied.contentType,
    reportFiltersApplied.endDate,
    reportFiltersApplied.startDate,
    reportSummary,
  ])

  const runJobsFromInput = useCallback(async (action: CampaignJobsAction, dryRun: boolean) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setJobRunning(true)
    setJobRunMessage(null)
    setError(null)
    try {
      const result = await runCampaignJobs({
        actor: {
          user_id: appUser.user_id,
          user_email: appUser.email || '',
        },
        action,
        dryRun,
      })
      setJobRunDetails(result)

      const reminderStats = result.jobs?.reminders
      const missedStats = result.jobs?.missed_posts
      const parts: string[] = []
      if (reminderStats) {
        parts.push(
          `reminders: sent=${reminderStats.sent ?? 0}, cancelled=${reminderStats.cancelled ?? 0}, failed=${reminderStats.failed ?? 0}`,
        )
      }
      if (missedStats) {
        parts.push(
          `missed: new=${missedStats.newly_missed ?? 0}, existing=${missedStats.already_marked ?? 0}`,
        )
      }
      setJobRunMessage(
        (dryRun ? 'Dry run complete' : 'Automation run complete')
          + (parts.length > 0 ? ` (${parts.join(' | ')})` : '.'),
      )

      if (!dryRun) {
        await Promise.all([loadData(), loadReportSummary()])
      }
    } catch (exception) {
      const message = exception instanceof Error ? exception.message : String(exception)
      setJobRunMessage(`Automation run failed: ${message}`)
      setError(message)
    } finally {
      setJobRunning(false)
    }
  }, [appUser?.email, appUser?.user_id, loadData, loadReportSummary])

  const resetContentFiltersFromInput = useCallback(() => {
    setContentLibraryViewMode('action')
    setContentLibraryFilters({
      query: '',
      status: 'all',
      contentType: 'all',
      campaignId: '',
      ownership: 'all',
    })
  }, [])

  const resetCalendarFiltersFromInput = useCallback(() => {
    setCalendarSort('overdue-first')
    setCalendarView('weekly')
    setCalendarCursorDate(toDateInputValue(new Date()))
    setCalendarFilters({
      query: '',
      campaignId: '',
      channel: 'all',
      timing: 'all',
      ownership: 'all',
    })
  }, [])

  const shiftCalendarWindowFromInput = useCallback((direction: 'prev' | 'next') => {
    const delta = direction === 'prev' ? -1 : 1
    setCalendarCursorDate(previous => {
      const base = previous ? new Date(`${previous}T00:00:00`) : new Date()
      if (Number.isNaN(base.getTime())) return toDateInputValue(new Date())

      if (calendarView === 'monthly') {
        base.setMonth(base.getMonth() + delta)
        return toDateInputValue(base)
      }

      const days = calendarView === 'weekly' ? 7 : 14
      base.setDate(base.getDate() + (days * delta))
      return toDateInputValue(base)
    })
  }, [calendarView])

  const toggleReviewSelectedFromInput = useCallback((contentId: string) => {
    setReviewSelectedById(previous => ({
      ...previous,
      [contentId]: !previous[contentId],
    }))
  }, [])

  const selectAllReviewFromInput = useCallback(() => {
    const next: Record<string, boolean> = {}
    for (const item of reviewQueueNeedsReviewRows) {
      next[item.id] = true
    }
    setReviewSelectedById(next)
  }, [reviewQueueNeedsReviewRows])

  const clearReviewSelectionFromInput = useCallback(() => {
    setReviewSelectedById({})
  }, [])

  const closeReasonModalFromInput = useCallback(() => {
    if (reasonModalRunning) return
    setReasonModalState(null)
    setReasonModalInput('')
    setReasonModalError(null)
  }, [reasonModalRunning])

  const openReasonModalFromInput = useCallback((mode: CampaignReasonModalMode, item: CampaignContentItem) => {
    setReasonModalState({
      mode,
      contentId: item.id,
      title: item.title,
    })
    setReasonModalInput('')
    setReasonModalError(null)
  }, [])

  const submitReasonModalFromInput = useCallback(async () => {
    if (!reasonModalState) return
    const reason = reasonModalInput.trim()
    if (!reason) {
      setReasonModalError('Reason is required.')
      return
    }

    setReasonModalRunning(true)
    setReasonModalError(null)
    try {
      if (reasonModalState.mode === 'review-reject') {
        await rejectFromInput({ contentId: reasonModalState.contentId, reason })
      } else {
        await unclaimFromInput({ contentId: reasonModalState.contentId, reason })
      }
      setReasonModalState(null)
      setReasonModalInput('')
      setReasonModalError(null)
    } finally {
      setReasonModalRunning(false)
    }
  }, [reasonModalInput, reasonModalState, rejectFromInput, unclaimFromInput])

  const closeAdminOverrideModalFromInput = useCallback(() => {
    if (adminOverrideRunning) return
    setAdminOverrideModalState(null)
    setAdminOverrideAction('reset-draft')
    setAdminOverrideReason('')
    setAdminOverridePostUrl('')
    setAdminOverrideError(null)
  }, [adminOverrideRunning])

  const openAdminOverrideModalFromInput = useCallback((item: CampaignContentItem) => {
    setAdminOverrideModalState({
      contentId: item.id,
      title: item.title,
      currentStatus: item.status,
    })
    setAdminOverrideAction(item.status === 'posted' ? 'force-unclaimed' : 'reset-draft')
    setAdminOverrideReason('')
    setAdminOverridePostUrl(item.post_url || '')
    setAdminOverrideError(null)
  }, [])

  const submitAdminOverrideModalFromInput = useCallback(async () => {
    if (!adminOverrideModalState) return
    const reason = adminOverrideReason.trim()
    const postUrl = adminOverridePostUrl.trim()
    if (!reason) {
      setAdminOverrideError('Override reason is required.')
      return
    }
    if (postUrl && !isHttpUrl(postUrl)) {
      setAdminOverrideError('Post URL must start with `http://` or `https://`.')
      return
    }

    setAdminOverrideRunning(true)
    setAdminOverrideError(null)
    try {
      await adminOverrideFromInput({
        contentId: adminOverrideModalState.contentId,
        action: adminOverrideAction,
        reason,
        postUrl: adminOverrideAction === 'force-posted' ? postUrl : undefined,
      })
      setAdminOverrideModalState(null)
      setAdminOverrideAction('reset-draft')
      setAdminOverrideReason('')
      setAdminOverridePostUrl('')
      setAdminOverrideError(null)
    } finally {
      setAdminOverrideRunning(false)
    }
  }, [adminOverrideAction, adminOverrideModalState, adminOverridePostUrl, adminOverrideReason, adminOverrideFromInput])

  const runBulkReviewFromInput = useCallback(async (
    action: 'approve' | 'reject',
    rejectionReasonInput?: string,
  ): Promise<boolean> => {
    if (!isAdmin || !appUser?.user_id) return false
    if (selectedReviewIds.length === 0) {
      setReviewBulkMessage('Select at least one review item first.')
      return false
    }

    const rejectionReason = (rejectionReasonInput || '').trim()
    if (action === 'reject') {
      if (!rejectionReason) {
        setReviewBulkRejectError('Rejection reason is required.')
        return false
      }
    }

    setReviewBulkRunning(true)
    setReviewBulkMessage(null)
    setReviewBulkRejectError(null)
    setSyncState('syncing')
    setError(null)

    let succeeded = 0
    let failed = 0

    for (const contentId of selectedReviewIds) {
      try {
        const updated = action === 'approve'
          ? await approveCampaignContent(contentId, appUser.user_id)
          : await rejectCampaignContent(contentId, appUser.user_id, rejectionReason)
        upsertContentItem(updated)
        succeeded += 1
      } catch {
        failed += 1
      }
    }

    setReviewSelectedById({})
    if (failed > 0) {
      setSyncState('error')
      setError(`Bulk ${action} completed with ${failed} failure(s).`)
    } else {
      markMutationSuccess()
    }
    setReviewBulkMessage(`Bulk ${action} complete: ${succeeded} succeeded${failed > 0 ? `, ${failed} failed` : ''}.`)
    setReviewBulkRunning(false)
    return true
  }, [appUser?.user_id, isAdmin, markMutationSuccess, selectedReviewIds, upsertContentItem])

  const applyReportPreset = useCallback((preset: CampaignReportPreset) => {
    const range = getPresetDateRange(preset)
    setReportFiltersDraft(prev => ({
      ...prev,
      preset,
      startDate: range.startDate,
      endDate: range.endDate,
    }))
  }, [])

  const applyReportFilters = useCallback(() => {
    if (reportFilterDateError) return
    setServerReportSummary(null)
    setServerReportGroupings(null)
    setReportFiltersApplied(reportFiltersDraft)
  }, [reportFilterDateError, reportFiltersDraft])

  const resetReportFilters = useCallback(() => {
    const range = getPresetDateRange('last-30')
    const next = {
      preset: 'last-30' as CampaignReportPreset,
      startDate: range.startDate,
      endDate: range.endDate,
      campaignId: '',
      contentType: '',
    }
    setServerReportSummary(null)
    setServerReportGroupings(null)
    setReportFiltersDraft(next)
    setReportFiltersApplied(next)
  }, [])

  const downloadExportJobFromInput = useCallback(async (exportId: string) => {
    if (!appUser?.user_id) throw new Error('No active user.')

    const actor = {
      user_id: appUser.user_id,
      user_email: appUser.email || '',
    }

    const downloaded = await downloadCampaignReportExport({
      actor,
      exportId,
    })
    const mime = downloaded.format === 'html'
      ? 'text/html;charset=utf-8'
      : 'text/markdown;charset=utf-8'
    const blob = new Blob([downloaded.content], { type: mime })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = downloaded.filename || `campaign-summary-${new Date().toISOString().slice(0, 10)}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }, [appUser?.email, appUser?.user_id])

  function toggleSidebar() { setSidebarOpen(open => !open) }
  const closeSidebar = useCallback(() => { setSidebarOpen(false) }, [])

  const jumpTo = useCallback((section: CampaignSection) => {
    if (sectionPageMode) {
      router.push(SECTION_TO_ROUTE[section])
      closeSidebar()
      return
    }
    const anchorId = SECTION_TO_ANCHOR[section]
    document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [closeSidebar, router, sectionPageMode])

  function shouldRenderSection(section: CampaignSection) {
    return !sectionPageMode || routedSection === section
  }

  const openContentLibraryFromInput = useCallback((payload?: {
    viewMode?: ContentLibraryViewMode
    status?: ContentLibraryFilters['status']
    ownership?: ContentLibraryFilters['ownership']
  }) => {
    setContentFocusId('')
    setContentLibraryViewMode(payload?.viewMode || 'all')
    setContentLibraryFilters(previous => ({
      ...previous,
      query: '',
      status: payload?.status ?? 'all',
      campaignId: '',
      ownership: payload?.ownership ?? 'all',
      contentType: 'all',
    }))
    jumpTo('content')
  }, [jumpTo])

  const openReviewQueueFromInput = useCallback(() => {
    setReviewQueueFilter('needs-review')
    jumpTo('review')
  }, [jumpTo])

  const openCalendarFromInput = useCallback((payload?: {
    ownership?: CalendarFilters['ownership']
    timing?: CalendarFilters['timing']
  }) => {
    setCalendarSort('overdue-first')
    setCalendarFilters(previous => ({
      ...previous,
      query: '',
      campaignId: '',
      channel: 'all',
      ownership: payload?.ownership ?? 'mine',
      timing: payload?.timing ?? 'all',
    }))
    router.push(SECTION_TO_ROUTE.calendar)
    closeSidebar()
  }, [closeSidebar, router])

  const openRemindersFromInput = useCallback(() => {
    jumpTo('reminders')
  }, [jumpTo])

  const openReportsFromInput = useCallback(() => {
    jumpTo('reports')
  }, [jumpTo])

  const openAutomationFromInput = useCallback(() => {
    jumpTo('automation')
  }, [jumpTo])

  const nextActions = useMemo(() => {
    const rows: Array<{
      id: string
      label: string
      detail: string
      run: () => void
    }> = []

    if (reviewQueueNeedsReviewRows.length > 0) {
      rows.push({
        id: 'next-review',
        label: 'Review Queue Needs Attention',
        detail: `${reviewQueueNeedsReviewRows.length} items waiting review`,
        run: () => {
          setReviewQueueFilter('needs-review')
          jumpTo('review')
        },
      })
    }
    if (approvedUnscheduledRows.length > 0) {
      rows.push({
        id: 'next-unscheduled',
        label: 'Approved Content Needs Schedule',
        detail: `${approvedUnscheduledRows.length} approved-unscheduled items`,
        run: () => jumpTo('calendar'),
      })
    }
    const overdueReminderCount = reminderRows.filter(row => row.isOverdue).length
    if (overdueReminderCount > 0) {
      rows.push({
        id: 'next-overdue-reminders',
        label: 'Overdue Reminders',
        detail: `${overdueReminderCount} reminders overdue`,
        run: () => jumpTo('reminders'),
      })
    }
    const missingMetadataCount = contentItems.filter(item => !item.topic || !item.title || !item.body).length
    if (missingMetadataCount > 0) {
      rows.push({
        id: 'next-metadata',
        label: 'Missing Content Metadata',
        detail: `${missingMetadataCount} rows with missing title/topic/body`,
        run: () => jumpTo('content'),
      })
    }

    return rows
  }, [approvedUnscheduledRows.length, contentItems, jumpTo, reminderRows, reviewQueueNeedsReviewRows.length])

  async function copyToClipboard(text: string) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setInfoMessage('Copied content to clipboard.')
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setInfoMessage('Copied content to clipboard.')
    }
  }

  function focusContentFromInput(contentId: string) {
    const item = contentItems.find(row => row.id === contentId)
    if (!item) return
    setContentFocusId(contentId)
    setContentLibraryViewMode('all')
    setContentLibraryFilters(previous => ({
      ...previous,
      query: '',
      status: 'all',
      campaignId: item.campaign_id || previous.campaignId,
      ownership: 'all',
    }))
    jumpTo('content')
  }

  function openContentPanelFromInput(contentId: string) {
    const item = contentItems.find(row => row.id === contentId)
    if (!item) return
    setContentPanelId(contentId)
  }

  const saveContentPanelDraftFromInput = useCallback(async () => {
    if (!contentPanelItem) return
    if (!capabilityMatrix.canEditOwnDraft(contentPanelItem)) return
    const draftBody = contentPanelDraftBody.trim()
    if (!draftBody) {
      setInfoMessage('Draft body is required.')
      return
    }
    setContentPanelSaving(true)
    try {
      await saveDraftBodyFromInput({ contentId: contentPanelItem.id, body: draftBody })
    } finally {
      setContentPanelSaving(false)
    }
  }, [
    capabilityMatrix,
    contentPanelDraftBody,
    contentPanelItem,
    saveDraftBodyFromInput,
  ])

  function downloadIcs(item: CampaignContentItem) {
    const scheduledIso = item.scheduled_for || new Date().toISOString()
    const payload = buildIcsPayload(item, scheduledIso)
    const blob = new Blob([payload], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `campaign-${item.id}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }

  const flows = useMemo(
    () => buildCampaignFlows({
      isAdmin,
      campaigns,
      allContent: contentItems,
      draftContent: queueDraft,
      needsReviewContent: reviewQueueNeedsReviewRows,
      unclaimedContent: queueUnclaimed,
      myClaimedContent: myClaimed,
      postedContent,
      createCampaign: payload => createCampaignFromInput({
        name: payload.name,
        targetAudience: payload.targetAudience,
        primaryCta: payload.primaryCta,
        startDate: payload.startDate,
        endDate: payload.endDate,
        cadenceRule: payload.cadenceRule,
        status: payload.status,
      }),
      createContentDraft: payload => createContentDraftFromInput({
        title: payload.title,
        body: payload.body,
        topic: payload.topic,
        contentType: payload.contentType,
        campaignId: payload.campaignId,
      }),
      claimContent: payload => claimFromInput({
        contentId: payload.contentId,
        intendedChannel: payload.intendedChannel,
        scheduledFor: payload.scheduledFor,
      }),
      addContentAsset: payload => {
        const row = contentItems.find(item => item.id === payload.contentId)
        return addAssetFromInput({
          contentId: payload.contentId,
          campaignId: row?.campaign_id || null,
          title: payload.title || '',
          url: payload.url || '',
        })
      },
      submitContentReview: payload => submitReviewFromInput(payload),
      approveContent: payload => approveFromInput(payload),
      rejectContent: payload => rejectFromInput(payload),
      unclaimContent: payload => unclaimFromInput(payload),
      addReminder: payload => addReminderFromInput(payload),
      markPosted: payload => markPostedFromInput(payload),
      addPostUrl: payload => savePostUrlFromInput(payload),
      adminOverrideContent: payload => adminOverrideFromInput(payload),
      addPerformanceMetrics: payload => addMetricsFromInput(payload),
      exportSummary: () => exportSummaryFromInput(),
      getSummary: () => reportSummary,
      openContentLibrary: payload => openContentLibraryFromInput(payload),
      openReviewQueue: () => openReviewQueueFromInput(),
      openCalendar: payload => openCalendarFromInput(payload),
      openReminders: () => openRemindersFromInput(),
      openReports: () => openReportsFromInput(),
      openAutomation: () => openAutomationFromInput(),
    }),
    [
      isAdmin,
      campaigns,
      contentItems,
      queueDraft,
      reviewQueueNeedsReviewRows,
      queueUnclaimed,
      myClaimed,
      postedContent,
      createCampaignFromInput,
      createContentDraftFromInput,
      claimFromInput,
      addAssetFromInput,
      submitReviewFromInput,
      approveFromInput,
      rejectFromInput,
      unclaimFromInput,
      addReminderFromInput,
      markPostedFromInput,
      savePostUrlFromInput,
      adminOverrideFromInput,
      addMetricsFromInput,
      exportSummaryFromInput,
      reportSummary,
      openContentLibraryFromInput,
      openReviewQueueFromInput,
      openCalendarFromInput,
      openRemindersFromInput,
      openReportsFromInput,
      openAutomationFromInput,
    ],
  )

  const oliverConfig = useMemo<OliverConfig>(() => {
    const actions: OliverAction[] = CAMPAIGNS_COMMANDS.map(command => {
      let run: () => void
      switch (command.id) {
        case 'open-content-library':
          run = () => openContentLibraryFromInput({ viewMode: 'all', status: 'all', ownership: 'all' })
          break
        case 'open-unclaimed-content':
          run = () => openContentLibraryFromInput({ viewMode: 'action', status: 'unclaimed', ownership: 'unclaimed' })
          break
        case 'open-my-claimed':
          run = () => openCalendarFromInput({ ownership: 'mine' })
          break
        case 'open-review-queue':
          run = () => openReviewQueueFromInput()
          break
        case 'open-calendar':
          run = () => openCalendarFromInput({ ownership: 'all' })
          break
        case 'open-reminders':
          run = () => openRemindersFromInput()
          break
        case 'open-reports':
          run = () => openReportsFromInput()
          break
        case 'open-automation':
          run = () => openAutomationFromInput()
          break
        case 'show-campaign-summary':
          run = () => openReportsFromInput()
          break
        case 'export-campaign-summary':
          run = () => { void exportSummaryFromInput() }
          break
        case 'admin-override-content':
          run = () => openContentLibraryFromInput({ viewMode: 'all', status: 'all', ownership: 'all' })
          break
        default:
          run = () => {}
      }
      return { ...command, run }
    })

    return buildModuleOliverConfig('campaigns', {
      greeting: "Hi, I'm Oliver. You're in Campaign Content & Posting. I can help with campaign setup, content drafting, review queue actions, claims, and reporting.",
      actions,
      flows,
      quickConvos: [
        'Start a new campaign draft.',
        'Find unclaimed content and claim it.',
        'Show a campaign status summary for the last 30 days.',
      ],
      contextPayload: () => ({
        module_status: schemaMissing ? 'schema-missing' : policyBlocked ? 'policy-blocked' : 'workspace-live',
        campaigns_total: campaigns.length,
        content_total: contentItems.length,
        waiting_review_count: reportSummary.waiting_review_count,
      }),
      onChatRefresh: () => {
        void loadData()
        void loadReportSummary()
      },
    })
  }, [
    campaigns.length,
    contentItems.length,
    flows,
    loadData,
    loadReportSummary,
    openCalendarFromInput,
    openContentLibraryFromInput,
    openRemindersFromInput,
    openReportsFromInput,
    openAutomationFromInput,
    openReviewQueueFromInput,
    policyBlocked,
    reportSummary.waiting_review_count,
    schemaMissing,
    exportSummaryFromInput,
  ])

  useRegisterOliver(oliverConfig)

  if (!allowRender) return null

  return (
    <div className="app show-hamburger">
      <div
        className={'sidebar-backdrop' + (sidebarOpen ? ' open' : '')}
        onClick={closeSidebar}
        aria-hidden="true"
      />
      <nav className={'app-sidebar' + (sidebarOpen ? ' open' : '')} id="sidebar" aria-label="Campaign content navigation">
        <ModuleSidebarHeader title="Campaign Content & Posting" />
        <div className="app-sidebar-section">
          <Link
            href={SECTION_TO_ROUTE.list}
            className={'app-sidebar-item' + (activeSidebarSection === 'list' ? ' active' : '')}
            onClick={closeSidebar}
          >
            Campaigns
          </Link>
          <Link
            href={SECTION_TO_ROUTE.content}
            className={'app-sidebar-item' + (activeSidebarSection === 'content' ? ' active' : '')}
            onClick={closeSidebar}
          >
            Content Library
          </Link>
          <Link
            href={SECTION_TO_ROUTE.review}
            className={'app-sidebar-item' + (activeSidebarSection === 'review' ? ' active' : '')}
            onClick={closeSidebar}
          >
            Review Queue
          </Link>
          <Link
            href={SECTION_TO_ROUTE.calendar}
            className={'app-sidebar-item' + (activeSidebarSection === 'calendar' ? ' active' : '')}
            onClick={closeSidebar}
          >
            Calendar
          </Link>
          <Link
            href={SECTION_TO_ROUTE.reminders}
            className={'app-sidebar-item' + (activeSidebarSection === 'reminders' ? ' active' : '')}
            onClick={closeSidebar}
          >
            Reminders
          </Link>
          <Link
            href={SECTION_TO_ROUTE.reports}
            className={'app-sidebar-item' + (activeSidebarSection === 'reports' ? ' active' : '')}
            onClick={closeSidebar}
          >
            Reports
          </Link>
          <Link
            href={SECTION_TO_ROUTE.automation}
            className={'app-sidebar-item' + (activeSidebarSection === 'automation' ? ' active' : '')}
            onClick={closeSidebar}
          >
            Automation
          </Link>
        </div>
      </nav>

      <div className="main">
        <ModuleTopbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
        >
          <div className="sync-indicator">
            <div className={'sync-dot' + (syncState === 'syncing' ? ' syncing' : syncState === 'error' ? ' error' : '')} />
            <span>{syncState === 'syncing' ? 'Syncing...' : syncState === 'error' ? 'Error' : 'Synced'}</span>
            <button
              className="campaign-refresh-btn"
              title="Refresh campaign data"
              aria-label="Refresh campaign data"
              onClick={() => {
                void loadData()
                void loadReportSummary()
              }}
            >
              &#8635;
            </button>
          </div>
        </ModuleTopbar>

        <main className="page campaign-workspace" id="main-content">
          {shouldRenderSection('list') && <CampaignsLanding />}

          {error && (
            <div className="status-banner" role="alert">
              <span>{error}</span>
              {refreshRecommended && (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => {
                    void loadData()
                    void loadReportSummary()
                  }}
                >
                  Refresh Now
                </button>
              )}
            </div>
          )}
          {infoMessage && (
            <div className="status-banner status-banner-info" role="status">{infoMessage}</div>
          )}
          {campaigns.length > 0 && (
            <section className="card campaign-card campaign-context-shell">
              <div className="campaign-row-head">
                <div>
                  <h2 className="campaign-section-title">Campaign Workspace Context</h2>
                  <p className="campaign-card-copy">Persistent context across overview, content, review, calendar, reminders, and reporting.</p>
                </div>
                <label className="campaign-filter-control campaign-context-select">
                  <span className="campaign-card-copy">Selected campaign</span>
                  <select
                    className="input"
                    value={selectedCampaignId}
                    onChange={(event) => setSelectedCampaignId(event.target.value)}
                  >
                    {campaigns.map(campaign => (
                      <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              {selectedCampaign && (
                <>
                  <div className="campaign-chip-row">
                    <span className="campaign-pill">{selectedCampaign.name}</span>
                    <span className="campaign-pill">{selectedCampaign.status}</span>
                    <span className="campaign-pill">Owner: {selectedCampaign.created_by}</span>
                    <span className="campaign-pill">
                      Dates: {selectedCampaign.start_date || 'n/a'} - {selectedCampaign.end_date || 'n/a'}
                    </span>
                    <span className="campaign-pill">
                      Channels: {contentItems.some(item => item.campaign_id === selectedCampaign.id && item.intended_channel)
                        ? [...new Set(contentItems
                          .filter(item => item.campaign_id === selectedCampaign.id && item.intended_channel)
                          .map(item => item.intended_channel || '')
                          .filter(Boolean))]
                          .join(', ')
                        : 'n/a'}
                    </span>
                  </div>
                  <div className="campaign-status-grid">
                    <span className="campaign-status-chip">Draft {selectedCampaignStats?.draft || 0}</span>
                    <span className="campaign-status-chip">Review {selectedCampaignStats?.needsReview || 0}</span>
                    <span className="campaign-status-chip">Unclaimed {selectedCampaignStats?.unclaimed || 0}</span>
                    <span className="campaign-status-chip">Claimed {selectedCampaignStats?.claimed || 0}</span>
                    <span className="campaign-status-chip">Posted {selectedCampaignStats?.posted || 0}</span>
                  </div>
                </>
              )}
              <div className="campaign-tab-row" role="tablist" aria-label="Campaign workspace tabs">
                <Link href={SECTION_TO_ROUTE.list} className={'btn btn--secondary btn--sm' + (activeSidebarSection === 'list' ? ' active' : '')}>Overview</Link>
                <Link href={SECTION_TO_ROUTE.content} className={'btn btn--secondary btn--sm' + (activeSidebarSection === 'content' ? ' active' : '')}>Content</Link>
                <Link href={SECTION_TO_ROUTE.review} className={'btn btn--secondary btn--sm' + (activeSidebarSection === 'review' ? ' active' : '')}>Review</Link>
                <Link href={SECTION_TO_ROUTE.calendar} className={'btn btn--secondary btn--sm' + (activeSidebarSection === 'calendar' ? ' active' : '')}>Calendar</Link>
                <Link href={SECTION_TO_ROUTE.reminders} className={'btn btn--secondary btn--sm' + (activeSidebarSection === 'reminders' ? ' active' : '')}>Reminders</Link>
                <Link href={SECTION_TO_ROUTE.reports} className={'btn btn--secondary btn--sm' + (activeSidebarSection === 'reports' ? ' active' : '')}>Reports</Link>
                <Link href={SECTION_TO_ROUTE.automation} className={'btn btn--secondary btn--sm' + (activeSidebarSection === 'automation' ? ' active' : '')}>Automation</Link>
              </div>
            </section>
          )}
          {reasonModalState && (
            <div
              className="app-modal-overlay"
              onMouseDown={(event) => {
                if (event.target !== event.currentTarget) return
                closeReasonModalFromInput()
              }}
            >
              <div
                className="app-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="campaign-reason-modal-title"
              >
                <h3 className="app-modal-title" id="campaign-reason-modal-title">
                  {reasonModalState.mode === 'review-reject' ? 'Reject Content' : 'Unclaim Content'}
                </h3>
                <div className="app-modal-body">
                  <p className="campaign-card-copy">
                    {reasonModalState.mode === 'review-reject'
                      ? `Provide rejection feedback for "${reasonModalState.title}".`
                      : `Provide unclaim reason for "${reasonModalState.title}".`}
                  </p>
                  <textarea
                    className="app-modal-input"
                    aria-label={reasonModalState.mode === 'review-reject' ? 'Review rejection reason' : 'Content unclaim reason'}
                    rows={4}
                    value={reasonModalInput}
                    onChange={(event) => {
                      setReasonModalInput(event.target.value)
                      if (reasonModalError) setReasonModalError(null)
                    }}
                    placeholder={reasonModalState.mode === 'review-reject' ? 'Explain why this item returns to draft' : 'Explain why this claim is being released'}
                  />
                  {reasonModalError && (
                    <p className="campaign-card-rejection">{reasonModalError}</p>
                  )}
                </div>
                <div className="app-modal-actions">
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={closeReasonModalFromInput}
                    disabled={reasonModalRunning}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => { void submitReasonModalFromInput() }}
                    disabled={reasonModalRunning}
                  >
                    {reasonModalState.mode === 'review-reject' ? 'Reject Content' : 'Unclaim Content'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {adminOverrideModalState && (
            <div
              className="app-modal-overlay"
              onMouseDown={(event) => {
                if (event.target !== event.currentTarget) return
                closeAdminOverrideModalFromInput()
              }}
            >
              <div
                className="app-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="campaign-admin-override-modal-title"
              >
                <h3 className="app-modal-title" id="campaign-admin-override-modal-title">
                  Admin Override Content
                </h3>
                <div className="app-modal-body">
                  <p className="campaign-card-copy">
                    Apply an admin lifecycle correction for "{adminOverrideModalState.title}" ({adminOverrideModalState.currentStatus}).
                  </p>
                  <label className="campaign-filter-control">
                    <span className="campaign-card-copy">Override action</span>
                    <select
                      className="app-modal-input"
                      aria-label="Admin override action"
                      value={adminOverrideAction}
                      onChange={(event) => {
                        setAdminOverrideAction(event.target.value as CampaignAdminOverrideAction)
                        if (adminOverrideError) setAdminOverrideError(null)
                      }}
                    >
                      <option value="reset-draft">Reset to Draft</option>
                      <option value="force-unclaimed">Force Unclaimed</option>
                      <option value="force-posted">Force Posted</option>
                    </select>
                  </label>
                  <textarea
                    className="app-modal-input"
                    aria-label="Admin override reason"
                    rows={3}
                    value={adminOverrideReason}
                    onChange={(event) => {
                      setAdminOverrideReason(event.target.value)
                      if (adminOverrideError) setAdminOverrideError(null)
                    }}
                    placeholder="Explain why this override is required"
                  />
                  <input
                    className="app-modal-input"
                    aria-label="Admin override post URL"
                    placeholder="https://linkedin.com/posts/... (optional)"
                    value={adminOverridePostUrl}
                    onChange={(event) => {
                      setAdminOverridePostUrl(event.target.value)
                      if (adminOverrideError) setAdminOverrideError(null)
                    }}
                    disabled={adminOverrideAction !== 'force-posted'}
                  />
                  {adminOverrideError && (
                    <p className="campaign-card-rejection">{adminOverrideError}</p>
                  )}
                </div>
                <div className="app-modal-actions">
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={closeAdminOverrideModalFromInput}
                    disabled={adminOverrideRunning}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => { void submitAdminOverrideModalFromInput() }}
                    disabled={adminOverrideRunning}
                  >
                    Apply Override
                  </button>
                </div>
              </div>
            </div>
          )}

          {shouldRenderSection('list') && (
            <section id="campaigns-list" className="campaign-section">
            <h2 className="campaign-section-title">Campaigns</h2>
            <p className="campaign-section-subtitle">Create and maintain campaign strategy records.</p>
            {campaigns.length > 0 && (
              <div className="campaign-grid campaign-grid-wide campaign-detail-slices">
                <article className="card campaign-card">
                  <h3 className="campaign-card-title">Next Actions</h3>
                  <p className="campaign-card-copy">Operational priorities to move this workspace forward.</p>
                  {nextActions.length === 0 ? (
                    <p className="campaign-card-copy">No immediate queue blockers detected.</p>
                  ) : (
                    <ul className="campaign-detail-list">
                      {nextActions.map(action => (
                        <li key={action.id} className="campaign-detail-list-item">
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={action.run}
                          >
                            {action.label}
                          </button>
                          <span>{action.detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
                <article className="card campaign-card">
                  <h3 className="campaign-card-title">Recent Activity</h3>
                  <p className="campaign-card-copy">
                    {selectedCampaign ? `Latest events for ${selectedCampaign.name}.` : 'Select a campaign to view activity.'}
                  </p>
                  {!selectedCampaign && (
                    <p className="campaign-card-copy">No campaign selected.</p>
                  )}
                  {selectedCampaign && selectedCampaignActivity.length === 0 && (
                    <p className="campaign-card-copy">No recent activity for this campaign.</p>
                  )}
                  {selectedCampaign && selectedCampaignActivity.length > 0 && (
                    <ul className="campaign-detail-list">
                      {selectedCampaignActivity.slice(0, 6).map(log => (
                        <li key={`next-activity-${log.id}`} className="campaign-detail-list-item">
                          <div className="campaign-detail-activity-copy">
                            <span>{humanizeActionType(log.action_type)}</span>
                            <span className="campaign-card-copy">
                              By {log.performed_by || 'system'} · {log.entity_type}
                            </span>
                          </div>
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </div>
            )}
            <form
              className="card campaign-form"
              onSubmit={(event) => {
                event.preventDefault()
                if (!campaignDraft.name.trim()) return
                void createCampaignFromInput({
                  name: campaignDraft.name,
                  targetAudience: campaignDraft.targetAudience,
                  primaryCta: campaignDraft.primaryCta,
                  startDate: campaignDraft.startDate || null,
                  endDate: campaignDraft.endDate || null,
                  cadenceRule: buildCadenceRuleFromPreset(campaignDraft.cadencePreset),
                  status: campaignDraft.status,
                }).then(() => {
                  setCampaignDraft(prev => ({
                    ...prev,
                    name: '',
                    targetAudience: '',
                    primaryCta: '',
                    startDate: '',
                    endDate: '',
                    cadencePreset: 'none',
                  }))
                }).catch(() => {})
              }}
            >
              <h3 className="campaign-card-title">Create Campaign</h3>
              <input
                className="input"
                placeholder="Campaign name"
                value={campaignDraft.name}
                onChange={(event) => setCampaignDraft(prev => ({ ...prev, name: event.target.value }))}
              />
              <input
                className="input"
                placeholder="Target audience"
                value={campaignDraft.targetAudience}
                onChange={(event) => setCampaignDraft(prev => ({ ...prev, targetAudience: event.target.value }))}
              />
              <input
                className="input"
                placeholder="Primary CTA"
                value={campaignDraft.primaryCta}
                onChange={(event) => setCampaignDraft(prev => ({ ...prev, primaryCta: event.target.value }))}
              />
              <div className="campaign-form-grid">
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Start date</span>
                  <input
                    className="input"
                    type="date"
                    value={campaignDraft.startDate}
                    onChange={(event) => setCampaignDraft(prev => ({ ...prev, startDate: event.target.value }))}
                  />
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">End date</span>
                  <input
                    className="input"
                    type="date"
                    value={campaignDraft.endDate}
                    onChange={(event) => setCampaignDraft(prev => ({ ...prev, endDate: event.target.value }))}
                  />
                </label>
              </div>
              <label className="campaign-filter-control">
                <span className="campaign-card-copy">Cadence</span>
                <select
                  className="input"
                  value={campaignDraft.cadencePreset}
                  onChange={(event) => setCampaignDraft(prev => ({ ...prev, cadencePreset: event.target.value as CampaignCadencePreset }))}
                >
                  {CAMPAIGN_CADENCE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              {campaignDateError && (
                <p className="campaign-card-rejection">{campaignDateError}</p>
              )}
              <div className="campaign-chip-row">
                {CAMPAIGN_STATUS_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={'btn btn--secondary btn--sm' + (campaignDraft.status === option.value ? ' campaign-chip-active' : '')}
                    onClick={() => setCampaignDraft(prev => ({ ...prev, status: option.value }))}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button className="btn btn--primary" type="submit" disabled={schemaMissing || policyBlocked || !!campaignDateError}>Save Campaign</button>
            </form>

            {campaigns.length > 0 && (
              <article className="card campaign-card campaign-detail-card">
                <div className="campaign-row-head">
                  <h3 className="campaign-card-title">Campaign Detail Workspace</h3>
                  <span className="campaign-pill">{selectedCampaign?.status || 'draft'}</span>
                </div>
                <p className="campaign-card-copy">
                  Edit campaign strategy fields, review lifecycle buckets, and scan recent campaign activity.
                </p>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Selected Campaign</span>
                  <select
                    className="input"
                    value={selectedCampaignId}
                    onChange={(event) => setSelectedCampaignId(event.target.value)}
                  >
                    {campaigns.map(campaign => (
                      <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                    ))}
                  </select>
                </label>
                {selectedCampaign && (
                  <>
                    <div className="campaign-form-grid">
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Name</span>
                        <input
                          className="input"
                          value={campaignDetailDraft.name}
                          onChange={(event) => setCampaignDetailDraft(prev => ({ ...prev, name: event.target.value }))}
                        />
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Primary CTA</span>
                        <input
                          className="input"
                          value={campaignDetailDraft.primaryCta}
                          onChange={(event) => setCampaignDetailDraft(prev => ({ ...prev, primaryCta: event.target.value }))}
                        />
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Target Audience</span>
                        <input
                          className="input"
                          value={campaignDetailDraft.targetAudience}
                          onChange={(event) => setCampaignDetailDraft(prev => ({ ...prev, targetAudience: event.target.value }))}
                        />
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Offer Definition</span>
                        <input
                          className="input"
                          value={campaignDetailDraft.offerDefinition}
                          onChange={(event) => setCampaignDetailDraft(prev => ({ ...prev, offerDefinition: event.target.value }))}
                        />
                      </label>
                    </div>
                    <label className="campaign-filter-control">
                      <span className="campaign-card-copy">Description</span>
                      <textarea
                        className="ta"
                        rows={3}
                        value={campaignDetailDraft.description}
                        onChange={(event) => setCampaignDetailDraft(prev => ({ ...prev, description: event.target.value }))}
                      />
                    </label>
                    <div className="campaign-form-grid">
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Keywords (comma separated)</span>
                        <input
                          className="input"
                          placeholder="campaign execution, thought leadership"
                          value={campaignDetailDraft.keywords}
                          onChange={(event) => setCampaignDetailDraft(prev => ({ ...prev, keywords: event.target.value }))}
                        />
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Cadence</span>
                        <select
                          className="input"
                          value={campaignDetailDraft.cadencePreset}
                          onChange={(event) => setCampaignDetailDraft(prev => ({ ...prev, cadencePreset: event.target.value as CampaignCadencePreset }))}
                        >
                          {CAMPAIGN_CADENCE_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Start Date</span>
                        <input
                          className="input"
                          type="date"
                          value={campaignDetailDraft.startDate}
                          onChange={(event) => setCampaignDetailDraft(prev => ({ ...prev, startDate: event.target.value }))}
                        />
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">End Date</span>
                        <input
                          className="input"
                          type="date"
                          value={campaignDetailDraft.endDate}
                          onChange={(event) => setCampaignDetailDraft(prev => ({ ...prev, endDate: event.target.value }))}
                        />
                      </label>
                    </div>
                    {campaignDetailDateError && (
                      <p className="campaign-card-rejection">{campaignDetailDateError}</p>
                    )}
                    <div className="campaign-chip-row">
                      {CAMPAIGN_STATUS_OPTIONS.map(option => (
                        <button
                          key={option.value}
                          type="button"
                          className={'btn btn--secondary btn--sm' + (campaignDetailDraft.status === option.value ? ' campaign-chip-active' : '')}
                          onClick={() => setCampaignDetailDraft(prev => ({ ...prev, status: option.value }))}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <div className="campaign-card-actions">
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={() => { void saveCampaignDetailFromInput() }}
                        disabled={schemaMissing || policyBlocked || campaignDetailSaving || !campaignDetailDirty || !!campaignDetailDateError}
                      >
                        {campaignDetailSaving ? 'Saving…' : 'Save Campaign Detail'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => setCampaignDetailDraft(buildCampaignDetailDraft(selectedCampaign))}
                        disabled={campaignDetailSaving || !campaignDetailDirty}
                      >
                        Reset Changes
                      </button>
                    </div>

                    <div className="campaign-grid campaign-grid-wide campaign-detail-slices">
                      <article className="card campaign-card">
                        <h4 className="campaign-card-title">Lifecycle Groups</h4>
                        <div className="campaign-status-grid">
                          <span className="campaign-status-chip">Draft {selectedCampaignContentByStatus.draft.length}</span>
                          <span className="campaign-status-chip">Review {selectedCampaignContentByStatus.needs_review.length}</span>
                          <span className="campaign-status-chip">Unclaimed {selectedCampaignContentByStatus.unclaimed.length}</span>
                          <span className="campaign-status-chip">Claimed {selectedCampaignContentByStatus.claimed.length}</span>
                          <span className="campaign-status-chip">Posted {selectedCampaignContentByStatus.posted.length}</span>
                        </div>
                        <p className="campaign-card-copy">
                          Use these groups to gauge queue health before running reminders or export.
                        </p>
                        {selectedCampaignStats?.openSlotsThisWeek != null && (
                          <p className="campaign-card-copy">
                            Cadence: {selectedCampaignStats.cadenceLabel}
                            {' · '}
                            Open slots this week: {selectedCampaignStats.openSlotsThisWeek}
                            {' · '}
                            Scheduled this week: {selectedCampaignStats.scheduledThisWeek}
                            {selectedCampaignStats.nextOpenSlotDate ? ` · Next open slot: ${selectedCampaignStats.nextOpenSlotDate}` : ''}
                          </p>
                        )}
                        <div className="campaign-lifecycle-groups">
                          {selectedCampaignLifecycleGroups.map(group => (
                            <section key={`group-${group.key}`} className="campaign-lifecycle-group">
                              <div className="campaign-row-head">
                                <h5 className="campaign-card-title">{group.label} ({group.items.length})</h5>
                                {group.items.length > 3 && (
                                  <button
                                    type="button"
                                    className="btn btn--secondary btn--sm"
                                    onClick={() => {
                                      setContentLibraryViewMode('all')
                                      setContentLibraryFilters(prev => ({ ...prev, status: group.key as ContentLibraryFilters['status'], campaignId: selectedCampaign.id }))
                                      jumpTo('content')
                                    }}
                                  >
                                    View All
                                  </button>
                                )}
                              </div>
                              {group.items.length === 0 ? (
                                <p className="campaign-card-copy">No content in this state.</p>
                              ) : (
                                <ul className="campaign-detail-list">
                                  {group.items.slice(0, 3).map(item => (
                                    <li key={`${group.key}-${item.id}`} className="campaign-detail-list-item">
                                      <button
                                        type="button"
                                        className="btn btn--secondary btn--sm"
                                      onClick={() => openContentPanelFromInput(item.id)}
                                      >
                                        {item.title}
                                      </button>
                                      <span>{new Date(item.updated_at || item.created_at).toLocaleDateString()}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </section>
                          ))}
                        </div>
                      </article>
                      <article className="card campaign-card">
                        <h4 className="campaign-card-title">Upcoming Claimed</h4>
                        {selectedCampaignUpcomingClaimed.length === 0 ? (
                          <p className="campaign-card-copy">No upcoming claimed posts.</p>
                        ) : (
                          <ul className="campaign-detail-list">
                            {selectedCampaignUpcomingClaimed.map(item => (
                              <li key={`upcoming-${item.id}`} className="campaign-detail-list-item">
                                <button
                                  type="button"
                                  className="btn btn--secondary btn--sm"
                                  onClick={() => openContentPanelFromInput(item.id)}
                                >
                                  {item.title}
                                </button>
                                <span>{item.scheduled_for ? new Date(item.scheduled_for).toLocaleString() : 'Not scheduled'}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </article>
                      <article className="card campaign-card">
                        <h4 className="campaign-card-title">Recent Posted</h4>
                        {selectedCampaignRecentPosted.length === 0 ? (
                          <p className="campaign-card-copy">No posted items yet.</p>
                        ) : (
                          <ul className="campaign-detail-list">
                            {selectedCampaignRecentPosted.map(item => (
                              <li key={`posted-${item.id}`} className="campaign-detail-list-item">
                                <button
                                  type="button"
                                  className="btn btn--secondary btn--sm"
                                  onClick={() => openContentPanelFromInput(item.id)}
                                >
                                  {item.title}
                                </button>
                                <span>{item.posted_at ? new Date(item.posted_at).toLocaleString() : 'Posted'}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </article>
                      <article className="card campaign-card">
                        <h4 className="campaign-card-title">Activity Timeline</h4>
                        {selectedCampaignActivity.length === 0 ? (
                          <p className="campaign-card-copy">No activity logged yet for this campaign.</p>
                        ) : (
                          <ul className="campaign-detail-list">
                            {selectedCampaignActivity.map(log => (
                              <li key={log.id} className="campaign-detail-list-item">
                                <div className="campaign-detail-activity-copy">
                                  <span>{humanizeActionType(log.action_type)}</span>
                                  <span className="campaign-card-copy">
                                    By {log.performed_by || 'system'}
                                    {log.entity_type ? ` · ${log.entity_type}` : ''}
                                  </span>
                                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                                    <span className="campaign-card-copy">
                                      {JSON.stringify(log.metadata)}
                                    </span>
                                  )}
                                </div>
                                <span>{new Date(log.timestamp).toLocaleString()}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </article>
                    </div>
                  </>
                )}
              </article>
            )}

            {loading && <div className="card">Loading campaigns…</div>}
            {!loading && campaigns.length === 0 && <div className="card">No campaigns yet. Start with one campaign record.</div>}
            {campaigns.map(campaign => {
              const stats = campaignStatsById.get(campaign.id)
              const dateRangeLabel = campaign.start_date || campaign.end_date
                ? `${campaign.start_date || 'Start TBD'} to ${campaign.end_date || 'End TBD'}`
                : 'No date range set'
              return (
                <article key={campaign.id} className={'card campaign-card' + (selectedCampaignId === campaign.id ? ' campaign-card-focus' : '')}>
                  <div className="campaign-row-head">
                    <h3 className="campaign-card-title">{campaign.name}</h3>
                    <span className="campaign-pill">{campaign.status}</span>
                  </div>
                  <p className="campaign-card-copy">{campaign.target_audience || 'No target audience yet.'}</p>
                  <p className="campaign-card-copy">CTA: {campaign.primary_cta || 'Not set'}</p>
                  <p className="campaign-card-copy">Date range: {dateRangeLabel}</p>
                  <div className="campaign-status-grid" aria-label={`Campaign status counts for ${campaign.name}`}>
                    <span className="campaign-status-chip">Draft {stats?.draft || 0}</span>
                    <span className="campaign-status-chip">Review {stats?.needsReview || 0}</span>
                    <span className="campaign-status-chip">Unclaimed {stats?.unclaimed || 0}</span>
                    <span className="campaign-status-chip">Claimed {stats?.claimed || 0}</span>
                    <span className="campaign-status-chip">Posted {stats?.posted || 0}</span>
                  </div>
                  <p className="campaign-card-copy">
                    Cadence: {stats?.cadenceLabel || 'No cadence'}
                    {stats?.openSlotsThisWeek != null ? ` · Open slots this week: ${stats.openSlotsThisWeek}` : ''}
                    {stats?.openSlotsThisWeek != null ? ` · Scheduled this week: ${stats.scheduledThisWeek}` : ''}
                  </p>
                  {stats?.nextOpenSlotDate && (
                    <p className="campaign-cadence-note">Next open slot: {stats.nextOpenSlotDate}</p>
                  )}
                  <div className="campaign-card-actions">
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => setSelectedCampaignId(campaign.id)}
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => {
                        setFocusedCampaignId(campaign.id)
                        setCalendarFilters(previous => ({ ...previous, campaignId: campaign.id }))
                        jumpTo('calendar')
                      }}
                    >
                      Focus Schedule
                    </button>
                  </div>
                </article>
              )
            })}

            {campaigns.length > 0 && (
              <article className="card campaign-card">
                <h3 className="campaign-card-title">Campaign Schedule Density</h3>
                <p className="campaign-card-copy">
                  Next 14-day coverage by campaign cadence, scheduled posts, and open-slot pressure.
                </p>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Campaign focus</span>
                  <select
                    className="input"
                    aria-label="Campaign density focus"
                    value={focusedCampaignId}
                    onChange={(event) => setFocusedCampaignId(event.target.value)}
                  >
                    <option value="">Select campaign</option>
                    {campaigns.map(campaign => (
                      <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                    ))}
                  </select>
                </label>
                {!focusedCampaignDensity.campaign && (
                  <p className="campaign-card-copy">Select a campaign to view density and open-slot heatmap.</p>
                )}
                {focusedCampaignDensity.campaign && (
                  <>
                    <p className="campaign-card-copy">
                      Coverage: {focusedCampaignDensity.totalScheduled} scheduled / {focusedCampaignDensity.totalExpected || 0} expected
                      {' · '}
                      Open slots: {focusedCampaignDensity.totalOpen}
                      {' · '}
                      Missed: {focusedCampaignDensity.totalMissed}
                    </p>
                    <div className="campaign-density-grid" aria-label="Campaign schedule density heatmap">
                      {focusedCampaignDensity.dayRows.map(day => (
                        <div
                          key={day.dateKey}
                          className={'campaign-density-day campaign-density-day-' + day.status}
                          data-day-key={day.dateKey}
                        >
                          <span className="campaign-density-weekday">{day.weekdayLabel}</span>
                          <span className="campaign-density-date">{day.dateLabel}</span>
                          <span className="campaign-density-metric">
                            {day.status === 'open'
                              ? `Open ${day.openCount}`
                              : day.status === 'filled'
                                ? `Filled ${day.scheduledCount}`
                                : day.status === 'missed'
                                  ? `Missed ${day.missedCount}`
                                  : day.expectedCount > 0
                                    ? 'Covered'
                                    : 'Off'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="campaign-card-copy">
                      Legend: open = expected cadence slot not yet covered, filled = scheduled/posted coverage, missed = overdue claimed content.
                    </p>
                  </>
                )}
              </article>
            )}
            </section>
          )}

          {shouldRenderSection('content') && (
            <section id="campaigns-content" className="campaign-section">
            <h2 className="campaign-section-title">Content Library</h2>
            <p className="campaign-section-subtitle">Create drafts, submit for review, claim unclaimed content, and mark posted.</p>
            <form
              className="card campaign-form"
              onSubmit={(event) => {
                event.preventDefault()
                if (!contentDraft.title.trim() && !contentDraft.body.trim()) return
                void createContentDraftFromInput({
                  title: contentDraft.title,
                  body: contentDraft.body,
                  topic: contentDraft.topic,
                  contentType: contentDraft.contentType,
                  campaignId: contentDraft.campaignId || null,
                }).then(() => {
                  setContentDraft(prev => ({ ...prev, title: '', body: '', topic: '' }))
                }).catch(() => {})
              }}
            >
              <h3 className="campaign-card-title">Create Content Draft</h3>
              <input
                className="input"
                placeholder="Draft title"
                value={contentDraft.title}
                onChange={(event) => setContentDraft(prev => ({ ...prev, title: event.target.value }))}
              />
              <textarea
                className="ta"
                placeholder="Draft body"
                value={contentDraft.body}
                onChange={(event) => setContentDraft(prev => ({ ...prev, body: event.target.value }))}
              />
              <input
                className="input"
                placeholder="Topic"
                value={contentDraft.topic}
                onChange={(event) => setContentDraft(prev => ({ ...prev, topic: event.target.value }))}
              />
              <div className="campaign-chip-row">
                {CONTENT_TYPE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={'btn btn--secondary btn--sm' + (contentDraft.contentType === option.value ? ' campaign-chip-active' : '')}
                    onClick={() => setContentDraft(prev => ({ ...prev, contentType: option.value }))}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <CustomPicker
                options={campaignOptions}
                selected={contentDraft.campaignId}
                onChange={(value) => {
                  const next = Array.isArray(value) ? (value[0] || '') : value
                  setContentDraft(prev => ({ ...prev, campaignId: next }))
                }}
                placeholder="Attach campaign (optional)"
                showUnassigned={false}
              />
              <button className="btn btn--primary" type="submit" disabled={schemaMissing || policyBlocked}>Save Draft</button>
            </form>

            <article className="card campaign-card">
              <h3 className="campaign-card-title">Content Filters</h3>
              <div className="campaign-card-actions">
                <button
                  type="button"
                  className={'btn btn--secondary btn--sm' + (contentLibraryViewMode === 'action' ? ' campaign-chip-active' : '')}
                  onClick={() => setContentLibraryViewMode('action')}
                >
                  Action Queue
                </button>
                <button
                  type="button"
                  className={'btn btn--secondary btn--sm' + (contentLibraryViewMode === 'all' ? ' campaign-chip-active' : '')}
                  onClick={() => setContentLibraryViewMode('all')}
                >
                  All Content
                </button>
              </div>
              <p className="campaign-card-copy">
                Unclaimed: {contentActionSummary.unclaimed}
                {' · '}
                My Claimed: {contentActionSummary.myClaimed}
                {' · '}
                My Drafts: {contentActionSummary.myDrafts}
                {isAdmin ? ` · Needs Review: ${contentActionSummary.reviewQueue}` : ''}
              </p>
              <div className="campaign-form-grid">
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Search</span>
                  <input
                    className="input"
                    aria-label="Search content"
                    placeholder="Search title or topic"
                    value={contentLibraryFilters.query}
                    onChange={(event) => setContentLibraryFilters(prev => ({ ...prev, query: event.target.value }))}
                  />
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Status</span>
                  <select
                    className="input"
                    aria-label="Filter status"
                    value={contentLibraryFilters.status}
                    onChange={(event) => setContentLibraryFilters(prev => ({ ...prev, status: event.target.value as ContentLibraryFilters['status'] }))}
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="needs_review">Needs Review</option>
                    <option value="unclaimed">Unclaimed</option>
                    <option value="claimed">Claimed</option>
                    <option value="posted">Posted</option>
                  </select>
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Type</span>
                  <select
                    className="input"
                    aria-label="Filter content type"
                    value={contentLibraryFilters.contentType}
                    onChange={(event) => setContentLibraryFilters(prev => ({ ...prev, contentType: event.target.value as ContentLibraryFilters['contentType'] }))}
                  >
                    <option value="all">All Types</option>
                    {CONTENT_TYPE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Campaign</span>
                  <select
                    className="input"
                    aria-label="Filter campaign"
                    value={contentLibraryFilters.campaignId}
                    onChange={(event) => setContentLibraryFilters(prev => ({ ...prev, campaignId: event.target.value }))}
                  >
                    <option value="">All Campaigns</option>
                    {campaigns.map(campaign => (
                      <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                    ))}
                  </select>
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Ownership</span>
                  <select
                    className="input"
                    aria-label="Filter ownership"
                    value={contentLibraryFilters.ownership}
                    onChange={(event) => setContentLibraryFilters(prev => ({ ...prev, ownership: event.target.value as ContentLibraryOwnershipFilter }))}
                  >
                    <option value="all">All Ownership</option>
                    <option value="created-by-me">Created by Me</option>
                    <option value="claimed-by-me">Claimed by Me</option>
                    <option value="unclaimed">Unclaimed Only</option>
                  </select>
                </label>
              </div>
              {activeContentFilterChips.length > 0 && (
                <div className="campaign-chip-row">
                  {activeContentFilterChips.map(chip => (
                    <button
                      key={chip.id}
                      type="button"
                      className="btn btn--secondary btn--sm campaign-filter-chip"
                      onClick={chip.onRemove}
                    >
                      {chip.label} ✕
                    </button>
                  ))}
                </div>
              )}
                  <div className="campaign-card-actions">
                    {!campaignAssetsAvailable && (
                      <p className="campaign-card-rejection">Campaign assets are unavailable until campaign_assets is provisioned.</p>
                    )}
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={resetContentFiltersFromInput}
                >
                  Reset Content Filters
                </button>
              </div>
              <p className="campaign-card-copy">
                Showing {contentLibraryVisibleItems.length} of {contentItems.length} items.
              </p>
            </article>

            {!loading && contentItems.length === 0 && <div className="card">No content items yet.</div>}
            {!loading && contentItems.length > 0 && contentLibraryVisibleItems.length === 0 && (
              <div className="card">
                {contentLibraryViewMode === 'action'
                  ? 'No items in the action queue. Switch to All Content to browse historical/posted items.'
                  : 'No content matches current filters.'}
              </div>
            )}
            {contentLibraryVisibleItems.map(item => {
              const itemAssets = assetsByContentId.get(item.id) || []
              const assetDraft = assetDraftByContentId[item.id] || { title: '', url: '' }
              const assetUrlValid = !assetDraft.url.trim() || isHttpUrl(assetDraft.url)
              const postUrlDraft = postUrlDraftByContentId[item.id] ?? item.post_url ?? ''
              const postUrlValid = !postUrlDraft.trim() || isHttpUrl(postUrlDraft)
              const scheduleDraft = scheduleDraftByContentId[item.id] ?? toDateTimeLocalValue(item.scheduled_for)
              const scheduleIso = localDateTimeToIso(scheduleDraft)
              const canManageClaim = capabilityMatrix.canReleaseClaim(item)
              const canClaimItem = capabilityMatrix.canClaim(item)
              const canSubmitOwnDraft =
                capabilityMatrix.canEditOwnDraft(item)
                || (item.status === 'unclaimed' && item.created_by === appUser?.user_id)
              const canUpdatePostUrl = (
                item.status === 'draft'
                || item.status === 'claimed'
                || item.status === 'posted'
              ) && (item.posting_owner_id === appUser?.user_id || item.created_by === appUser?.user_id || isAdmin)
              return (
                <article key={item.id} className={'card campaign-card' + (contentFocusId === item.id ? ' campaign-card-focus' : '')}>
                  <div className="campaign-row-head">
                    <h3 className="campaign-card-title">{item.title}</h3>
                    <span className="campaign-pill">{item.status}</span>
                  </div>
                  <p className="campaign-card-copy">{item.topic} · {item.content_type}</p>
                  <p className="campaign-card-copy">{item.body || 'No body content.'}</p>
                  {item.campaign_id && (
                    <p className="campaign-card-copy">Campaign: {campaignNameById.get(item.campaign_id) || item.campaign_id}</p>
                  )}
                  {item.status === 'claimed' && (
                    <p className="campaign-card-copy">
                      Owner: {item.posting_owner_id || 'Unassigned'}
                      {item.scheduled_for ? ` · Scheduled: ${new Date(item.scheduled_for).toLocaleString()}` : ' · Unscheduled'}
                    </p>
                  )}
                  {item.status === 'posted' && (
                    <p className="campaign-card-copy">
                      Posted: {item.posted_at ? new Date(item.posted_at).toLocaleString() : 'n/a'}
                    </p>
                  )}
                  {item.rejection_reason && (
                    <p className="campaign-error-note">Rejected: {item.rejection_reason}</p>
                  )}

                  {itemAssets.length > 0 && (
                    <div className="campaign-assets">
                      {itemAssets.map(asset => (
                        <div key={asset.id} className="campaign-asset-row">
                          {asset.url ? (
                            <a href={asset.url} target="_blank" rel="noreferrer" className="campaign-asset-link">
                              {asset.title || asset.url}
                            </a>
                          ) : (
                            <span className="campaign-card-copy">{asset.title || 'Untitled asset'}</span>
                          )}
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => {
                              void removeAssetFromInput(asset.id).catch(() => {})
                            }}
                            disabled={schemaMissing || policyBlocked || !campaignAssetsAvailable}
                          >
                            Remove Asset
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="campaign-form-grid">
                    <input
                      className="input"
                      placeholder="Asset title"
                      value={assetDraft.title}
                      onChange={(event) => {
                        const nextTitle = event.target.value
                        setAssetDraftByContentId(prev => ({ ...prev, [item.id]: { ...assetDraft, title: nextTitle } }))
                      }}
                    />
                    <input
                      className="input"
                      placeholder="https://asset-link.example"
                      value={assetDraft.url}
                      onChange={(event) => {
                        const nextUrl = event.target.value
                        setAssetDraftByContentId(prev => ({ ...prev, [item.id]: { ...assetDraft, url: nextUrl } }))
                      }}
                    />
                  </div>
                  {!assetUrlValid && (
                    <p className="campaign-card-rejection">Asset URL must start with `http://` or `https://`.</p>
                  )}
                  <div className="campaign-chip-row">
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => {
                        void addAssetFromInput({
                          contentId: item.id,
                          campaignId: item.campaign_id || null,
                          title: assetDraft.title,
                          url: assetDraft.url,
                        }).then(() => {
                          setAssetDraftByContentId(prev => ({ ...prev, [item.id]: { title: '', url: '' } }))
                        }).catch(() => {})
                      }}
                      disabled={schemaMissing || policyBlocked || !campaignAssetsAvailable || !assetDraft.title.trim() || !assetDraft.url.trim() || !assetUrlValid}
                    >
                      Add Asset
                    </button>
                  </div>

                  {canUpdatePostUrl && (
                    <div className="campaign-card-actions">
                      <input
                        className="input campaign-inline-input"
                        placeholder="https://linkedin.com/posts/..."
                        value={postUrlDraft}
                        onChange={(event) => {
                          const nextUrl = event.target.value
                          setPostUrlDraftByContentId(prev => ({ ...prev, [item.id]: nextUrl }))
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => {
                          if (!postUrlDraft.trim()) return
                          void savePostUrlFromInput({ contentId: item.id, postUrl: postUrlDraft }).catch(() => {})
                        }}
                        disabled={schemaMissing || policyBlocked || !postUrlDraft.trim() || !postUrlValid}
                      >
                        Save Post URL
                      </button>
                    </div>
                  )}
                  {canUpdatePostUrl && !postUrlValid && (
                    <p className="campaign-card-rejection">Post URL must start with `http://` or `https://`.</p>
                  )}

                  {canManageClaim && (
                    <div className="campaign-card-actions">
                      <input
                        className="input campaign-inline-input"
                        type="datetime-local"
                        value={scheduleDraft}
                        onChange={(event) => {
                          const nextValue = event.target.value
                          setScheduleDraftByContentId(prev => ({ ...prev, [item.id]: nextValue }))
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => {
                          if (!scheduleIso) return
                          void updateScheduleFromInput({ contentId: item.id, scheduledFor: scheduleIso }).catch(() => {})
                        }}
                        disabled={schemaMissing || policyBlocked || !scheduleIso}
                      >
                        Save Schedule
                      </button>
                    </div>
                  )}

                  <div className="campaign-chip-row">
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => { void copyToClipboard(item.body || '') }}
                    >
                      Copy Body
                    </button>
                    {canSubmitOwnDraft && (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => {
                          void submitReviewFromInput({ contentId: item.id }).catch(() => {})
                        }}
                        disabled={policyBlocked}
                      >
                        Submit for Review
                      </button>
                    )}
                    {canClaimItem && (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => {
                          void claimFromInput({ contentId: item.id, intendedChannel: item.intended_channel || 'linkedin' }).catch(() => {})
                        }}
                        disabled={!canClaimItem || schemaMissing || policyBlocked}
                      >
                        Claim
                      </button>
                    )}
                    {canManageClaim && (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => {
                          void markPostedFromInput({ contentId: item.id }).catch(() => {})
                        }}
                        disabled={schemaMissing || policyBlocked}
                      >
                        Mark Posted
                      </button>
                    )}
                    {canManageClaim && (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => {
                          openReasonModalFromInput('content-unclaim', item)
                        }}
                        disabled={schemaMissing || policyBlocked || reasonModalRunning}
                      >
                        Unclaim
                      </button>
                    )}
                    {capabilityMatrix.canAdminOverride && (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => openAdminOverrideModalFromInput(item)}
                        disabled={schemaMissing || policyBlocked || adminOverrideRunning}
                      >
                        Admin Override
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
            </section>
          )}

          {shouldRenderSection('review') && (
            <section id="campaigns-review" className="campaign-section">
            <h2 className="campaign-section-title">Review Queue</h2>
            <p className="campaign-section-subtitle">Operational queue with urgency filters, ownership cues, and fast actions.</p>
            {!capabilityMatrix.canReview && <div className="card">Review actions are admin-only.</div>}
            {capabilityMatrix.canReview && (
              <article className="card campaign-card">
                <h3 className="campaign-card-title">Queue Controls</h3>
                <div className="campaign-form-grid">
                  <label className="campaign-filter-control">
                    <span className="campaign-card-copy">Sort Queue</span>
                    <select
                      className="input"
                      value={reviewQueueSort}
                      onChange={(event) => setReviewQueueSort(event.target.value as ReviewQueueSort)}
                    >
                      <option value="oldest">Oldest First</option>
                      <option value="newest">Newest First</option>
                      <option value="campaign">Campaign</option>
                      <option value="topic">Topic</option>
                    </select>
                  </label>
                  <label className="campaign-filter-control">
                    <span className="campaign-card-copy">Queue Filter</span>
                    <select
                      className="input"
                      value={reviewQueueFilter}
                      onChange={(event) => setReviewQueueFilter(event.target.value as ReviewQueueFilter)}
                    >
                      <option value="needs-review">Needs Review</option>
                      <option value="all">All Operational</option>
                      <option value="unclaimed">Unclaimed</option>
                      <option value="assigned-to-me">Assigned To Me</option>
                      <option value="changes-requested">Changes Requested</option>
                      <option value="approved-unscheduled">Approved-Unscheduled</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </label>
                  <div className="campaign-review-summary">
                    <p className="campaign-card-copy">
                      Selected {selectedReviewIds.length} of {reviewQueueNeedsReviewRows.length} needs-review rows
                    </p>
                  </div>
                </div>
                <div className="campaign-card-actions">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={selectAllReviewFromInput}
                    disabled={schemaMissing || policyBlocked || reviewBulkRunning || reviewQueueNeedsReviewRows.length === 0}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={clearReviewSelectionFromInput}
                    disabled={schemaMissing || policyBlocked || reviewBulkRunning || selectedReviewIds.length === 0}
                  >
                    Clear Selection
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => { void runBulkReviewFromInput('approve') }}
                    disabled={schemaMissing || policyBlocked || reviewBulkRunning || selectedReviewIds.length === 0}
                  >
                    Approve Selected
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      setReviewBulkRejectError(null)
                      setReviewBulkRejectReason('')
                      setReviewBulkRejectModalOpen(true)
                    }}
                    disabled={schemaMissing || policyBlocked || reviewBulkRunning || selectedReviewIds.length === 0}
                  >
                    Reject Selected
                  </button>
                </div>
                {reviewBulkMessage && (
                  <p className="campaign-card-copy">{reviewBulkMessage}</p>
                )}
              </article>
            )}
            {reviewBulkRejectModalOpen && (
              <div
                className="app-modal-overlay"
                onMouseDown={(event) => {
                  if (event.target !== event.currentTarget) return
                  if (reviewBulkRunning) return
                  setReviewBulkRejectModalOpen(false)
                  setReviewBulkRejectReason('')
                  setReviewBulkRejectError(null)
                }}
              >
                <div
                  className="app-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="campaign-bulk-reject-title"
                >
                  <h3 className="app-modal-title" id="campaign-bulk-reject-title">Reject Selected Content</h3>
                  <div className="app-modal-body">
                    <p className="campaign-card-copy">
                      Provide one rejection reason for all selected items ({selectedReviewIds.length} selected).
                    </p>
                    <textarea
                      className="app-modal-input"
                      aria-label="Bulk rejection reason"
                      rows={4}
                      value={reviewBulkRejectReason}
                      onChange={(event) => {
                        setReviewBulkRejectReason(event.target.value)
                        if (reviewBulkRejectError) setReviewBulkRejectError(null)
                      }}
                      placeholder="Reason for sending selected content back to draft"
                    />
                    {reviewBulkRejectError && (
                      <p className="campaign-card-rejection">{reviewBulkRejectError}</p>
                    )}
                  </div>
                  <div className="app-modal-actions">
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => {
                        if (reviewBulkRunning) return
                        setReviewBulkRejectModalOpen(false)
                        setReviewBulkRejectReason('')
                        setReviewBulkRejectError(null)
                      }}
                      disabled={reviewBulkRunning}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => {
                        void (async () => {
                          const ok = await runBulkReviewFromInput('reject', reviewBulkRejectReason)
                          if (!ok) return
                          setReviewBulkRejectModalOpen(false)
                          setReviewBulkRejectReason('')
                          setReviewBulkRejectError(null)
                        })()
                      }}
                      disabled={reviewBulkRunning}
                    >
                      Reject Selected
                    </button>
                  </div>
                </div>
              </div>
            )}
            {sortedReviewQueue.length === 0 && (
              <div className="card">
                {reviewQueueFilter === 'needs-review'
                  ? 'No content is waiting for review.'
                  : 'No queue rows match current review filter.'}
              </div>
            )}
            {sortedReviewQueue.map(item => {
              const canonicalStatus = canonicalStatusFromItem(item)
              return (
              <article key={item.id} className="card campaign-card">
                <div className="campaign-row-head">
                  <div className="campaign-review-title">
                    {capabilityMatrix.canReview && item.status === 'needs_review' && (
                      <label className="campaign-review-select">
                        <input
                          type="checkbox"
                          checked={!!reviewSelectedById[item.id]}
                          onChange={() => toggleReviewSelectedFromInput(item.id)}
                          disabled={schemaMissing || policyBlocked || reviewBulkRunning}
                          aria-label={`Select ${item.title}`}
                        />
                        <span className="campaign-card-copy">Select</span>
                      </label>
                    )}
                    <h3 className="campaign-card-title">{item.title}</h3>
                  </div>
                  <span className={'campaign-pill'
                    + (item.status === 'unclaimed' ? ' campaign-pill-open' : '')
                    + (item.status === 'claimed' && item.scheduled_for && new Date(item.scheduled_for).getTime() < Date.now() ? ' campaign-pill-overdue' : '')
                  }>
                    {item.status === 'unclaimed'
                      ? 'approved-unscheduled'
                      : `${formatCanonicalStatusLabel(canonicalStatus)} (${item.status})`}
                  </span>
                </div>
                <p className="campaign-card-copy">{item.topic} · submitted by {item.created_by}</p>
                <p className="campaign-card-copy">
                  Lifecycle: {formatCanonicalStatusLabel(canonicalStatus)}
                  {' · '}
                  Review: {item.review_status || (canonicalStatus === 'in_review' ? 'in_review' : canonicalStatus === 'changes_requested' ? 'changes_requested' : 'approved')}
                  {item.review_submitted_at ? ` · Submitted: ${new Date(item.review_submitted_at).toLocaleString()}` : ''}
                </p>
                <p className="campaign-card-copy">
                  Campaign: {item.campaign_id ? (campaignNameById.get(item.campaign_id) || item.campaign_id) : 'Unassigned'}
                  {' · '}
                  Channel: {item.intended_channel || 'linkedin'}
                </p>
                <p className="campaign-card-copy">
                  Claimed by: {item.posting_owner_id || 'Unassigned'}
                  {' · '}
                  Time in review: {item.status === 'needs_review'
                    ? `${Math.max(0, Math.floor((Date.now() - new Date(item.updated_at || item.created_at || 0).getTime()) / (1000 * 60 * 60)))}h`
                    : 'n/a'}
                  {' · '}
                  Due: {item.scheduled_for ? new Date(item.scheduled_for).toLocaleString() : 'Not scheduled'}
                </p>
                <p className="campaign-card-copy">
                  Priority: {item.status === 'claimed' && item.scheduled_for && new Date(item.scheduled_for).getTime() < Date.now()
                    ? 'Overdue'
                    : item.status === 'needs_review'
                      ? 'Waiting review'
                      : item.status === 'unclaimed'
                        ? 'Ready to schedule'
                        : 'Normal'}
                </p>
                {item.rejection_reason && (
                  <p className="campaign-card-rejection">{item.rejection_reason}</p>
                )}
                {!item.rejection_reason && item.review_feedback_summary && (
                  <p className="campaign-card-rejection">{item.review_feedback_summary}</p>
                )}
                <p className="campaign-card-copy">
                  Created: {item.created_at ? new Date(item.created_at).toLocaleString() : 'n/a'}
                  {item.campaign_id ? ` · Campaign: ${campaignNameById.get(item.campaign_id) || item.campaign_id}` : ''}
                </p>
                <div className="campaign-chip-row">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => openContentPanelFromInput(item.id)}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      void approveFromInput({ contentId: item.id }).catch(() => {})
                    }}
                    disabled={!capabilityMatrix.canReview || schemaMissing || policyBlocked || reviewBulkRunning || item.status !== 'needs_review'}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      openReasonModalFromInput('review-reject', item)
                    }}
                    disabled={!capabilityMatrix.canReview || schemaMissing || policyBlocked || reviewBulkRunning || reasonModalRunning || item.status !== 'needs_review'}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      const scheduledIso = localDateTimeToIso(scheduleDraftByContentId[item.id] || '')
                      void claimFromInput({
                        contentId: item.id,
                        intendedChannel: item.intended_channel || 'linkedin',
                        scheduledFor: scheduledIso || new Date().toISOString(),
                      }).catch(() => {})
                    }}
                    disabled={schemaMissing || policyBlocked || !capabilityMatrix.canClaim(item)}
                  >
                    {item.status === 'unclaimed' ? 'Claim & Schedule' : 'Schedule Approved Item'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      openReasonModalFromInput('content-unclaim', item)
                    }}
                    disabled={schemaMissing || policyBlocked || reasonModalRunning || !capabilityMatrix.canReleaseClaim(item)}
                  >
                    Release Claim
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      void reassignClaimToMeFromInput(item.id).catch(() => {})
                    }}
                    disabled={!capabilityMatrix.canReassignToMe(item) || schemaMissing || policyBlocked}
                  >
                    Reassign To Me
                  </button>
                </div>
                {(item.status === 'unclaimed' || item.status === 'claimed') && (
                  <label className="campaign-filter-control">
                    <span className="campaign-card-copy">{item.status === 'claimed' ? 'Reschedule' : 'Schedule'}</span>
                    <div className="campaign-card-actions">
                      <input
                        className="input campaign-inline-input"
                        type="datetime-local"
                        value={scheduleDraftByContentId[item.id] || toDateTimeLocalValue(item.scheduled_for)}
                        onChange={(event) => setScheduleDraftByContentId(prev => ({ ...prev, [item.id]: event.target.value }))}
                      />
                      {item.status === 'claimed' && (
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => {
                            const iso = localDateTimeToIso(scheduleDraftByContentId[item.id] || '')
                            if (!iso) return
                            void updateScheduleFromInput({ contentId: item.id, scheduledFor: iso }).catch(() => {})
                          }}
                          disabled={schemaMissing || policyBlocked}
                        >
                          Reschedule
                        </button>
                      )}
                    </div>
                  </label>
                )}
              </article>
            )})}
            </section>
          )}

          {shouldRenderSection('calendar') && (
            <section id="campaigns-calendar" className="campaign-section">
            <h2 className="campaign-section-title">Calendar and Reminders</h2>
            <p className="campaign-section-subtitle">Date-grouped visibility for scheduled, posted, missed, plus approved-unscheduled operations.</p>
            <article className="card campaign-card">
              <h3 className="campaign-card-title">Calendar Filters</h3>
              <div className="campaign-form-grid">
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Search</span>
                  <input
                    className="input"
                    aria-label="Search claimed content"
                    placeholder="Search claimed content"
                    value={calendarFilters.query}
                    onChange={(event) => setCalendarFilters(prev => ({ ...prev, query: event.target.value }))}
                  />
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Sort</span>
                  <select
                    className="input"
                    aria-label="Sort claimed content"
                    value={calendarSort}
                    onChange={(event) => setCalendarSort(event.target.value as CalendarSort)}
                  >
                    <option value="overdue-first">Overdue First</option>
                    <option value="soonest">Soonest</option>
                    <option value="latest">Latest</option>
                    <option value="title">Title</option>
                  </select>
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Timing</span>
                  <select
                    className="input"
                    aria-label="Filter claimed timing"
                    value={calendarFilters.timing}
                    onChange={(event) => setCalendarFilters(prev => ({ ...prev, timing: event.target.value as CalendarTimingFilter }))}
                  >
                    <option value="all">All Timing</option>
                    <option value="overdue">Overdue</option>
                    <option value="today">Today</option>
                    <option value="next-7">Next 7 Days</option>
                    <option value="unscheduled">Unscheduled</option>
                  </select>
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Campaign</span>
                  <select
                    className="input"
                    aria-label="Filter claimed campaign"
                    value={calendarFilters.campaignId}
                    onChange={(event) => setCalendarFilters(prev => ({ ...prev, campaignId: event.target.value }))}
                  >
                    <option value="">All Campaigns</option>
                    {campaigns.map(campaign => (
                      <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                    ))}
                  </select>
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Channel</span>
                  <select
                    className="input"
                    aria-label="Filter claimed channel"
                    value={calendarFilters.channel}
                    onChange={(event) => setCalendarFilters(prev => ({ ...prev, channel: event.target.value }))}
                  >
                    <option value="all">All Channels</option>
                    {calendarChannelOptions.map(channel => (
                      <option key={channel} value={channel}>{channel}</option>
                    ))}
                  </select>
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Ownership</span>
                  <select
                    className="input"
                    aria-label="Filter claimed ownership"
                    value={calendarFilters.ownership}
                    onChange={(event) => setCalendarFilters(prev => ({ ...prev, ownership: event.target.value as CalendarFilters['ownership'] }))}
                  >
                    <option value="all">All Claimed</option>
                    <option value="mine">My Claimed</option>
                  </select>
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Calendar view</span>
                  <select
                    className="input"
                    aria-label="Calendar view"
                    value={calendarView}
                    onChange={(event) => setCalendarView(event.target.value as CalendarView)}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="list">List (14 Days)</option>
                  </select>
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Reference date</span>
                  <input
                    className="input"
                    aria-label="Calendar reference date"
                    type="date"
                    value={calendarCursorDate}
                    onChange={(event) => setCalendarCursorDate(event.target.value)}
                  />
                </label>
              </div>
              <div className="campaign-card-actions campaign-calendar-nav">
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => shiftCalendarWindowFromInput('prev')}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => setCalendarCursorDate(toDateInputValue(new Date()))}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => shiftCalendarWindowFromInput('next')}
                >
                  Next
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={resetCalendarFiltersFromInput}
                >
                  Reset Calendar Filters
                </button>
              </div>
              {activeCalendarFilterChips.length > 0 && (
                <div className="campaign-chip-row">
                  {activeCalendarFilterChips.map(chip => (
                    <button
                      key={chip.id}
                      type="button"
                      className="btn btn--secondary btn--sm campaign-filter-chip"
                      onClick={chip.onRemove}
                    >
                      {chip.label} ✕
                    </button>
                  ))}
                </div>
              )}
              <p className="campaign-card-copy campaign-calendar-window">
                Window: {calendarWindow.label}
              </p>
              <p className="campaign-card-copy">
                Showing {sortedMyClaimed.length} of {calendarFilters.ownership === 'mine' ? myClaimed.length : allClaimed.length} claimed items.
              </p>
            </article>

            <article className="card campaign-card">
              <h3 className="campaign-card-title">Calendar Timeline</h3>
              <p className="campaign-card-copy">
                Grouped by date for this window, including claimed, posted, missed, and computed open slots.
              </p>
              {calendarTimelineGroups.length === 0 ? (
                <p className="campaign-card-copy">No scheduled activity or open slots in this window.</p>
              ) : (
                <div className="campaign-timeline-groups">
                  {calendarTimelineGroups.map(group => (
                    <section key={group.dateKey} className="campaign-timeline-group">
                      <h4 className="campaign-timeline-date">{group.dateLabel}</h4>
                      <ul className="campaign-timeline-list">
                        {group.entries.map(entry => (
                          <li key={entry.id} className="campaign-timeline-item">
                            <div className="campaign-row-head">
                              <p className="campaign-card-title">{entry.title}</p>
                              <span className={'campaign-pill campaign-timeline-kind campaign-timeline-kind-' + entry.kind + (entry.kind === 'missed' ? ' campaign-pill-overdue' : '')}>
                                {entry.kind === 'claimed'
                                  ? 'claimed'
                                  : entry.kind === 'posted'
                                    ? 'posted'
                                    : entry.kind === 'missed'
                                      ? 'missed'
                                      : 'open slot'}
                              </span>
                            </div>
                            <p className="campaign-card-copy">
                              {entry.detail}
                              {entry.kind !== 'open-slot' ? ` · ${entry.startsAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
                              {' · '}
                              {entry.campaignLabel}
                              {entry.channel ? ` · ${entry.channel}` : ''}
                            </p>
                            {entry.contentId && (
                              <div className="campaign-card-actions">
                                <button
                                  type="button"
                                  className="btn btn--secondary btn--sm"
                                  onClick={() => focusContentFromInput(entry.contentId || '')}
                                >
                                  Open Content
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </article>

            <article className="card campaign-card">
              <h3 className="campaign-card-title">Approved-Unscheduled Lane</h3>
              <p className="campaign-card-copy">
                Items approved into queue but not yet scheduled. Use quick schedule controls to close gaps.
              </p>
              {approvedUnscheduledRows.length === 0 && (
                <p className="campaign-card-copy">No approved-unscheduled items for current campaign/channel filters.</p>
              )}
              {approvedUnscheduledRows.map(item => (
                <article key={`unscheduled-${item.id}`} className="campaign-schedule-row">
                  <div>
                    <p className="campaign-schedule-title">{item.title}</p>
                    <p className="campaign-schedule-meta">
                      {item.campaign_id ? (campaignNameById.get(item.campaign_id) || item.campaign_id) : 'Unassigned'}
                      {' · '}
                      {item.intended_channel || 'linkedin'}
                    </p>
                  </div>
                  <div className="campaign-card-actions">
                    <input
                      className="input campaign-inline-input"
                      type="datetime-local"
                      value={scheduleDraftByContentId[item.id] || toDateTimeLocalValue(item.scheduled_for)}
                      onChange={(event) => setScheduleDraftByContentId(prev => ({ ...prev, [item.id]: event.target.value }))}
                    />
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => {
                        const iso = localDateTimeToIso(scheduleDraftByContentId[item.id] || '')
                        if (!iso) return
                        void claimFromInput({
                          contentId: item.id,
                          intendedChannel: item.intended_channel || 'linkedin',
                          scheduledFor: iso,
                        }).catch(() => {})
                      }}
                      disabled={schemaMissing || policyBlocked || !capabilityMatrix.canClaim(item)}
                    >
                      Schedule & Claim
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => openContentPanelFromInput(item.id)}
                    >
                      Open Content
                    </button>
                  </div>
                </article>
              ))}
            </article>

            <article className="card campaign-card">
              <h3 className="campaign-card-title">My Claimed Queue</h3>
              {myClaimed.length === 0 && <p className="campaign-card-copy">No claimed content assigned to you.</p>}
              {myClaimed.length > 0 && sortedMyClaimed.length === 0 && (
                <p className="campaign-card-copy">No claimed content matches current calendar filters.</p>
              )}
            </article>
            {sortedMyClaimed.map(item => {
              const canManageClaim = capabilityMatrix.canReleaseClaim(item)
              return (
              <article key={item.id} className="card campaign-card">
                <div className="campaign-row-head">
                  <h3 className="campaign-card-title">{item.title}</h3>
                  <div className="campaign-chip-row">
                    <span className="campaign-pill">{item.intended_channel || 'linkedin'}</span>
                    {item.scheduled_for && new Date(item.scheduled_for).getTime() < Date.now() && (
                      <span className="campaign-pill campaign-pill-overdue">overdue</span>
                    )}
                  </div>
                </div>
                <p className="campaign-card-copy">Scheduled for: {item.scheduled_for ? new Date(item.scheduled_for).toLocaleString() : 'Not scheduled'}</p>
                {item.campaign_id && (
                  <p className="campaign-card-copy">Campaign: {campaignNameById.get(item.campaign_id) || item.campaign_id}</p>
                )}
                <div className="campaign-chip-row">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => { void copyToClipboard(item.body || '') }}
                  >
                    Copy Body
                  </button>
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => downloadIcs(item)}>
                    Download ICS
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => focusContentFromInput(item.id)}
                  >
                    Open in Library
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      void markPostedFromInput({ contentId: item.id, postUrl: item.post_url || undefined }).catch(() => {})
                    }}
                    disabled={schemaMissing || policyBlocked || !canManageClaim}
                  >
                    Mark Posted
                  </button>
                </div>
                <div className="campaign-card-actions">
                  <input
                    className="input campaign-inline-input"
                    type="datetime-local"
                    value={scheduleDraftByContentId[item.id] || toDateTimeLocalValue(item.scheduled_for)}
                    onChange={(event) => setScheduleDraftByContentId(prev => ({ ...prev, [item.id]: event.target.value }))}
                  />
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      const iso = localDateTimeToIso(scheduleDraftByContentId[item.id] || '')
                      if (!iso) return
                      void updateScheduleFromInput({ contentId: item.id, scheduledFor: iso }).catch(() => {})
                    }}
                    disabled={schemaMissing || policyBlocked || !canManageClaim}
                  >
                    Reschedule
                  </button>
                </div>
              </article>
            )})}
            </section>
          )}

          {shouldRenderSection('reminders') && (
            <section id="campaigns-reminders" className="campaign-section">
            <h2 className="campaign-section-title">Reminders Workspace</h2>
            <p className="campaign-section-subtitle">Task-style reminder operations with quick create/edit/complete/snooze/delete actions.</p>

            <article className="card campaign-card">
              <h3 className="campaign-card-title">Create or Edit Reminder</h3>
              <div className="campaign-form-grid">
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Content</span>
                  <select
                    className="input"
                    value={reminderEditor.contentId}
                    onChange={(event) => setReminderEditor(prev => ({ ...prev, contentId: event.target.value }))}
                  >
                    <option value="">Select Content</option>
                    {contentItems.map(item => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                  </select>
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Assigned User</span>
                  <select
                    className="input"
                    value={reminderEditor.userId}
                    onChange={(event) => setReminderEditor(prev => ({ ...prev, userId: event.target.value }))}
                  >
                    <option value="">Select User</option>
                    {reminderAssignableUsers.map(userId => (
                      <option key={userId} value={userId}>{userId}</option>
                    ))}
                  </select>
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Reminder Type</span>
                  <select
                    className="input"
                    value={reminderEditor.reminderType}
                    onChange={(event) => setReminderEditor(prev => ({ ...prev, reminderType: event.target.value as CampaignReminder['reminder_type'] }))}
                  >
                    <option value="in-app">In-App</option>
                    <option value="ics">ICS</option>
                    <option value="email">Email</option>
                    <option value="slack">Slack</option>
                  </select>
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Due</span>
                  <input
                    className="input"
                    type="datetime-local"
                    value={reminderEditor.scheduledFor}
                    onChange={(event) => setReminderEditor(prev => ({ ...prev, scheduledFor: event.target.value }))}
                  />
                </label>
              </div>
              <div className="campaign-card-actions">
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => {
                    const iso = localDateTimeToIso(reminderEditor.scheduledFor || '')
                    if (!iso || !reminderEditor.contentId || !reminderEditor.userId) return
                    void addReminderFromInput({
                      contentId: reminderEditor.contentId,
                      scheduledFor: iso,
                      reminderType: reminderEditor.reminderType,
                    }).catch(() => {})
                  }}
                  disabled={schemaMissing || policyBlocked || !reminderEditor.contentId || !reminderEditor.userId}
                >
                  Create Reminder
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => {
                    setReminderEditor({
                      contentId: '',
                      userId: appUser?.user_id || '',
                      reminderType: 'in-app',
                      scheduledFor: '',
                    })
                  }}
                >
                  Reset
                </button>
              </div>
            </article>

            {reminderRows.length === 0 && (
              <article className="card campaign-card">
                <h3 className="campaign-card-title">Reminder Rows</h3>
                <p className="campaign-card-copy">No reminders yet. Create one above to start managing follow-ups.</p>
              </article>
            )}

            {reminderRows.map(row => (
              <article
                key={row.reminder.id}
                className={'card campaign-card' + (row.isOverdue ? ' campaign-warning-card' : '') + (row.reminder.status === 'sent' ? ' campaign-reminder-complete' : '')}
              >
                <div className="campaign-row-head">
                  <h3 className="campaign-card-title">{row.content?.title || `Content ${row.reminder.content_id}`}</h3>
                  <span className={'campaign-pill' + (row.isOverdue ? ' campaign-pill-overdue' : '')}>
                    {row.isOverdue ? 'overdue' : row.reminder.status}
                  </span>
                </div>
                <p className="campaign-card-copy">
                  Campaign: {row.campaignLabel}
                  {' · '}
                  Assigned: {row.reminder.user_id}
                  {' · '}
                  Type: {row.reminder.reminder_type}
                </p>
                <p className="campaign-card-copy">
                  Due: {new Date(row.reminder.scheduled_for).toLocaleString()}
                  {' · '}
                  Notes: {row.reminder.failure_reason || 'None'}
                </p>
                <div className="campaign-card-actions">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      void updateReminderFromInput(row.reminder.id, {
                        status: 'sent',
                        sentAt: new Date().toISOString(),
                        failureReason: null,
                      }).catch(() => {})
                    }}
                    disabled={schemaMissing || policyBlocked || row.reminder.status === 'sent'}
                  >
                    Mark Complete
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      const due = new Date(row.reminder.scheduled_for)
                      due.setHours(due.getHours() + 24)
                      void updateReminderFromInput(row.reminder.id, {
                        scheduledFor: due.toISOString(),
                        status: 'pending',
                        sentAt: null,
                        failureReason: null,
                      }).catch(() => {})
                    }}
                    disabled={schemaMissing || policyBlocked}
                  >
                    Snooze +24h
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      void updateReminderFromInput(row.reminder.id, { userId: appUser?.user_id || row.reminder.user_id }).catch(() => {})
                    }}
                    disabled={schemaMissing || policyBlocked || !appUser?.user_id}
                  >
                    Reassign To Me
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      void deleteReminderFromInput(row.reminder.id).catch(() => {})
                    }}
                    disabled={schemaMissing || policyBlocked}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      setReminderEditor({
                        contentId: row.reminder.content_id,
                        userId: row.reminder.user_id,
                        reminderType: row.reminder.reminder_type,
                        scheduledFor: toDateTimeLocalValue(row.reminder.scheduled_for),
                      })
                    }}
                  >
                    Edit Draft
                  </button>
                </div>
              </article>
            ))}
            </section>
          )}

          {shouldRenderSection('automation') && (
            <section id="campaigns-automation" className="campaign-section">
              <h2 className="campaign-section-title">Automation Journey and Timeline</h2>
              <p className="campaign-section-subtitle">Visual journey orchestration with execution evidence and export.</p>
              {!selectedCampaign && (
                <article className="card campaign-card">
                  <h3 className="campaign-card-title">No Campaign Selected</h3>
                  <p className="campaign-card-copy">Select a campaign from workspace context to edit or inspect automation journey state.</p>
                </article>
              )}
              {selectedCampaign && (
                <>
                  <article className="card campaign-card">
                    <div className="campaign-row-head">
                      <div>
                        <h3 className="campaign-card-title">Journey Canvas</h3>
                        <p className="campaign-card-copy">
                          {isAdmin
                            ? 'Action, decision, and condition nodes are editable and publish as versioned graph snapshots.'
                            : 'Read-only mode. Campaign-admin capability is required to publish journey changes.'}
                        </p>
                      </div>
                      <div className="campaign-card-actions">
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => setJourneyNodeDrafts(previous => [...previous, createDefaultJourneyNodeDraft('action')])}
                          disabled={!isAdmin}
                        >
                          Add Action
                        </button>
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => setJourneyNodeDrafts(previous => [...previous, createDefaultJourneyNodeDraft('decision')])}
                          disabled={!isAdmin}
                        >
                          Add Decision
                        </button>
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => setJourneyNodeDrafts(previous => [...previous, createDefaultJourneyNodeDraft('condition')])}
                          disabled={!isAdmin}
                        >
                          Add Condition
                        </button>
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          onClick={() => { void saveJourneyGraphFromInput() }}
                          disabled={!isAdmin || journeySaving}
                        >
                          {journeySaving ? 'Publishing…' : 'Publish Journey'}
                        </button>
                      </div>
                    </div>
                    <p className="campaign-card-copy">
                      Current version: {journeyGraphMeta?.version || 0}
                      {journeyGraphMeta?.published_at ? ` · Published ${new Date(journeyGraphMeta.published_at).toLocaleString()}` : ''}
                      {journeyGraphMeta?.published_by ? ` · by ${journeyGraphMeta.published_by}` : ''}
                    </p>
                    <div className="campaign-grid">
                      {journeyNodeDrafts.map((node, index) => (
                        <article
                          key={`journey-node-${node.id}-${index}`}
                          className={'card campaign-card' + (highlightedJourneyNodeId && highlightedJourneyNodeId === node.id ? ' campaign-card-highlighted' : '')}
                        >
                          <div className="campaign-row-head">
                            <p className="campaign-card-title">{node.title || `Node ${index + 1}`}</p>
                            <span className="campaign-pill">{node.type}</span>
                          </div>
                          <div className="campaign-form-grid">
                            <label className="campaign-filter-control">
                              <span className="campaign-card-copy">Node ID</span>
                              <input
                                className="input"
                                value={node.id}
                                disabled={!isAdmin}
                                onChange={(event) => setJourneyNodeDrafts(previous => previous.map((row, rowIndex) => (
                                  rowIndex === index ? { ...row, id: event.target.value } : row
                                )))}
                              />
                            </label>
                            <label className="campaign-filter-control">
                              <span className="campaign-card-copy">Type</span>
                              <select
                                className="input"
                                value={node.type}
                                disabled={!isAdmin}
                                onChange={(event) => setJourneyNodeDrafts(previous => previous.map((row, rowIndex) => (
                                  rowIndex === index ? { ...row, type: event.target.value as CampaignJourneyNodeType } : row
                                )))}
                              >
                                <option value="action">action</option>
                                <option value="decision">decision</option>
                                <option value="condition">condition</option>
                              </select>
                            </label>
                            <label className="campaign-filter-control">
                              <span className="campaign-card-copy">Title</span>
                              <input
                                className="input"
                                value={node.title}
                                disabled={!isAdmin}
                                onChange={(event) => setJourneyNodeDrafts(previous => previous.map((row, rowIndex) => (
                                  rowIndex === index ? { ...row, title: event.target.value } : row
                                )))}
                              />
                            </label>
                            <label className="campaign-filter-control">
                              <span className="campaign-card-copy">Next Node IDs (comma-separated)</span>
                              <input
                                className="input"
                                value={node.nextNodeIdsCsv}
                                disabled={!isAdmin}
                                onChange={(event) => setJourneyNodeDrafts(previous => previous.map((row, rowIndex) => (
                                  rowIndex === index ? { ...row, nextNodeIdsCsv: event.target.value } : row
                                )))}
                              />
                            </label>
                            <label className="campaign-filter-control">
                              <span className="campaign-card-copy">Positive Branch Node ID</span>
                              <input
                                className="input"
                                value={node.branchPositiveNodeId}
                                disabled={!isAdmin}
                                onChange={(event) => setJourneyNodeDrafts(previous => previous.map((row, rowIndex) => (
                                  rowIndex === index ? { ...row, branchPositiveNodeId: event.target.value } : row
                                )))}
                              />
                            </label>
                            <label className="campaign-filter-control">
                              <span className="campaign-card-copy">Negative Branch Node ID</span>
                              <input
                                className="input"
                                value={node.branchNegativeNodeId}
                                disabled={!isAdmin}
                                onChange={(event) => setJourneyNodeDrafts(previous => previous.map((row, rowIndex) => (
                                  rowIndex === index ? { ...row, branchNegativeNodeId: event.target.value } : row
                                )))}
                              />
                            </label>
                          </div>
                          <label className="campaign-filter-control">
                            <span className="campaign-card-copy">Config (JSON)</span>
                            <textarea
                              className="input"
                              rows={5}
                              value={node.configJson}
                              disabled={!isAdmin}
                              onChange={(event) => setJourneyNodeDrafts(previous => previous.map((row, rowIndex) => (
                                rowIndex === index ? { ...row, configJson: event.target.value } : row
                              )))}
                            />
                          </label>
                          <div className="campaign-card-actions">
                            <button
                              type="button"
                              className="btn btn--secondary btn--sm"
                              onClick={() => setHighlightedJourneyNodeId(node.id)}
                            >
                              Highlight
                            </button>
                            <button
                              type="button"
                              className="btn btn--secondary btn--sm"
                              onClick={() => setJourneyNodeDrafts(previous => previous.filter((_, rowIndex) => rowIndex !== index))}
                              disabled={!isAdmin || journeyNodeDrafts.length <= 1}
                            >
                              Remove Node
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </article>

                  <article className="card campaign-card">
                    <div className="campaign-row-head">
                      <div>
                        <h3 className="campaign-card-title">Execution Timeline</h3>
                        <p className="campaign-card-copy">
                          Timeline includes node executions and publish actions. Select entries to highlight linked nodes.
                        </p>
                      </div>
                      <div className="campaign-card-actions">
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => { void exportJourneyTimelineFromInput('csv') }}
                        >
                          Export CSV
                        </button>
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => { void exportJourneyTimelineFromInput('json') }}
                        >
                          Export JSON
                        </button>
                      </div>
                    </div>
                    <div className="campaign-form-grid">
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Start Date</span>
                        <input
                          className="input"
                          type="date"
                          value={journeyTimelineFilters.startDate}
                          onChange={(event) => setJourneyTimelineFilters(previous => ({ ...previous, startDate: event.target.value }))}
                        />
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">End Date</span>
                        <input
                          className="input"
                          type="date"
                          value={journeyTimelineFilters.endDate}
                          onChange={(event) => setJourneyTimelineFilters(previous => ({ ...previous, endDate: event.target.value }))}
                        />
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Node Type</span>
                        <select
                          className="input"
                          value={journeyTimelineFilters.nodeType}
                          onChange={(event) => setJourneyTimelineFilters(previous => ({ ...previous, nodeType: event.target.value as CampaignJourneyNodeType | '' }))}
                        >
                          <option value="">All node types</option>
                          <option value="action">action</option>
                          <option value="decision">decision</option>
                          <option value="condition">condition</option>
                        </select>
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Branch Outcome</span>
                        <select
                          className="input"
                          value={journeyTimelineFilters.branchOutcome}
                          onChange={(event) => setJourneyTimelineFilters(previous => ({ ...previous, branchOutcome: event.target.value as CampaignJourneyBranchOutcome | '' }))}
                        >
                          <option value="">All outcomes</option>
                          <option value="positive">positive</option>
                          <option value="negative">negative</option>
                        </select>
                      </label>
                    </div>
                    <div className="campaign-card-actions">
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => { void loadJourneyTimelineFromInput(0) }}
                        disabled={journeyTimelineLoading}
                      >
                        {journeyTimelineLoading ? 'Loading…' : 'Apply Timeline Filters'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => {
                          setJourneyTimelineFilters({ startDate: '', endDate: '', nodeType: '', branchOutcome: '' })
                          void loadJourneyTimelineFromInput(0)
                        }}
                      >
                        Reset Timeline Filters
                      </button>
                    </div>
                    <p className="campaign-card-copy">
                      Freshness: {journeyTimelineGeneratedAt ? new Date(journeyTimelineGeneratedAt).toLocaleString() : 'n/a'}
                    </p>
                    {journeyTimelineEntries.length === 0 && !journeyTimelineLoading && (
                      <p className="campaign-card-copy">No timeline entries match current filters.</p>
                    )}
                    <div className="campaign-timeline-groups">
                      {journeyTimelineEntries.map(entry => (
                        <article key={entry.id} className={'campaign-timeline-item' + (entry.node_id && highlightedJourneyNodeId === entry.node_id ? ' campaign-card-highlighted' : '')}>
                          <div className="campaign-row-head">
                            <p className="campaign-card-title">{entry.message}</p>
                            <span className="campaign-pill">{entry.node_type || 'publish'}</span>
                          </div>
                          <p className="campaign-card-copy">
                            {entry.branch_outcome !== 'n/a' ? `${entry.branch_outcome} · ` : ''}
                            {entry.actor_type}
                            {entry.actor_user_id ? `:${entry.actor_user_id}` : ''}
                            {' · '}
                            {new Date(entry.timestamp).toLocaleString()}
                          </p>
                          {entry.node_id && (
                            <div className="campaign-card-actions">
                              <button
                                type="button"
                                className="btn btn--secondary btn--sm"
                                onClick={() => setHighlightedJourneyNodeId(entry.node_id || '')}
                              >
                                Highlight Node
                              </button>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                    {journeyTimelineHasMore && (
                      <div className="campaign-card-actions">
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => { void loadJourneyTimelineFromInput(journeyTimelineOffset + 25) }}
                          disabled={journeyTimelineLoading}
                        >
                          {journeyTimelineLoading ? 'Loading…' : 'Load More'}
                        </button>
                      </div>
                    )}
                  </article>

                  <article className="card campaign-card">
                    <div className="campaign-row-head">
                      <div>
                        <h3 className="campaign-card-title">Planning Board</h3>
                        <p className="campaign-card-copy">
                          Define objective, audience, channel mix, CTA, and success metrics before going live.
                        </p>
                      </div>
                      <span className="campaign-pill">
                        Completeness {planningBoardCompleteness.completeCount}/{planningBoardCompleteness.totalCount}
                      </span>
                    </div>
                    <div className="campaign-form-grid">
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Objective</span>
                        <input
                          className="input"
                          value={planningBoardDraft.objective}
                          onChange={(event) => setPlanningBoardDraft(previous => ({ ...previous, objective: event.target.value }))}
                        />
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Target Audience</span>
                        <input
                          className="input"
                          value={planningBoardDraft.targetAudience}
                          onChange={(event) => setPlanningBoardDraft(previous => ({ ...previous, targetAudience: event.target.value }))}
                        />
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Channel Mix</span>
                        <input
                          className="input"
                          value={planningBoardDraft.channelMix}
                          onChange={(event) => setPlanningBoardDraft(previous => ({ ...previous, channelMix: event.target.value }))}
                          placeholder="linkedin, email, site-banner"
                        />
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">CTA</span>
                        <input
                          className="input"
                          value={planningBoardDraft.cta}
                          onChange={(event) => setPlanningBoardDraft(previous => ({ ...previous, cta: event.target.value }))}
                        />
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Success Metrics</span>
                        <input
                          className="input"
                          value={planningBoardDraft.successMetrics}
                          onChange={(event) => setPlanningBoardDraft(previous => ({ ...previous, successMetrics: event.target.value }))}
                          placeholder="CTR > 2%, MQL >= 30"
                        />
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Planning Status</span>
                        <select
                          className="input"
                          value={planningBoardDraft.status}
                          onChange={(event) => setPlanningBoardDraft(previous => ({ ...previous, status: event.target.value as CampaignPlanningBoardStatus }))}
                        >
                          <option value="draft">draft</option>
                          <option value="ready">ready</option>
                          <option value="live">live</option>
                          <option value="paused">paused</option>
                        </select>
                      </label>
                    </div>
                    {!planningBoardCompleteness.isComplete && (
                      <p className="campaign-card-rejection">Missing required planning fields. Complete all five fields before launch readiness.</p>
                    )}
                    <div className="campaign-card-actions">
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => { void savePlanningBoardFromInput() }}
                        disabled={planningBoardSaving}
                      >
                        {planningBoardSaving ? 'Saving…' : 'Save Planning Board'}
                      </button>
                    </div>
                  </article>

                  <article className="card campaign-card">
                    <div className="campaign-row-head">
                      <div>
                        <h3 className="campaign-card-title">Focus Item Workspace</h3>
                        <p className="campaign-card-copy">
                          Configure on-site prompts (`collect_data`, `display_notice`, `emphasize_link`) and link them to journey nodes.
                        </p>
                      </div>
                      <span className="campaign-pill">
                        Impressions {focusTotals.impressions} · Conversions {focusTotals.conversions} · CVR {focusTotals.conversionRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="campaign-form-grid">
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Type</span>
                        <select
                          className="input"
                          value={focusItemDraft.type}
                          onChange={(event) => setFocusItemDraft(previous => ({ ...previous, type: event.target.value as CampaignFocusItemType }))}
                        >
                          <option value="collect_data">collect_data</option>
                          <option value="display_notice">display_notice</option>
                          <option value="emphasize_link">emphasize_link</option>
                        </select>
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Title</span>
                        <input
                          className="input"
                          value={focusItemDraft.title}
                          onChange={(event) => setFocusItemDraft(previous => ({ ...previous, title: event.target.value }))}
                        />
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Message</span>
                        <input
                          className="input"
                          value={focusItemDraft.message}
                          onChange={(event) => setFocusItemDraft(previous => ({ ...previous, message: event.target.value }))}
                        />
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Target URL</span>
                        <input
                          className="input"
                          value={focusItemDraft.targetUrl}
                          placeholder="https://app.oliver.com/demo"
                          onChange={(event) => setFocusItemDraft(previous => ({ ...previous, targetUrl: event.target.value }))}
                        />
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Journey Node Link</span>
                        <select
                          className="input"
                          value={focusItemDraft.campaignNodeId}
                          onChange={(event) => setFocusItemDraft(previous => ({ ...previous, campaignNodeId: event.target.value }))}
                        >
                          <option value="">No node link</option>
                          {journeyNodeOptions.map((option, index) => (
                            <option key={`focus-node-${option.id}-${index}`} value={option.id}>{option.title || option.id}</option>
                          ))}
                        </select>
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Status</span>
                        <select
                          className="input"
                          value={focusItemDraft.status}
                          onChange={(event) => setFocusItemDraft(previous => ({ ...previous, status: event.target.value as CampaignFocusItemStatus }))}
                        >
                          <option value="draft">draft</option>
                          <option value="active">active</option>
                          <option value="paused">paused</option>
                          <option value="archived">archived</option>
                        </select>
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Active Start</span>
                        <input
                          className="input"
                          type="datetime-local"
                          value={focusItemDraft.startAt}
                          onChange={(event) => setFocusItemDraft(previous => ({ ...previous, startAt: event.target.value }))}
                        />
                      </label>
                      <label className="campaign-filter-control">
                        <span className="campaign-card-copy">Active End</span>
                        <input
                          className="input"
                          type="datetime-local"
                          value={focusItemDraft.endAt}
                          onChange={(event) => setFocusItemDraft(previous => ({ ...previous, endAt: event.target.value }))}
                        />
                      </label>
                    </div>
                    <label className="campaign-filter-control">
                      <span className="campaign-card-copy">Domain Allowlist (comma-separated)</span>
                      <input
                        className="input"
                        value={focusItemDraft.domainAllowlist}
                        placeholder="app.oliver.com, staging.oliver-app.pages.dev"
                        onChange={(event) => setFocusItemDraft(previous => ({ ...previous, domainAllowlist: event.target.value }))}
                      />
                    </label>
                    {focusItemDraft.status === 'active' && focusItemDraft.domainAllowlist.trim().length === 0 && (
                      <p className="campaign-card-rejection">Domain allowlist is required before activating a focus item.</p>
                    )}
                    <div className="campaign-card-actions">
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => { void createFocusItemFromInput() }}
                        disabled={focusItemSaving}
                      >
                        {focusItemSaving ? 'Saving…' : 'Create Focus Item'}
                      </button>
                    </div>

                    <p className="campaign-card-copy">
                      Embed snippet template:
                      {' '}
                      {`<script data-campaign="${selectedCampaign.id}" data-focus="<focus-id>" src="/focus-loader.js"></script>`}
                    </p>
                    <div className="campaign-grid">
                      <article className="card campaign-card">
                        <h4 className="campaign-card-title">Desktop Preview</h4>
                        <p className="campaign-card-copy">{focusItemDraft.title || 'Focus title preview'}</p>
                        <p className="campaign-card-copy">{focusItemDraft.message || 'Focus message preview'}</p>
                        <p className="campaign-card-copy">Type: {focusItemDraft.type}</p>
                      </article>
                      <article className="card campaign-card campaign-focus-mobile-preview">
                        <h4 className="campaign-card-title">Mobile Preview</h4>
                        <p className="campaign-card-copy">{focusItemDraft.title || 'Focus title preview'}</p>
                        <p className="campaign-card-copy">{focusItemDraft.message || 'Focus message preview'}</p>
                        <p className="campaign-card-copy">Type: {focusItemDraft.type}</p>
                      </article>
                    </div>

                    {focusItems.length === 0 && (
                      <p className="campaign-card-copy">No focus items configured for this campaign yet.</p>
                    )}
                    {focusItems.map(item => (
                      <article key={item.id} className="card campaign-card">
                        <div className="campaign-row-head">
                          <p className="campaign-card-title">{item.title || item.id}</p>
                          <span className="campaign-pill">{item.status}</span>
                        </div>
                        <p className="campaign-card-copy">
                          {item.type}
                          {item.campaign_node_id ? ` · node: ${item.campaign_node_id}` : ' · no node link'}
                          {item.start_at ? ` · start: ${new Date(item.start_at).toLocaleString()}` : ''}
                          {item.end_at ? ` · end: ${new Date(item.end_at).toLocaleString()}` : ''}
                        </p>
                        <p className="campaign-card-copy">
                          Allowlist: {item.domain_allowlist.length > 0 ? item.domain_allowlist.join(', ') : 'none'}
                        </p>
                        <p className="campaign-card-copy">
                          Impressions {item.impressions} · Conversions {item.conversions}
                        </p>
                        <div className="campaign-card-actions">
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => { void updateFocusItemMetricFromInput(item.id, 'impression') }}
                          >
                            Track Impression
                          </button>
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => { void updateFocusItemMetricFromInput(item.id, 'conversion') }}
                          >
                            Track Conversion
                          </button>
                        </div>
                      </article>
                    ))}
                  </article>
                </>
              )}
            </section>
          )}

          {shouldRenderSection('reports') && (
            <section id="campaigns-reports" className="campaign-section">
            <h2 className="campaign-section-title">Reports</h2>
            <p className="campaign-section-subtitle">Current execution summary across content lifecycle states.</p>
            <article className="card campaign-card">
              <h3 className="campaign-card-title">Report Filters</h3>
              <div className="campaign-form-grid">
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Preset</span>
                  <select
                    className="input"
                    value={reportFiltersDraft.preset}
                    onChange={(event) => {
                      const preset = event.target.value as CampaignReportPreset
                      if (preset === 'custom') {
                        setReportFiltersDraft(prev => ({ ...prev, preset }))
                        return
                      }
                      applyReportPreset(preset)
                    }}
                  >
                    <option value="last-7">Last 7 Days</option>
                    <option value="last-30">Last 30 Days</option>
                    <option value="current-month">Current Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Campaign</span>
                  <select
                    className="input"
                    value={reportFiltersDraft.campaignId}
                    onChange={(event) => setReportFiltersDraft(prev => ({ ...prev, campaignId: event.target.value }))}
                  >
                    <option value="">All Campaigns</option>
                    {campaigns.map(campaign => (
                      <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                    ))}
                  </select>
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Start Date</span>
                  <input
                    className="input"
                    type="date"
                    value={reportFiltersDraft.startDate}
                    onChange={(event) => setReportFiltersDraft(prev => ({ ...prev, preset: 'custom', startDate: event.target.value }))}
                  />
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">End Date</span>
                  <input
                    className="input"
                    type="date"
                    value={reportFiltersDraft.endDate}
                    onChange={(event) => setReportFiltersDraft(prev => ({ ...prev, preset: 'custom', endDate: event.target.value }))}
                  />
                </label>
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Content Type</span>
                  <select
                    className="input"
                    value={reportFiltersDraft.contentType}
                    onChange={(event) => setReportFiltersDraft(prev => ({ ...prev, contentType: event.target.value }))}
                  >
                    <option value="">All Types</option>
                    {CONTENT_TYPE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              {reportFilterDateError && (
                <p className="campaign-card-rejection">{reportFilterDateError}</p>
              )}
              <div className="campaign-card-actions">
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={applyReportFilters}
                  disabled={!!reportFilterDateError}
                >
                  Apply Filters
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={resetReportFilters}
                  disabled={false}
                >
                  Reset Filters
                </button>
              </div>
              <p className="campaign-card-copy">
                Active: {reportFiltersApplied.startDate || 'all'} to {reportFiltersApplied.endDate || 'all'}
                {' · '}
                Campaign: {reportFiltersApplied.campaignId ? (campaignNameById.get(reportFiltersApplied.campaignId) || reportFiltersApplied.campaignId) : 'all'}
                {' · '}
                Type: {reportFiltersApplied.contentType || 'all'}
              </p>
              {reportSummaryLoading && (
                <p className="campaign-card-copy">Refreshing server summary…</p>
              )}
            </article>
            {reportFilteredContentItems.length === 0 && (
              <article className="card campaign-card">
                <h3 className="campaign-card-title">No Reporting Data In Range</h3>
                <p className="campaign-card-copy">
                  No content matches the current selection. Reset filters or expand the date range to generate campaign progress output.
                </p>
              </article>
            )}

            <div className="card campaign-card">
              <h3 className="campaign-card-title">Campaign Progress</h3>
              <div className="campaign-grid">
                <article className="card campaign-card">
                  <h4 className="campaign-card-title">Created</h4>
                  <p className="campaign-metric">{reportSummary.created_count}</p>
                </article>
                <article className="card campaign-card">
                  <h4 className="campaign-card-title">Submitted</h4>
                  <p className="campaign-metric">{reportSummary.submitted_count}</p>
                </article>
                <article className="card campaign-card">
                  <h4 className="campaign-card-title">Approved</h4>
                  <p className="campaign-metric">{reportSummary.approved_count}</p>
                </article>
              </div>
            </div>

            <div className="card campaign-card">
              <h3 className="campaign-card-title">Review Operations</h3>
              <div className="campaign-grid">
                <article className="card campaign-card">
                  <h4 className="campaign-card-title">Waiting Review</h4>
                  <p className="campaign-metric">{reportSummary.waiting_review_count}</p>
                </article>
                <article className="card campaign-card">
                  <h4 className="campaign-card-title">Unclaimed</h4>
                  <p className="campaign-metric">{reportSummary.unclaimed_count}</p>
                </article>
                <article className="card campaign-card">
                  <h4 className="campaign-card-title">Claimed</h4>
                  <p className="campaign-metric">{reportSummary.claimed_count}</p>
                </article>
              </div>
            </div>

            <div className="card campaign-card">
              <h3 className="campaign-card-title">Publishing</h3>
              <div className="campaign-grid">
                <article className="card campaign-card">
                  <h4 className="campaign-card-title">Posted</h4>
                  <p className="campaign-metric">{reportSummary.posted_count}</p>
                </article>
                <article className="card campaign-card">
                  <h4 className="campaign-card-title">Missed</h4>
                  <p className="campaign-metric">{reportSummary.missed_count}</p>
                </article>
              </div>
            </div>

            <article className="card campaign-card">
              <h3 className="campaign-card-title">Report Breakdown</h3>
              <div className="campaign-breakdown-grid">
                <div>
                  <p className="campaign-card-copy">By Campaign</p>
                  {reportGroupings.by_campaign.length === 0 ? (
                    <p className="campaign-breakdown-empty">No campaign data in this range.</p>
                  ) : (
                    <ul className="campaign-breakdown-list">
                      {reportGroupings.by_campaign.slice(0, 5).map(bucket => (
                        <li key={`campaign-${bucket.key}`} className="campaign-breakdown-item">
                          <span>{campaignNameById.get(bucket.key) || bucket.key}</span>
                          <strong>{bucket.count}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="campaign-card-copy">By Topic</p>
                  {reportGroupings.by_topic.length === 0 ? (
                    <p className="campaign-breakdown-empty">No topic data in this range.</p>
                  ) : (
                    <ul className="campaign-breakdown-list">
                      {reportGroupings.by_topic.slice(0, 5).map(bucket => (
                        <li key={`topic-${bucket.key}`} className="campaign-breakdown-item">
                          <span>{bucket.key}</span>
                          <strong>{bucket.count}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="campaign-card-copy">By Owner</p>
                  {reportGroupings.by_user.length === 0 ? (
                    <p className="campaign-breakdown-empty">No owner data in this range.</p>
                  ) : (
                    <ul className="campaign-breakdown-list">
                      {reportGroupings.by_user.slice(0, 5).map(bucket => (
                        <li key={`owner-${bucket.key}`} className="campaign-breakdown-item">
                          <span>{bucket.key}</span>
                          <strong>{bucket.count}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </article>

            <article className="card campaign-card">
              <h3 className="campaign-card-title">Export History</h3>
              {exportJobsLoading && <p className="campaign-card-copy">Loading recent exports…</p>}
              {!exportJobsLoading && exportJobs.length === 0 && (
                <p className="campaign-card-copy">No export jobs yet.</p>
              )}
              {exportJobs.map(job => (
                <div key={job.id} className="campaign-asset-row">
                  <div>
                    <p className="campaign-card-copy">
                      {job.file_name || (job as { filename?: string }).filename || job.id} · {job.format} · {job.status}
                    </p>
                    <p className="campaign-card-copy">
                      Requested: {job.requested_at ? new Date(job.requested_at).toLocaleString() : 'n/a'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      void downloadExportJobFromInput(job.id).catch((exception) => {
                        setError(exception instanceof Error ? exception.message : String(exception))
                      })
                    }}
                    disabled={job.status !== 'completed'}
                  >
                    Download
                  </button>
                </div>
              ))}
            </article>

            {capabilityMatrix.canRunJobs && (
              <article className="card campaign-card">
                <h3 className="campaign-card-title">Automation Jobs</h3>
                <p className="campaign-card-copy">
                  Run reminder dispatch and missed-post detection from the module. Use dry run first, then live run.
                </p>
                <div className="campaign-card-actions">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => { void runJobsFromInput('dispatch-reminders', true) }}
                    disabled={!capabilityMatrix.canRunJobs || jobRunning || schemaMissing || policyBlocked}
                  >
                    Dry Run Reminders
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => { void runJobsFromInput('dispatch-reminders', false) }}
                    disabled={!capabilityMatrix.canRunJobs || jobRunning || schemaMissing || policyBlocked}
                  >
                    Run Reminders
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => { void runJobsFromInput('detect-missed', true) }}
                    disabled={!capabilityMatrix.canRunJobs || jobRunning || schemaMissing || policyBlocked}
                  >
                    Dry Run Missed
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => { void runJobsFromInput('detect-missed', false) }}
                    disabled={!capabilityMatrix.canRunJobs || jobRunning || schemaMissing || policyBlocked}
                  >
                    Run Missed Detection
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => { void runJobsFromInput('all', true) }}
                    disabled={!capabilityMatrix.canRunJobs || jobRunning || schemaMissing || policyBlocked}
                  >
                    Dry Run All
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => { void runJobsFromInput('all', false) }}
                    disabled={!capabilityMatrix.canRunJobs || jobRunning || schemaMissing || policyBlocked}
                  >
                    Run All Jobs
                  </button>
                </div>
                {jobRunMessage && (
                  <p className="campaign-card-copy">{jobRunMessage}</p>
                )}
                {jobRunDetails && (
                  <pre className="campaign-job-output">
                    {JSON.stringify(jobRunDetails, null, 2)}
                  </pre>
                )}
              </article>
            )}
            </section>
          )}
          {contentPanelItem && (
            <div
              className="campaign-content-panel-backdrop"
              onMouseDown={(event) => {
                if (event.target !== event.currentTarget) return
                setContentPanelId('')
              }}
            >
              <aside
                className="campaign-content-panel"
                role="dialog"
                aria-modal="true"
                aria-label="Campaign content panel"
              >
                <div className="campaign-row-head">
                  <div>
                    <h3 className="campaign-card-title">{contentPanelItem.title}</h3>
                    <p className="campaign-card-copy">{contentPanelPrimaryAction}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => setContentPanelId('')}
                  >
                    Close
                  </button>
                </div>
                <div className="campaign-chip-row">
                  <span className="campaign-pill">{contentPanelItem.status}</span>
                  <span className="campaign-pill">{contentPanelItem.content_type}</span>
                  <span className="campaign-pill">{contentPanelItem.intended_channel || 'linkedin'}</span>
                  <span className="campaign-pill campaign-pill-open">{contentPanelPrimaryAction}</span>
                  {contentPanelIsOverdue && (
                    <span className="campaign-pill campaign-pill-overdue">Overdue</span>
                  )}
                  {contentPanelMissingMetadata.length > 0 && (
                    <span className="campaign-pill campaign-pill-open">
                      Missing: {contentPanelMissingMetadata.join(', ')}
                    </span>
                  )}
                </div>
                <p className="campaign-card-copy">
                  Campaign: {contentPanelItem.campaign_id ? (campaignNameById.get(contentPanelItem.campaign_id) || contentPanelItem.campaign_id) : 'Unassigned'}
                  {' · '}
                  Owner: {contentPanelItem.posting_owner_id || 'Unassigned'}
                  {' · '}
                  Creator: {contentPanelItem.created_by}
                </p>
                <p className="campaign-card-copy">
                  Updated: {contentPanelItem.updated_at ? new Date(contentPanelItem.updated_at).toLocaleString() : 'n/a'}
                  {contentPanelItem.scheduled_for ? ` · Scheduled ${new Date(contentPanelItem.scheduled_for).toLocaleString()}` : ''}
                </p>
                {contentPanelIsOverdue && (
                  <p className="campaign-card-rejection">
                    Scheduled date is overdue. Re-schedule or release claim.
                  </p>
                )}
                {contentPanelMissingMetadata.length > 0 && (
                  <p className="campaign-card-rejection">
                    Missing metadata: {contentPanelMissingMetadata.join(', ')}.
                  </p>
                )}
                <label className="campaign-filter-control">
                  <span className="campaign-card-copy">Draft Body</span>
                  <textarea
                    className="ta"
                    rows={10}
                    value={contentPanelDraftBody}
                    onChange={(event) => setContentPanelDraftBody(event.target.value)}
                    disabled={!capabilityMatrix.canEditOwnDraft(contentPanelItem) || contentPanelSaving}
                  />
                </label>
                {!capabilityMatrix.canEditOwnDraft(contentPanelItem) && (
                  <p className="campaign-card-copy">Draft body editing is limited to the draft owner while status is Draft.</p>
                )}
                <div className="campaign-card-actions">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => { void copyToClipboard(contentPanelItem.body || '') }}
                  >
                    Copy Body
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      setContentPanelId('')
                      focusContentFromInput(contentPanelItem.id)
                    }}
                  >
                    Open in Library
                  </button>
                  {capabilityMatrix.canEditOwnDraft(contentPanelItem) && (
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => { void saveContentPanelDraftFromInput() }}
                      disabled={contentPanelSaving || schemaMissing || policyBlocked || !contentPanelDraftBody.trim()}
                    >
                      {contentPanelSaving ? 'Saving…' : 'Save Draft Body'}
                    </button>
                  )}
                  {capabilityMatrix.canEditOwnDraft(contentPanelItem) && contentPanelItem.status === 'draft' && (
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => {
                        void submitReviewFromInput({ contentId: contentPanelItem.id }).catch(() => {})
                      }}
                      disabled={policyBlocked || !contentPanelDraftBody.trim()}
                    >
                      Submit for Review
                    </button>
                  )}
                  {capabilityMatrix.canReview && contentPanelItem.status === 'needs_review' && (
                    <>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => {
                          void approveFromInput({ contentId: contentPanelItem.id }).catch(() => {})
                        }}
                        disabled={schemaMissing || policyBlocked}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => openReasonModalFromInput('review-reject', contentPanelItem)}
                        disabled={schemaMissing || policyBlocked || reasonModalRunning}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {capabilityMatrix.canClaim(contentPanelItem) && (
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => {
                        void claimFromInput({
                          contentId: contentPanelItem.id,
                          intendedChannel: contentPanelItem.intended_channel || 'linkedin',
                        }).catch(() => {})
                      }}
                      disabled={schemaMissing || policyBlocked}
                    >
                      Claim
                    </button>
                  )}
                  {capabilityMatrix.canReleaseClaim(contentPanelItem) && (
                    <>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => {
                          void markPostedFromInput({ contentId: contentPanelItem.id, postUrl: contentPanelItem.post_url || undefined }).catch(() => {})
                        }}
                        disabled={schemaMissing || policyBlocked}
                      >
                        Mark Posted
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => openReasonModalFromInput('content-unclaim', contentPanelItem)}
                        disabled={schemaMissing || policyBlocked || reasonModalRunning}
                      >
                        Unclaim
                      </button>
                    </>
                  )}
                </div>
                <article className="card campaign-card">
                  <h4 className="campaign-card-title">Review Thread</h4>
                  {contentPanelItem.rejection_reason && (
                    <p className="campaign-card-rejection">Latest Feedback: {contentPanelItem.rejection_reason}</p>
                  )}
                  {contentPanelReviewThread.length === 0 ? (
                    <p className="campaign-card-copy">No review-thread events yet.</p>
                  ) : (
                    <ul className="campaign-detail-list">
                      {contentPanelReviewThread.map(log => (
                        <li key={`panel-review-${log.id}`} className="campaign-detail-list-item">
                          <div className="campaign-detail-activity-copy">
                            <span>{humanizeActionType(log.action_type)}</span>
                            <span className="campaign-card-copy">By {log.performed_by || 'system'}</span>
                          </div>
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
                <article className="card campaign-card">
                  <h4 className="campaign-card-title">Recent Item Activity</h4>
                  {contentPanelActivity.length === 0 ? (
                    <p className="campaign-card-copy">No activity events logged for this content item.</p>
                  ) : (
                    <ul className="campaign-detail-list">
                      {contentPanelActivity.map(log => (
                        <li key={`panel-activity-${log.id}`} className="campaign-detail-list-item">
                          <div className="campaign-detail-activity-copy">
                            <span>{humanizeActionType(log.action_type)}</span>
                            <span className="campaign-card-copy">By {log.performed_by || 'system'}</span>
                          </div>
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </aside>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
