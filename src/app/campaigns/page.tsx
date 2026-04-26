'use client'

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
import {
  addCampaignPerformanceMetrics,
  approveCampaignContent,
  claimCampaignContent,
  createCampaign,
  createCampaignAsset,
  createCampaignContentDraft,
  createCampaignReminder,
  isCampaignsAccessDenied,
  isCampaignsSchemaMissing,
  listCampaignAssets,
  listCampaignContentItems,
  listCampaigns,
  markCampaignContentPosted,
  removeCampaignAsset,
  rejectCampaignContent,
  requestCampaignReportExport,
  downloadCampaignReportExport,
  getCampaignReportSummary,
  listCampaignReportExports,
  runCampaignJobs,
  submitCampaignContentForReview,
  type CampaignSyncState,
  unclaimCampaignContent,
  updateCampaignContentPostUrl,
  updateCampaignContentSchedule,
} from '@/lib/campaigns'
import type {
  CampaignAsset,
  CampaignContentItem,
  CampaignContentMetrics,
  CampaignReportGroupings,
  CampaignJobsAction,
  CampaignJobsRunResult,
  CampaignReminder,
  CampaignRecord,
  CampaignReportExportJob,
  CampaignReportSummary,
} from '@/types/campaigns'

type CampaignSection = 'list' | 'content' | 'review' | 'calendar' | 'reports'

const SECTION_TO_ANCHOR: Record<CampaignSection, string> = {
  list: 'campaigns-list',
  content: 'campaigns-content',
  review: 'campaigns-review',
  calendar: 'campaigns-calendar',
  reports: 'campaigns-reports',
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

type CampaignReportPreset = 'last-7' | 'last-30' | 'current-month' | 'custom'

type CampaignReportFilters = {
  preset: CampaignReportPreset
  startDate: string
  endDate: string
  campaignId: string
  contentType: string
}

type ReviewQueueSort = 'oldest' | 'newest' | 'campaign' | 'topic'
type ContentLibraryOwnershipFilter = 'all' | 'created-by-me' | 'claimed-by-me' | 'unclaimed'
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
}

type CampaignReasonModalState = {
  mode: CampaignReasonModalMode
  contentId: string
  title: string
} | null

type CalendarTimelineKind = 'claimed' | 'posted' | 'missed' | 'open-slot'

