'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRegisterOliver } from '@/components/shared/OliverContext'
import type { OliverConfig, OliverAction } from '@/components/shared/OliverContext'
import CustomPicker from '@/components/shared/CustomPicker'
import { ModuleSidebarHeader } from '@/components/shared/ModuleSidebarHeader'
import { ModuleTopbar } from '@/components/shared/ModuleTopbar'
import { useModuleAccess } from '@/modules/use-module-access'
import { buildModuleOliverConfig } from '@/modules/oliver-config'
import { REVIEWS_COMMANDS } from '@/app/reviews/commands'
import { buildReviewsFlows } from '@/app/reviews/flows'
import { ReviewsLanding } from '@/components/reviews/ReviewsLanding'
import { useUser } from '@/context/UserContext'
import {
  createReviewGoal,
  createReviewUpdate,
  getAnnualReview,
  isReviewsAccessDenied,
  isReviewsSchemaMissing,
  listQuarterlyReflections,
  listReviewGoals,
  listReviewUpdates,
  updateReviewGoal,
  upsertAnnualReview,
  upsertQuarterlyReflection,
} from '@/lib/reviews'
import {
  REVIEW_FOCUS_AREAS,
  REVIEW_UPDATE_TYPES,
  type ReviewAnnualReview,
  type ReviewFocusArea,
  type ReviewGoal,
  type ReviewQuarterlyReflection,
  type ReviewUpdate,
  type ReviewUpdateType,
} from '@/components/reviews/types'

type ReviewPanel = 'goals' | 'updates' | 'quarterly' | 'annual'

function currentQuarterLabel(date: Date) {
  const quarter = Math.floor(date.getMonth() / 3) + 1
  return `${date.getFullYear()}-Q${quarter}`
}

function focusAreaLabel(value: ReviewFocusArea): string {
  return REVIEW_FOCUS_AREAS.find(area => area.value === value)?.label || value
}

const REVIEWS_ACCESS_POLICY_MESSAGE = 'Reviews access is blocked by Supabase RLS/permissions. Confirm policy coverage for review_* tables.'

