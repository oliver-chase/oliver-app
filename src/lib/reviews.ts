import { supabase } from '@/lib/supabase'
import type {
  ReviewAnnualReview,
  ReviewFocusArea,
  ReviewGoal,
  ReviewGoalStatus,
  ReviewQuarterlyReflection,
  ReviewUpdate,
  ReviewUpdateType,
} from '@/components/reviews/types'

type GoalInsert = {
  owner_user_id: string
  focus_area: ReviewFocusArea
  title: string
  success_metric?: string
  status?: ReviewGoalStatus
  progress_percent?: number
  target_date?: string | null
}

type UpdateInsert = {
  owner_user_id: string
  goal_id: string
  update_type: ReviewUpdateType
  content: string
  evidence_link?: string
}

type QuarterlyUpsert = {
  owner_user_id: string
  cycle_label: string
  reflection: string
  blockers?: string
  support_needed?: string
}

type AnnualUpsert = {
  owner_user_id: string
  review_year: number
  self_summary: string
  impact_examples: string
  growth_plan: string
}

type SupabaseLikeError = {
  message?: string
  code?: string
  hint?: string
  details?: string
}

function throwDbError(label: string, error: SupabaseLikeError | null) {
  if (!error) return
  const code = typeof error.code === 'string' && error.code ? error.code : ''
  const hint = typeof error.hint === 'string' && error.hint ? ` hint=${error.hint}` : ''
  const details = typeof error.details === 'string' && error.details ? ` details=${error.details}` : ''
  throw new Error(`${label}: ${code ? `[${code}] ` : ''}${error.message || 'unknown database error'}${hint}${details}`)
}

export function isReviewsSchemaMissing(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase()
  return message.includes('review_') && message.includes('does not exist')
}

export function isReviewsAccessDenied(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase()
  return (
    message.includes('42501')
    || message.includes('permission denied')
    || message.includes('row-level security')
    || message.includes('rls')
    || message.includes('not allowed')
  )
}

export async function listReviewGoals(ownerUserId: string): Promise<ReviewGoal[]> {
  const { data, error } = await supabase
    .from('review_goals')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false })
  throwDbError('listReviewGoals', error)
  return (data ?? []) as ReviewGoal[]
}

export async function createReviewGoal(input: GoalInsert): Promise<ReviewGoal> {
  const payload = {
    owner_user_id: input.owner_user_id,
    focus_area: input.focus_area,
    title: input.title.trim(),
    success_metric: input.success_metric?.trim() || '',
    status: input.status || 'active',
    progress_percent: input.progress_percent ?? 0,
    target_date: input.target_date ?? null,
  }

  const { data, error } = await supabase
    .from('review_goals')
    .insert(payload)
    .select('*')
    .single()
  throwDbError('createReviewGoal', error)
  return data as ReviewGoal
}

export async function updateReviewGoal(goalId: string, patch: Partial<Pick<ReviewGoal, 'status' | 'progress_percent' | 'success_metric' | 'target_date'>>): Promise<ReviewGoal> {
  const payload: Partial<ReviewGoal> = {}
  if (patch.status) payload.status = patch.status
  if (typeof patch.progress_percent === 'number') payload.progress_percent = Math.min(100, Math.max(0, Math.round(patch.progress_percent)))
  if (typeof patch.success_metric === 'string') payload.success_metric = patch.success_metric.trim()
  if (patch.target_date !== undefined) payload.target_date = patch.target_date

  const { data, error } = await supabase
    .from('review_goals')
    .update(payload)
    .eq('id', goalId)
    .select('*')
    .single()
  throwDbError('updateReviewGoal', error)
  return data as ReviewGoal
}

export async function listReviewUpdates(ownerUserId: string): Promise<ReviewUpdate[]> {
  const { data, error } = await supabase
    .from('review_updates')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false })
  throwDbError('listReviewUpdates', error)
  return (data ?? []) as ReviewUpdate[]
}

export async function createReviewUpdate(input: UpdateInsert): Promise<ReviewUpdate> {
  const payload = {
    owner_user_id: input.owner_user_id,
    goal_id: input.goal_id,
    update_type: input.update_type,
    content: input.content.trim(),
    evidence_link: input.evidence_link?.trim() || '',
  }
  const { data, error } = await supabase
    .from('review_updates')
    .insert(payload)
    .select('*')
    .single()
  throwDbError('createReviewUpdate', error)
  return data as ReviewUpdate
}

export async function listQuarterlyReflections(ownerUserId: string): Promise<ReviewQuarterlyReflection[]> {
  const { data, error } = await supabase
    .from('review_quarterly_reflections')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .order('cycle_label', { ascending: false })
  throwDbError('listQuarterlyReflections', error)
  return (data ?? []) as ReviewQuarterlyReflection[]
}

export async function upsertQuarterlyReflection(input: QuarterlyUpsert): Promise<ReviewQuarterlyReflection> {
  const payload = {
    owner_user_id: input.owner_user_id,
    cycle_label: input.cycle_label.trim(),
    reflection: input.reflection.trim(),
    blockers: input.blockers?.trim() || '',
    support_needed: input.support_needed?.trim() || '',
  }
  const { data, error } = await supabase
    .from('review_quarterly_reflections')
    .upsert(payload, { onConflict: 'owner_user_id,cycle_label' })
    .select('*')
    .single()
  throwDbError('upsertQuarterlyReflection', error)
  return data as ReviewQuarterlyReflection
}

export async function getAnnualReview(ownerUserId: string, reviewYear: number): Promise<ReviewAnnualReview | null> {
  const { data, error } = await supabase
    .from('review_annual_reviews')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .eq('review_year', reviewYear)
    .maybeSingle()
  throwDbError('getAnnualReview', error)
  return (data ?? null) as ReviewAnnualReview | null
}

export async function upsertAnnualReview(input: AnnualUpsert): Promise<ReviewAnnualReview> {
  const payload = {
    owner_user_id: input.owner_user_id,
    review_year: input.review_year,
    self_summary: input.self_summary.trim(),
    impact_examples: input.impact_examples.trim(),
    growth_plan: input.growth_plan.trim(),
  }
  const { data, error } = await supabase
    .from('review_annual_reviews')
    .upsert(payload, { onConflict: 'owner_user_id,review_year' })
    .select('*')
    .single()
  throwDbError('upsertAnnualReview', error)
  return data as ReviewAnnualReview
}