type CalendarTimelineEntry = {
  id: string
  startsAt: Date
  dateKey: string
  title: string
  kind: CalendarTimelineKind
  campaignLabel: string
  channel: string | null
  detail: string
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

const CAMPAIGN_CADENCE_OPTIONS: Array<{ value: CampaignCadencePreset; label: string }> = [
  { value: 'none', label: 'No Cadence' },
  { value: 'weekdays', label: 'Every Weekday (Mon-Fri)' },
  { value: 'every-other-day', label: 'Every Other Day' },
  { value: 'weekly-3', label: '3 Posts per Week' },
  { value: 'weekly-5', label: '5 Posts per Week' },
]

function toIcsTimestamp(input: string) {
  return input.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function buildIcsPayload(item: CampaignContentItem, scheduledIso: string) {
  const startIso = new Date(scheduledIso).toISOString()
  const endIso = new Date(new Date(scheduledIso).getTime() + 30 * 60 * 1000).toISOString()
  const title = item.title.replace(/[\r\n]+/g, ' ').trim()
  const description = item.body.replace(/[\r\n]+/g, ' ').trim()
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//V.Two//Campaign Content Posting//EN',
    'BEGIN:VEVENT',
    `UID:${item.id}@vtwo-campaigns`,
    `DTSTAMP:${toIcsTimestamp(new Date().toISOString())}`,
    `DTSTART:${toIcsTimestamp(startIso)}`,
    `DTEND:${toIcsTimestamp(endIso)}`,
    `SUMMARY:${title || 'Campaign posting reminder'}`,
    `DESCRIPTION:${description || 'Review and post claimed campaign content.'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
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

function buildCadenceRuleFromPreset(preset: CampaignCadencePreset): Record<string, unknown> | null {
  if (preset === 'none') return null
  if (preset === 'weekdays') {
    return {
      preset: 'every-weekday',
      posts_per_week: 5,
      days_of_week: [1, 2, 3, 4, 5],
    }
  }
  if (preset === 'every-other-day') {
    return {
      preset: 'every-other-day',
      posts_per_week: 4,
    }
  }
  if (preset === 'weekly-3') {
    return {
      preset: 'weekly',
      posts_per_week: 3,
    }
  }
  return {
    preset: 'weekly',
    posts_per_week: 5,
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
  value.setDate(value.getDate() - value.getDay())
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

export default function CampaignsPage() {
  const { allowRender } = useModuleAccess('campaigns')
  const { appUser, isAdmin } = useUser()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([])
  const [contentItems, setContentItems] = useState<CampaignContentItem[]>([])
  const [assets, setAssets] = useState<CampaignAsset[]>([])
  const [serverReportSummary, setServerReportSummary] = useState<CampaignReportSummary | null>(null)
  const [serverReportGroupings, setServerReportGroupings] = useState<CampaignReportGroupings | null>(null)
  const [reportSummaryLoading, setReportSummaryLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncState, setSyncState] = useState<CampaignSyncState>('syncing')
  const [error, setError] = useState<string | null>(null)
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
  const [contentLibraryFilters, setContentLibraryFilters] = useState<ContentLibraryFilters>({
    query: '',
    status: 'all',
    contentType: 'all',
    campaignId: '',
    ownership: 'all',
  })
  const [calendarSort, setCalendarSort] = useState<CalendarSort>('overdue-first')
  const [calendarFilters, setCalendarFilters] = useState<CalendarFilters>({
    query: '',
    campaignId: '',
    channel: 'all',
    timing: 'all',
  })
  const [focusedCampaignId, setFocusedCampaignId] = useState('')
  const [calendarView, setCalendarView] = useState<CalendarView>('weekly')
  const [calendarCursorDate, setCalendarCursorDate] = useState(() => toDateInputValue(new Date()))

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

  useEffect(() => {
    if (!focusedCampaignId) return
    if (campaigns.some(campaign => campaign.id === focusedCampaignId)) return
    setFocusedCampaignId('')
  }, [campaigns, focusedCampaignId])

  const queueNeedsReview = useMemo(
    () => contentItems.filter(item => item.status === 'needs_review'),
    [contentItems],
  )

  const sortedReviewQueue = useMemo(() => {
    const rows = [...queueNeedsReview]
    rows.sort((left, right) => {
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
  }, [campaignNameById, queueNeedsReview, reviewQueueSort])

  const selectedReviewIds = useMemo(
    () => sortedReviewQueue.filter(item => reviewSelectedById[item.id]).map(item => item.id),
    [reviewSelectedById, sortedReviewQueue],
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

  const calendarChannelOptions = useMemo(() => {
    const channels = new Set<string>()
    for (const item of myClaimed) {
      const channel = (item.intended_channel || '').trim()
      if (!channel) continue
      channels.add(channel)
    }
    return [...channels].sort((left, right) => left.localeCompare(right))
  }, [myClaimed])

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
      const haystack = `${item.title} ${item.topic} ${item.body}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [appUser?.user_id, contentItems, contentLibraryFilters.campaignId, contentLibraryFilters.contentType, contentLibraryFilters.ownership, contentLibraryFilters.query, contentLibraryFilters.status])

  const filteredMyClaimed = useMemo(() => {
    const query = calendarFilters.query.trim().toLowerCase()
    const now = Date.now()
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)
    const next7 = new Date(endOfToday)
    next7.setDate(next7.getDate() + 7)

    return myClaimed.filter(item => {
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
      const haystack = `${item.title} ${item.topic} ${item.body}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [calendarFilters.campaignId, calendarFilters.channel, calendarFilters.query, calendarFilters.timing, myClaimed])

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
    calendarFilters.query,
    calendarWindow.end,
    calendarWindow.start,
    campaignNameById,
    campaigns,
    contentItems,
    filteredMyClaimed,
    postedContent,
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
      setError('Campaign schema is not migrated yet. Run supabase/migrations/014_campaign_content_posting_foundation.sql.')
      return
    }
    if (isCampaignsAccessDenied(exception)) {
      setSchemaMissing(false)
      setPolicyBlocked(true)
      setError(CAMPAIGNS_ACCESS_POLICY_MESSAGE)
      return
    }
    setSchemaMissing(false)
    setPolicyBlocked(false)
    setError(exception instanceof Error ? exception.message : String(exception))
  }, [])

  const loadData = useCallback(async () => {
    setSyncState('syncing')
    setError(null)
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

      const [campaignRows, contentRows, assetRows, jobs] = await Promise.all([
        listCampaigns(),
        listCampaignContentItems(),
        listCampaignAssets(),
        exportJobsPromise,
      ])
      setCampaigns(campaignRows)
      setContentItems(contentRows)
      setAssets(assetRows)
      setExportJobs(jobs)
      setSchemaMissing(false)
      setPolicyBlocked(false)
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
      for (const item of sortedReviewQueue) {
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
  }, [sortedReviewQueue])

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
      setSyncState('ok')
      return created
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, setErrorFromException])

  const createContentDraftFromInput = useCallback(async (payload: {
    title: string
    body: string
    topic: string
    contentType: CampaignContentItem['content_type']
    campaignId?: string | null
  }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const created = await createCampaignContentDraft({
        title: payload.title,
        body: payload.body,
        topic: payload.topic,
        content_type: payload.contentType,
        campaign_id: payload.campaignId || null,
        created_by: appUser.user_id,
      })
      upsertContentItem(created)
      setSyncState('ok')
      return created
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, setErrorFromException, upsertContentItem])

  const updateContentState = useCallback(async (action: () => Promise<CampaignContentItem>) => {
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await action()
      upsertContentItem(updated)
      setSyncState('ok')
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [setErrorFromException, upsertContentItem])

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
      setSyncState('ok')
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, setErrorFromException, upsertContentItem])

  const addAssetFromInput = useCallback(async (payload: {
    contentId: string
    campaignId?: string | null
    title: string
    url: string
  }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
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
      setSyncState('ok')
      return created
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, setErrorFromException, upsertAsset])

  const removeAssetFromInput = useCallback(async (assetId: string) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      await removeCampaignAsset(assetId, appUser.user_id)
      removeAssetFromState(assetId)
      setSyncState('ok')
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, removeAssetFromState, setErrorFromException])

  const savePostUrlFromInput = useCallback(async (payload: { contentId: string; postUrl: string }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await updateCampaignContentPostUrl(payload.contentId, appUser.user_id, payload.postUrl)
      upsertContentItem(updated)
      setSyncState('ok')
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, setErrorFromException, upsertContentItem])

  const submitReviewFromInput = useCallback(async (payload: { contentId: string }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await submitCampaignContentForReview(payload.contentId, appUser.user_id)
      upsertContentItem(updated)
      setSyncState('ok')
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, setErrorFromException, upsertContentItem])

  const approveFromInput = useCallback(async (payload: { contentId: string }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await approveCampaignContent(payload.contentId, appUser.user_id)
      upsertContentItem(updated)
      setSyncState('ok')
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, setErrorFromException, upsertContentItem])

  const rejectFromInput = useCallback(async (payload: { contentId: string; reason: string }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await rejectCampaignContent(payload.contentId, appUser.user_id, payload.reason)
      upsertContentItem(updated)
      setSyncState('ok')
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, setErrorFromException, upsertContentItem])

  const unclaimFromInput = useCallback(async (payload: { contentId: string; reason: string }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await unclaimCampaignContent(payload.contentId, appUser.user_id, payload.reason)
      upsertContentItem(updated)
      setSyncState('ok')
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, setErrorFromException, upsertContentItem])

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
      setSyncState('ok')
      return created
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, setErrorFromException])

  const markPostedFromInput = useCallback(async (payload: { contentId: string; postUrl?: string }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await markCampaignContentPosted(payload.contentId, appUser.user_id, payload.postUrl || undefined)
      upsertContentItem(updated)
      setSyncState('ok')
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, setErrorFromException, upsertContentItem])

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
      setSyncState('ok')
      return created
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, setErrorFromException])

  const updateScheduleFromInput = useCallback(async (payload: { contentId: string; scheduledFor: string }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await updateCampaignContentSchedule(payload.contentId, appUser.user_id, payload.scheduledFor)
      upsertContentItem(updated)
      setSyncState('ok')
      return updated
    } catch (exception) {
      setSyncState('error')
      setErrorFromException(exception)
      throw exception
    }
  }, [appUser?.user_id, setErrorFromException, upsertContentItem])

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
      setSyncState('ok')
      return 'Campaign summary exported via campaign export job.'
    } catch {
      downloadContent(
        fallbackMarkdown,
        `campaign-summary-${new Date().toISOString().slice(0, 10)}.md`,
        'text/markdown;charset=utf-8',
      )
      setSyncState('ok')
      return 'Campaign summary exported to markdown.'
    }
  }, [
    appUser?.email,
    appUser?.user_id,
    campaigns,
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
    for (const item of sortedReviewQueue) {
      next[item.id] = true
    }
    setReviewSelectedById(next)
  }, [sortedReviewQueue])

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
      setSyncState('ok')
    }
    setReviewBulkMessage(`Bulk ${action} complete: ${succeeded} succeeded${failed > 0 ? `, ${failed} failed` : ''}.`)
    setReviewBulkRunning(false)
    return true
  }, [appUser?.user_id, isAdmin, selectedReviewIds, upsertContentItem])

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
  function closeSidebar() { setSidebarOpen(false) }

  function jumpTo(section: CampaignSection) {
    const anchorId = SECTION_TO_ANCHOR[section]
    document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
      campaigns,
      draftContent: queueDraft,
      needsReviewContent: queueNeedsReview,
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
      addPerformanceMetrics: payload => addMetricsFromInput(payload),
      exportSummary: () => exportSummaryFromInput(),
      getSummary: () => reportSummary,
    }),
    [
      campaigns,
      queueDraft,
      queueNeedsReview,
      queueUnclaimed,
      myClaimed,
      postedContent,
      createCampaignFromInput,
      createContentDraftFromInput,
      claimFromInput,
      contentItems,
      addAssetFromInput,
      submitReviewFromInput,
      approveFromInput,
      rejectFromInput,
      unclaimFromInput,
      addReminderFromInput,
      markPostedFromInput,
      savePostUrlFromInput,
      addMetricsFromInput,
      exportSummaryFromInput,
      reportSummary,
    ],
  )

  const oliverConfig = useMemo<OliverConfig>(() => {
    const actions: OliverAction[] = CAMPAIGNS_COMMANDS.map(command => {
      let run: () => void
      switch (command.id) {
        case 'open-content-library':
          run = () => jumpTo('content')
          break
        case 'open-unclaimed-content':
          run = () => jumpTo('content')
          break
        case 'open-my-claimed':
          run = () => jumpTo('calendar')
          break
        case 'open-review-queue':
          run = () => jumpTo('review')
          break
        case 'open-calendar':
          run = () => jumpTo('calendar')
          break
        case 'open-reports':
          run = () => jumpTo('reports')
          break
        case 'export-campaign-summary':
          run = () => { void exportSummaryFromInput() }
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
  }, [campaigns.length, contentItems.length, flows, loadData, loadReportSummary, policyBlocked, reportSummary.waiting_review_count, schemaMissing])

  useRegisterOliver(oliverConfig)

  if (!allowRender) return null

  return (
    <div className="app show-hamburger">
      <div
        className={'sidebar-backdrop' + (sidebarOpen ? ' open' : '')}
        onClick={closeSidebar}
        aria-hidden="true"
      />
      <nav className="app-sidebar" id="sidebar" aria-label="Campaign content navigation">
        <ModuleSidebarHeader title="Campaign Content & Posting" />
        <div className="app-sidebar-section">
          <button type="button" className="app-sidebar-item" onClick={() => jumpTo('list')}>Campaigns</button>
          <button type="button" className="app-sidebar-item" onClick={() => jumpTo('content')}>Content Library</button>
          <button type="button" className="app-sidebar-item" onClick={() => jumpTo('review')}>Review Queue</button>
          <button type="button" className="app-sidebar-item" onClick={() => jumpTo('calendar')}>Calendar</button>
          <button type="button" className="app-sidebar-item" onClick={() => jumpTo('reports')}>Reports</button>
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
          <CampaignsLanding />

          {error && (
            <div className="status-banner" role="alert">{error}</div>
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

          <section id="campaigns-list" className="campaign-section">
            <h2 className="campaign-section-title">Campaigns</h2>
            <p className="campaign-section-subtitle">Create and maintain campaign strategy records.</p>
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

            {loading && <div className="card">Loading campaigns…</div>}
            {!loading && campaigns.length === 0 && <div className="card">No campaigns yet. Start with one campaign record.</div>}
            {campaigns.map(campaign => {
              const stats = campaignStatsById.get(campaign.id)
              const dateRangeLabel = campaign.start_date || campaign.end_date
                ? `${campaign.start_date || 'Start TBD'} to ${campaign.end_date || 'End TBD'}`
                : 'No date range set'
              return (
                <article key={campaign.id} className="card campaign-card">
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

          <section id="campaigns-content" className="campaign-section">
            <h2 className="campaign-section-title">Content Library</h2>
            <p className="campaign-section-subtitle">Create drafts, submit for review, claim unclaimed content, and mark posted.</p>
            <form
              className="card campaign-form"
              onSubmit={(event) => {
                event.preventDefault()
                if (!contentDraft.title.trim() || !contentDraft.body.trim() || !contentDraft.topic.trim()) return
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
              <div className="campaign-card-actions">
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={resetContentFiltersFromInput}
                >
                  Reset Content Filters
                </button>
              </div>
              <p className="campaign-card-copy">
                Showing {filteredContentItems.length} of {contentItems.length} items.
              </p>
            </article>

            {!loading && contentItems.length === 0 && <div className="card">No content items yet.</div>}
            {!loading && contentItems.length > 0 && filteredContentItems.length === 0 && (
              <div className="card">No content matches current filters.</div>
            )}
            {filteredContentItems.map(item => {
              const itemAssets = assetsByContentId.get(item.id) || []
              const assetDraft = assetDraftByContentId[item.id] || { title: '', url: '' }
              const assetUrlValid = !assetDraft.url.trim() || isHttpUrl(assetDraft.url)
              const postUrlDraft = postUrlDraftByContentId[item.id] ?? item.post_url ?? ''
              const postUrlValid = !postUrlDraft.trim() || isHttpUrl(postUrlDraft)
              const scheduleDraft = scheduleDraftByContentId[item.id] ?? toDateTimeLocalValue(item.scheduled_for)
              const scheduleIso = localDateTimeToIso(scheduleDraft)
              const canManageClaim = item.status === 'claimed' && (item.posting_owner_id === appUser?.user_id || isAdmin)
              const canUpdatePostUrl = (item.status === 'claimed' || item.status === 'posted') && (item.posting_owner_id === appUser?.user_id || isAdmin)
              return (
                <article key={item.id} className="card campaign-card">
                  <div className="campaign-row-head">
                    <h3 className="campaign-card-title">{item.title}</h3>
                    <span className="campaign-pill">{item.status}</span>
                  </div>
                  <p className="campaign-card-copy">{item.topic} · {item.content_type}</p>
                  <p className="campaign-card-copy">{item.body || 'No body content.'}</p>
                  {item.campaign_id && (
                    <p className="campaign-card-copy">Campaign: {campaignNameById.get(item.campaign_id) || item.campaign_id}</p>
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
                            disabled={schemaMissing || policyBlocked}
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
                      disabled={schemaMissing || policyBlocked || !assetDraft.title.trim() || !assetDraft.url.trim() || !assetUrlValid}
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
                    {item.status === 'draft' && item.created_by === appUser?.user_id && (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => {
                          void updateContentState(() => submitCampaignContentForReview(item.id, appUser.user_id))
                        }}
                        disabled={schemaMissing || policyBlocked}
                      >
                        Submit for Review
                      </button>
                    )}
                    {item.status === 'unclaimed' && (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => {
                          void claimFromInput({ contentId: item.id, intendedChannel: item.intended_channel || 'linkedin' }).catch(() => {})
                        }}
                        disabled={schemaMissing || policyBlocked}
                      >
                        Claim
                      </button>
                    )}
                    {canManageClaim && (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => {
                          if (!appUser?.user_id) return
                          void updateContentState(() => markCampaignContentPosted(item.id, appUser.user_id))
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
                  </div>
                </article>
              )
            })}
          </section>

          <section id="campaigns-review" className="campaign-section">
            <h2 className="campaign-section-title">Review Queue</h2>
            <p className="campaign-section-subtitle">Approve or reject content that is waiting for review.</p>
            {!isAdmin && <div className="card">Review actions are admin-only.</div>}
            {isAdmin && (
              <article className="card campaign-card">
                <h3 className="campaign-card-title">Review Queue Controls</h3>
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
                  <div className="campaign-review-summary">
                    <p className="campaign-card-copy">
                      Selected {selectedReviewIds.length} of {sortedReviewQueue.length}
                    </p>
                  </div>
                </div>
                <div className="campaign-card-actions">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={selectAllReviewFromInput}
                    disabled={schemaMissing || policyBlocked || reviewBulkRunning || sortedReviewQueue.length === 0}
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
            {sortedReviewQueue.length === 0 && <div className="card">No content is waiting for review.</div>}
            {sortedReviewQueue.map(item => (
              <article key={item.id} className="card campaign-card">
                <div className="campaign-row-head">
                  <div className="campaign-review-title">
                    {isAdmin && (
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
                  <span className="campaign-pill">needs_review</span>
                </div>
                <p className="campaign-card-copy">{item.topic} · by {item.created_by}</p>
                <p className="campaign-card-copy">
                  Created: {item.created_at ? new Date(item.created_at).toLocaleString() : 'n/a'}
                  {item.campaign_id ? ` · Campaign: ${campaignNameById.get(item.campaign_id) || item.campaign_id}` : ''}
                </p>
                <div className="campaign-chip-row">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      if (!appUser?.user_id) return
                      void updateContentState(() => approveCampaignContent(item.id, appUser.user_id))
                    }}
                    disabled={!isAdmin || schemaMissing || policyBlocked || reviewBulkRunning}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      openReasonModalFromInput('review-reject', item)
                    }}
                    disabled={!isAdmin || schemaMissing || policyBlocked || reviewBulkRunning || reasonModalRunning}
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </section>

          <section id="campaigns-calendar" className="campaign-section">
            <h2 className="campaign-section-title">Calendar and Reminders</h2>
            <p className="campaign-section-subtitle">Date-grouped visibility for claimed, posted, missed, and open-slot coverage.</p>
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
              <p className="campaign-card-copy campaign-calendar-window">
                Window: {calendarWindow.label}
              </p>
              <p className="campaign-card-copy">
                Showing {sortedMyClaimed.length} of {myClaimed.length} claimed items.
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
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </article>

            <article className="card campaign-card">
              <h3 className="campaign-card-title">My Claimed Queue</h3>
              {myClaimed.length === 0 && <p className="campaign-card-copy">No claimed content assigned to you.</p>}
              {myClaimed.length > 0 && sortedMyClaimed.length === 0 && (
                <p className="campaign-card-copy">No claimed content matches current calendar filters.</p>
              )}
            </article>
            {sortedMyClaimed.map(item => (
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
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => downloadIcs(item)}>
                    Download ICS
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      if (!appUser?.user_id) return
                      void updateContentState(() => markCampaignContentPosted(item.id, appUser.user_id, item.post_url || undefined))
                    }}
                    disabled={schemaMissing || policyBlocked}
                  >
                    Mark Posted
                  </button>
                </div>
              </article>
            ))}
          </section>

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
                  disabled={schemaMissing || policyBlocked || syncState === 'syncing' || !!reportFilterDateError}
                >
                  Apply Filters
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={resetReportFilters}
                  disabled={schemaMissing || policyBlocked || syncState === 'syncing'}
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
            <div className="campaign-grid">
              <article className="card campaign-card">
                <h3 className="campaign-card-title">Created</h3>
                <p className="campaign-metric">{reportSummary.created_count}</p>
              </article>
              <article className="card campaign-card">
                <h3 className="campaign-card-title">Waiting Review</h3>
                <p className="campaign-metric">{reportSummary.waiting_review_count}</p>
              </article>
              <article className="card campaign-card">
                <h3 className="campaign-card-title">Unclaimed</h3>
                <p className="campaign-metric">{reportSummary.unclaimed_count}</p>
              </article>
              <article className="card campaign-card">
                <h3 className="campaign-card-title">Claimed</h3>
                <p className="campaign-metric">{reportSummary.claimed_count}</p>
              </article>
              <article className="card campaign-card">
                <h3 className="campaign-card-title">Posted</h3>
                <p className="campaign-metric">{reportSummary.posted_count}</p>
              </article>
              <article className="card campaign-card">
                <h3 className="campaign-card-title">Missed</h3>
                <p className="campaign-metric">{reportSummary.missed_count}</p>
              </article>
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
                      {job.file_name || job.id} · {job.format} · {job.status}
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

            {isAdmin && (
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
                    disabled={jobRunning || schemaMissing || policyBlocked}
                  >
                    Dry Run Reminders
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => { void runJobsFromInput('dispatch-reminders', false) }}
                    disabled={jobRunning || schemaMissing || policyBlocked}
                  >
                    Run Reminders
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => { void runJobsFromInput('detect-missed', true) }}
                    disabled={jobRunning || schemaMissing || policyBlocked}
                  >
                    Dry Run Missed
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => { void runJobsFromInput('detect-missed', false) }}
                    disabled={jobRunning || schemaMissing || policyBlocked}
                  >
                    Run Missed Detection
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => { void runJobsFromInput('all', true) }}
                    disabled={jobRunning || schemaMissing || policyBlocked}
                  >
                    Dry Run All
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => { void runJobsFromInput('all', false) }}
                    disabled={jobRunning || schemaMissing || policyBlocked}
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
        </main>
      </div>
    </div>
  )
}