export default function ReviewsPage() {
  const { allowRender } = useModuleAccess('reviews')
  const { appUser } = useUser()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<ReviewPanel>('goals')
  const [goals, setGoals] = useState<ReviewGoal[]>([])
  const [updates, setUpdates] = useState<ReviewUpdate[]>([])
  const [reflections, setReflections] = useState<ReviewQuarterlyReflection[]>([])
  const [annualReview, setAnnualReview] = useState<ReviewAnnualReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncState, setSyncState] = useState<'ok' | 'syncing' | 'error'>('syncing')
  const [error, setError] = useState<string | null>(null)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [policyBlocked, setPolicyBlocked] = useState(false)
  const [goalDraft, setGoalDraft] = useState({
    focusArea: 'legacy' as ReviewFocusArea,
    title: '',
    successMetric: '',
    targetDate: '',
  })
  const [updateDraft, setUpdateDraft] = useState({
    goalId: '',
    updateType: 'action' as ReviewUpdateType,
    content: '',
    evidenceLink: '',
  })
  const [quarterlyDraft, setQuarterlyDraft] = useState({
    cycleLabel: currentQuarterLabel(new Date()),
    reflection: '',
    blockers: '',
    supportNeeded: '',
  })
  const [annualDraft, setAnnualDraft] = useState({
    reviewYear: new Date().getFullYear(),
    selfSummary: '',
    impactExamples: '',
    growthPlan: '',
  })

  const goalOptions = useMemo(
    () => goals.map(goal => ({ value: goal.id, label: `${goal.title} (${focusAreaLabel(goal.focus_area)})` })),
    [goals],
  )
  const updateCountByGoal = useMemo(() => {
    const byGoal = new Map<string, number>()
    for (const update of updates) {
      byGoal.set(update.goal_id, (byGoal.get(update.goal_id) || 0) + 1)
    }
    return byGoal
  }, [updates])

  const loadData = useCallback(async () => {
    if (!appUser?.user_id) return
    const reviewYear = annualDraft.reviewYear
    setSyncState('syncing')
    setError(null)
    try {
      const [goalsRows, updateRows, reflectionRows, annual] = await Promise.all([
        listReviewGoals(appUser.user_id),
        listReviewUpdates(appUser.user_id),
        listQuarterlyReflections(appUser.user_id),
        getAnnualReview(appUser.user_id, reviewYear),
      ])
      setGoals(goalsRows)
      setUpdates(updateRows)
      setReflections(reflectionRows)
      setAnnualReview(annual)
      if (annual) {
        setAnnualDraft({
          reviewYear: annual.review_year,
          selfSummary: annual.self_summary,
          impactExamples: annual.impact_examples,
          growthPlan: annual.growth_plan,
        })
      }
      setSchemaMissing(false)
      setPolicyBlocked(false)
      setSyncState('ok')
    } catch (err) {
      setSyncState('error')
      if (isReviewsSchemaMissing(err)) {
        setSchemaMissing(true)
        setPolicyBlocked(false)
        setError('Reviews schema is not migrated yet. Run supabase/migrations/011_reviews_module_foundation.sql.')
      } else if (isReviewsAccessDenied(err)) {
        setSchemaMissing(false)
        setPolicyBlocked(true)
        setError(REVIEWS_ACCESS_POLICY_MESSAGE)
      } else {
        setSchemaMissing(false)
        setPolicyBlocked(false)
        setError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      setLoading(false)
    }
  }, [annualDraft.reviewYear, appUser?.user_id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  function toggleSidebar() { setSidebarOpen(open => !open) }
  function closeSidebar() { setSidebarOpen(false) }

  const createGoalFromInput = useCallback(async (payload: {
    focusArea: ReviewFocusArea
    title: string
    successMetric?: string
    targetDate?: string
  }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      await createReviewGoal({
        owner_user_id: appUser.user_id,
        focus_area: payload.focusArea,
        title: payload.title,
        success_metric: payload.successMetric || '',
        target_date: payload.targetDate || null,
      })
      await loadData()
    } catch (err) {
      setSyncState('error')
      if (isReviewsAccessDenied(err)) {
        setPolicyBlocked(true)
        setError(REVIEWS_ACCESS_POLICY_MESSAGE)
      } else {
        setError(err instanceof Error ? err.message : String(err))
      }
      throw err
    }
  }, [appUser?.user_id, loadData])

  const addUpdateFromInput = useCallback(async (payload: {
    goalId: string
    updateType: ReviewUpdateType
    content: string
    evidenceLink?: string
  }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      await createReviewUpdate({
        owner_user_id: appUser.user_id,
        goal_id: payload.goalId,
        update_type: payload.updateType,
        content: payload.content,
        evidence_link: payload.evidenceLink || '',
      })
      await loadData()
    } catch (err) {
      setSyncState('error')
      if (isReviewsAccessDenied(err)) {
        setPolicyBlocked(true)
        setError(REVIEWS_ACCESS_POLICY_MESSAGE)
      } else {
        setError(err instanceof Error ? err.message : String(err))
      }
      throw err
    }
  }, [appUser?.user_id, loadData])

  const saveQuarterlyFromInput = useCallback(async (payload: {
    cycleLabel: string
    reflection: string
    blockers?: string
    supportNeeded?: string
  }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      await upsertQuarterlyReflection({
        owner_user_id: appUser.user_id,
        cycle_label: payload.cycleLabel,
        reflection: payload.reflection,
        blockers: payload.blockers || '',
        support_needed: payload.supportNeeded || '',
      })
      await loadData()
    } catch (err) {
      setSyncState('error')
      if (isReviewsAccessDenied(err)) {
        setPolicyBlocked(true)
        setError(REVIEWS_ACCESS_POLICY_MESSAGE)
      } else {
        setError(err instanceof Error ? err.message : String(err))
      }
      throw err
    }
  }, [appUser?.user_id, loadData])

  const saveAnnualFromInput = useCallback(async (payload: {
    reviewYear: number
    selfSummary: string
    impactExamples: string
    growthPlan: string
  }) => {
    if (!appUser?.user_id) throw new Error('No active user.')
    setSyncState('syncing')
    setError(null)
    try {
      await upsertAnnualReview({
        owner_user_id: appUser.user_id,
        review_year: payload.reviewYear,
        self_summary: payload.selfSummary,
        impact_examples: payload.impactExamples,
        growth_plan: payload.growthPlan,
      })
      await loadData()
    } catch (err) {
      setSyncState('error')
      if (isReviewsAccessDenied(err)) {
        setPolicyBlocked(true)
        setError(REVIEWS_ACCESS_POLICY_MESSAGE)
      } else {
        setError(err instanceof Error ? err.message : String(err))
      }
      throw err
    }
  }, [appUser?.user_id, loadData])

  const flows = useMemo(
    () => buildReviewsFlows({
      goals,
      createGoal: createGoalFromInput,
      addUpdate: addUpdateFromInput,
      saveQuarterlyReflection: saveQuarterlyFromInput,
      saveAnnualReview: saveAnnualFromInput,
    }),
    [addUpdateFromInput, createGoalFromInput, goals, saveAnnualFromInput, saveQuarterlyFromInput],
  )

  const patchGoal = useCallback(async (
    goalId: string,
    patch: Partial<Pick<ReviewGoal, 'status' | 'progress_percent' | 'success_metric' | 'target_date'>>,
  ) => {
    setSyncState('syncing')
    setError(null)
    try {
      const updated = await updateReviewGoal(goalId, patch)
      setGoals(prev => prev.map(row => row.id === updated.id ? updated : row))
      setSyncState('ok')
    } catch (err) {
      setSyncState('error')
      if (isReviewsAccessDenied(err)) {
        setPolicyBlocked(true)
        setError(REVIEWS_ACCESS_POLICY_MESSAGE)
      } else {
        setError(err instanceof Error ? err.message : String(err))
      }
    }
  }, [])

  const oliverConfig = useMemo<OliverConfig>(() => {
    const actions: OliverAction[] = REVIEWS_COMMANDS.map(command => {
      let run: () => void
      switch (command.id) {
        case 'open-goals':
          run = () => {
            setActivePanel('goals')
            document.getElementById('goals')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          break
        case 'open-updates':
          run = () => {
            setActivePanel('updates')
            document.getElementById('updates')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          break
        case 'open-focus-areas':
          run = () => document.getElementById('focus-areas')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          break
        case 'open-review-cycles':
          run = () => document.getElementById('review-cycles')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          break
        case 'open-admin-setup':
          run = () => router.push('/admin')
          break
        default:
          run = () => {}
      }
      return { ...command, run }
    })

    return buildModuleOliverConfig('reviews', {
      greeting: "Hi, I'm Oliver. You're in Self-Led Growth & Review. I can help create goals, log updates, and save quarterly or annual reflections.",
      actions,
      flows,
      quickConvos: [
        'Add a new growth goal in Legacy.',
        'Save this quarter reflection.',
      ],
      contextPayload: () => ({
        module_status: schemaMissing ? 'schema-missing' : policyBlocked ? 'policy-blocked' : 'workspace-live',
        counts: {
          goals: goals.length,
          updates: updates.length,
          reflections: reflections.length,
          annual_review: annualReview ? 1 : 0,
        },
      }),
      onChatRefresh: () => { void loadData() },
    })
  }, [annualReview, flows, goals.length, loadData, policyBlocked, reflections.length, router, schemaMissing, updates.length])

  useRegisterOliver(oliverConfig)

  if (!allowRender) return null

  return (
    <div className="app show-hamburger">
      <div
        className={'sidebar-backdrop' + (sidebarOpen ? ' open' : '')}
        onClick={closeSidebar}
        aria-hidden="true"
      />
      <nav className="app-sidebar" id="sidebar" aria-label="Growth and review navigation">
        <ModuleSidebarHeader title="Growth & Review" />
        <div className="app-sidebar-section">
          <div className="app-sidebar-item active" role="button" tabIndex={0}>Overview</div>
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
              className="sdr-refresh-btn"
              title="Refresh module data"
              aria-label="Refresh module data"
              onClick={() => { void loadData() }}
            >
              &#8635;
            </button>
          </div>
        </ModuleTopbar>
        <main className="page review-workspace" id="main-content">
          <ReviewsLanding />
          {error && (
            <div className="status-banner" role="alert">
              {error}
            </div>
          )}

          {schemaMissing && (
            <div className="card review-card-strong">
              <h2 className="review-section-title">Schema migration needed</h2>
              <p className="review-section-subtitle">
                Run migration `supabase/migrations/011_reviews_module_foundation.sql` to enable goals, updates, and review persistence.
              </p>
            </div>
          )}
          {policyBlocked && (
            <div className="card review-card-strong">
              <h2 className="review-section-title">Access policy check needed</h2>
              <p className="review-section-subtitle">
                Confirm Supabase RLS policy coverage for `review_*` tables for expected runtime roles before retrying.
              </p>
            </div>
          )}

          <section id="goals" className="review-section">
            <div className="review-panel-tabs" role="tablist" aria-label="Reviews workspace sections">
              <button type="button" className={'btn btn--secondary btn--sm' + (activePanel === 'goals' ? ' review-tab-active' : '')} onClick={() => setActivePanel('goals')}>Goals</button>
              <button type="button" className={'btn btn--secondary btn--sm' + (activePanel === 'updates' ? ' review-tab-active' : '')} onClick={() => setActivePanel('updates')}>Updates</button>
              <button type="button" className={'btn btn--secondary btn--sm' + (activePanel === 'quarterly' ? ' review-tab-active' : '')} onClick={() => setActivePanel('quarterly')}>Quarterly</button>
              <button type="button" className={'btn btn--secondary btn--sm' + (activePanel === 'annual' ? ' review-tab-active' : '')} onClick={() => setActivePanel('annual')}>Annual</button>
            </div>
          </section>

          {activePanel === 'goals' && (
            <section className="review-section">
              <h2 className="review-section-title">Goals</h2>
              <form
                className="card review-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!goalDraft.title.trim()) return
                  void createGoalFromInput({
                    focusArea: goalDraft.focusArea,
                    title: goalDraft.title,
                    successMetric: goalDraft.successMetric,
                    targetDate: goalDraft.targetDate,
                  }).then(() => {
                    setGoalDraft({
                      focusArea: goalDraft.focusArea,
                      title: '',
                      successMetric: '',
                      targetDate: '',
                    })
                  }).catch(() => {})
                }}
              >
                <h3 className="review-card-title">Create Goal</h3>
                <div className="review-chip-row">
                  {REVIEW_FOCUS_AREAS.map(area => (
                    <button
                      key={area.value}
                      type="button"
                      className={'btn btn--secondary btn--sm' + (goalDraft.focusArea === area.value ? ' review-chip-active' : '')}
                      onClick={() => setGoalDraft(prev => ({ ...prev, focusArea: area.value }))}
                      title={area.prompt}
                    >
                      {area.label}
                    </button>
                  ))}
                </div>
                <input
                  className="app-input"
                  placeholder="Goal title"
                  value={goalDraft.title}
                  onChange={event => setGoalDraft(prev => ({ ...prev, title: event.target.value }))}
                />
                <textarea
                  className="app-textarea"
                  placeholder="Success metric"
                  value={goalDraft.successMetric}
                  onChange={event => setGoalDraft(prev => ({ ...prev, successMetric: event.target.value }))}
                />
                <input
                  className="app-input"
                  type="date"
                  value={goalDraft.targetDate}
                  onChange={event => setGoalDraft(prev => ({ ...prev, targetDate: event.target.value }))}
                />
                <button className="btn btn--primary" type="submit" disabled={schemaMissing || policyBlocked}>Add Goal</button>
              </form>

              {loading && <div className="card">Loading goals…</div>}
              {!loading && goals.length === 0 && <div className="card">No goals yet. Start with one focus-area goal.</div>}
              {goals.map(goal => (
                <article key={goal.id} className="card review-goal-card">
                  <div className="review-goal-head">
                    <div>
                      <h3 className="review-card-title">{goal.title}</h3>
                      <p className="review-card-copy">{focusAreaLabel(goal.focus_area)} · {goal.status}</p>
                    </div>
                    <div className="review-goal-meta">{goal.progress_percent}% · {updateCountByGoal.get(goal.id) || 0} updates</div>
                  </div>
                  {goal.success_metric && <p className="review-card-copy">{goal.success_metric}</p>}
                  <div className="review-goal-bar"><div className="review-goal-fill" style={{ width: `${goal.progress_percent}%` }} /></div>
                  <div className="review-chip-row">
                    {[0, 25, 50, 75, 100].map(percent => (
                      <button
                        key={percent}
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => {
                          void patchGoal(goal.id, { progress_percent: percent })
                        }}
                        disabled={schemaMissing || policyBlocked}
                      >
                        {percent}%
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => {
                        const nextStatus = goal.status === 'completed' ? 'active' : 'completed'
                        const nextProgress = nextStatus === 'completed' ? 100 : goal.progress_percent
                        void patchGoal(goal.id, { status: nextStatus, progress_percent: nextProgress })
                      }}
                      disabled={schemaMissing || policyBlocked}
                    >
                      {goal.status === 'completed' ? 'Reopen' : 'Mark Complete'}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}

          {activePanel === 'updates' && (
            <section id="updates" className="review-section">
              <h2 className="review-section-title">Updates</h2>
              <form
                className="card review-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!updateDraft.goalId || !updateDraft.content.trim()) return
                  void addUpdateFromInput({
                    goalId: updateDraft.goalId,
                    updateType: updateDraft.updateType,
                    content: updateDraft.content,
                    evidenceLink: updateDraft.evidenceLink,
                  }).then(() => {
                    setUpdateDraft(prev => ({ ...prev, content: '', evidenceLink: '' }))
                  }).catch(() => {})
                }}
              >
                <h3 className="review-card-title">Add Update</h3>
                <CustomPicker
                  options={goalOptions}
                  selected={updateDraft.goalId}
                  onChange={(value) => {
                    const goalId = Array.isArray(value) ? (value[0] || '') : value
                    setUpdateDraft(prev => ({ ...prev, goalId }))
                  }}
                  placeholder="Pick goal"
                  showUnassigned={false}
                />
                <div className="review-chip-row">
                  {REVIEW_UPDATE_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      className={'btn btn--secondary btn--sm' + (updateDraft.updateType === type.value ? ' review-chip-active' : '')}
                      onClick={() => setUpdateDraft(prev => ({ ...prev, updateType: type.value }))}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
                <textarea
                  className="app-textarea"
                  placeholder="What happened?"
                  value={updateDraft.content}
                  onChange={event => setUpdateDraft(prev => ({ ...prev, content: event.target.value }))}
                />
                <input
                  className="app-input"
                  placeholder="Evidence link (optional)"
                  value={updateDraft.evidenceLink}
                  onChange={event => setUpdateDraft(prev => ({ ...prev, evidenceLink: event.target.value }))}
                />
                <button className="btn btn--primary" type="submit" disabled={schemaMissing || policyBlocked || goalOptions.length === 0}>Save Update</button>
              </form>

              {!loading && updates.length === 0 && <div className="card">No updates yet.</div>}
              {updates.map(update => (
                <article key={update.id} className="card review-update-card">
                  <div className="review-goal-head">
                    <span className="review-update-type">{REVIEW_UPDATE_TYPES.find(type => type.value === update.update_type)?.label || update.update_type}</span>
                    <span className="review-goal-meta">{new Date(update.created_at).toLocaleString()}</span>
                  </div>
                  <p className="review-card-copy">{update.content}</p>
                  {update.evidence_link && (
                    <a href={update.evidence_link} target="_blank" rel="noreferrer" className="review-link">
                      {update.evidence_link}
                    </a>
                  )}
                </article>
              ))}
            </section>
          )}

          {activePanel === 'quarterly' && (
            <section id="quarterly" className="review-section">
              <h2 className="review-section-title">Quarterly Reflection</h2>
              <form
                className="card review-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!quarterlyDraft.cycleLabel.trim() || !quarterlyDraft.reflection.trim()) return
                  void saveQuarterlyFromInput(quarterlyDraft).catch(() => {})
                }}
              >
                <input
                  className="app-input"
                  placeholder="Cycle label (e.g. 2026-Q2)"
                  value={quarterlyDraft.cycleLabel}
                  onChange={event => setQuarterlyDraft(prev => ({ ...prev, cycleLabel: event.target.value }))}
                />
                <textarea
                  className="app-textarea"
                  placeholder="Reflection summary"
                  value={quarterlyDraft.reflection}
                  onChange={event => setQuarterlyDraft(prev => ({ ...prev, reflection: event.target.value }))}
                />
                <textarea
                  className="app-textarea"
                  placeholder="Blockers"
                  value={quarterlyDraft.blockers}
                  onChange={event => setQuarterlyDraft(prev => ({ ...prev, blockers: event.target.value }))}
                />
                <textarea
                  className="app-textarea"
                  placeholder="Support needed"
                  value={quarterlyDraft.supportNeeded}
                  onChange={event => setQuarterlyDraft(prev => ({ ...prev, supportNeeded: event.target.value }))}
                />
                <button className="btn btn--primary" type="submit" disabled={schemaMissing || policyBlocked}>Save Quarterly Reflection</button>
              </form>

              {reflections.map(reflection => (
                <article key={reflection.id} className="card review-update-card">
                  <div className="review-goal-head">
                    <span className="review-update-type">{reflection.cycle_label}</span>
                    <span className="review-goal-meta">{new Date(reflection.updated_at).toLocaleString()}</span>
                  </div>
                  <p className="review-card-copy">{reflection.reflection}</p>
                </article>
              ))}
            </section>
          )}

          {activePanel === 'annual' && (
            <section id="annual" className="review-section">
              <h2 className="review-section-title">Annual Self-Review</h2>
              <form
                className="card review-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void saveAnnualFromInput(annualDraft).catch(() => {})
                }}
              >
                <input
                  className="app-input"
                  type="number"
                  min={2020}
                  max={2100}
                  value={annualDraft.reviewYear}
                  onChange={event => setAnnualDraft(prev => ({ ...prev, reviewYear: Number(event.target.value || new Date().getFullYear()) }))}
                />
                <textarea
                  className="app-textarea"
                  placeholder="Self-summary"
                  value={annualDraft.selfSummary}
                  onChange={event => setAnnualDraft(prev => ({ ...prev, selfSummary: event.target.value }))}
                />
                <textarea
                  className="app-textarea"
                  placeholder="Impact examples"
                  value={annualDraft.impactExamples}
                  onChange={event => setAnnualDraft(prev => ({ ...prev, impactExamples: event.target.value }))}
                />
                <textarea
                  className="app-textarea"
                  placeholder="Growth plan"
                  value={annualDraft.growthPlan}
                  onChange={event => setAnnualDraft(prev => ({ ...prev, growthPlan: event.target.value }))}
                />
                <button className="btn btn--primary" type="submit" disabled={schemaMissing || policyBlocked}>Save Annual Draft</button>
              </form>

              {annualReview && (
                <div className="card review-update-card">
                  <div className="review-goal-head">
                    <span className="review-update-type">{annualReview.review_year} Draft</span>
                    <span className="review-goal-meta">Updated {new Date(annualReview.updated_at).toLocaleString()}</span>
                  </div>
                  <p className="review-card-copy">{annualReview.self_summary || 'No summary yet.'}</p>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
