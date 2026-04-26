import type { OliverFlow } from '@/components/shared/OliverContext'
import type { ReviewFocusArea, ReviewGoal, ReviewUpdateType } from '@/components/reviews/types'

type Ctx = {
  goals: ReviewGoal[]
  createGoal: (payload: {
    focusArea: ReviewFocusArea
    title: string
    successMetric?: string
    targetDate?: string
  }) => Promise<void>
  addUpdate: (payload: {
    goalId: string
    updateType: ReviewUpdateType
    content: string
    evidenceLink?: string
  }) => Promise<void>
  saveQuarterlyReflection: (payload: {
    cycleLabel: string
    reflection: string
    blockers?: string
    supportNeeded?: string
  }) => Promise<void>
  saveAnnualReview: (payload: {
    reviewYear: number
    selfSummary: string
    impactExamples: string
    growthPlan: string
  }) => Promise<void>
}

const asText = (value: unknown) => (value == null ? '' : String(value).trim())

export function buildReviewsFlows(ctx: Ctx): OliverFlow[] {
  const { goals, createGoal, addUpdate, saveQuarterlyReflection, saveAnnualReview } = ctx

  return [
    {
      id: 'add-review-goal',
      label: 'Add Growth Goal',
      aliases: ['add goal', 'new growth goal', 'create review goal'],
      steps: [
        {
          id: 'focus_area',
          prompt: 'Which focus area?',
          kind: 'choice',
          choices: [
            { label: 'Legacy', value: 'legacy' },
            { label: 'Craftsmanship / Quality', value: 'craftsmanship-quality' },
            { label: 'Client Focus', value: 'client-focus' },
            { label: 'Growth & Ownership', value: 'growth-ownership' },
          ],
        },
        {
          id: 'title',
          prompt: 'Goal title?',
          kind: 'text',
          placeholder: 'Specific goal statement',
        },
        {
          id: 'success_metric',
          prompt: 'Success metric? (optional)',
          kind: 'text',
          placeholder: 'How success will be measured',
          optional: true,
        },
        {
          id: 'target_date',
          prompt: 'Target date? (optional, YYYY-MM-DD)',
          kind: 'text',
          placeholder: '2026-12-31',
          optional: true,
        },
      ],
      run: async (answers) => {
        const focusArea = asText(answers.focus_area) as ReviewFocusArea
        const title = asText(answers.title)
        if (!title) return 'Goal title is required.'
        await createGoal({
          focusArea,
          title,
          successMetric: asText(answers.success_metric),
          targetDate: asText(answers.target_date),
        })
        return 'Growth goal added.'
      },
    },
    {
      id: 'add-review-update',
      label: 'Add Progress Update',
      aliases: ['add update', 'log progress', 'record evidence'],
      steps: [
        {
          id: 'goal_id',
          prompt: 'Which goal?',
          kind: 'entity',
          options: () => goals.map(goal => ({
            label: `${goal.title} (${goal.focus_area})`,
            value: goal.id,
          })),
        },
        {
          id: 'update_type',
          prompt: 'Update type?',
          kind: 'choice',
          choices: [
            { label: 'Action', value: 'action' },
            { label: 'Win', value: 'win' },
            { label: 'Lesson', value: 'lesson' },
            { label: 'Feedback', value: 'feedback' },
            { label: 'Evidence', value: 'evidence' },
          ],
        },
        {
          id: 'content',
          prompt: 'What happened?',
          kind: 'text',
          placeholder: 'Summary of progress update',
        },
        {
          id: 'evidence_link',
          prompt: 'Evidence link? (optional)',
          kind: 'text',
          placeholder: 'https://...',
          optional: true,
        },
      ],
      run: async (answers) => {
        const goalId = asText(answers.goal_id)
        const content = asText(answers.content)
        if (!goalId) return 'Pick a goal first.'
        if (!content) return 'Update content is required.'
        await addUpdate({
          goalId,
          updateType: asText(answers.update_type) as ReviewUpdateType,
          content,
          evidenceLink: asText(answers.evidence_link),
        })
        return 'Progress update added.'
      },
    },
    {
      id: 'save-quarterly-reflection',
      label: 'Save Quarterly Reflection',
      aliases: ['quarterly reflection', 'save quarter review', 'quarterly check-in'],
      steps: [
        {
          id: 'cycle_label',
          prompt: 'Cycle label? (e.g. 2026-Q2)',
          kind: 'text',
          placeholder: '2026-Q2',
        },
        {
          id: 'reflection',
          prompt: 'Reflection summary?',
          kind: 'text',
          placeholder: 'What moved forward this quarter',
        },
        {
          id: 'blockers',
          prompt: 'Blockers? (optional)',
          kind: 'text',
          placeholder: 'Current blockers',
          optional: true,
        },
        {
          id: 'support_needed',
          prompt: 'Support needed? (optional)',
          kind: 'text',
          placeholder: 'Where support is needed',
          optional: true,
        },
      ],
      run: async (answers) => {
        const cycleLabel = asText(answers.cycle_label)
        const reflection = asText(answers.reflection)
        if (!cycleLabel || !reflection) return 'Cycle label and reflection are required.'
        await saveQuarterlyReflection({
          cycleLabel,
          reflection,
          blockers: asText(answers.blockers),
          supportNeeded: asText(answers.support_needed),
        })
        return `Quarterly reflection saved for ${cycleLabel}.`
      },
    },
    {
      id: 'save-annual-review',
      label: 'Save Annual Review Draft',
      aliases: ['annual review draft', 'self review', 'annual reflection'],
      steps: [
        {
          id: 'review_year',
          prompt: 'Review year?',
          kind: 'number',
          placeholder: String(new Date().getFullYear()),
        },
        {
          id: 'self_summary',
          prompt: 'Self-summary?',
          kind: 'text',
          placeholder: 'Year summary',
        },
        {
          id: 'impact_examples',
          prompt: 'Impact examples?',
          kind: 'text',
          placeholder: 'Examples and outcomes',
        },
        {
          id: 'growth_plan',
          prompt: 'Growth plan?',
          kind: 'text',
          placeholder: 'Next-cycle growth plan',
        },
      ],
      run: async (answers) => {
        const year = Number(asText(answers.review_year))
        if (!Number.isFinite(year) || year < 2020 || year > 2100) return 'Enter a valid review year.'
        await saveAnnualReview({
          reviewYear: year,
          selfSummary: asText(answers.self_summary),
          impactExamples: asText(answers.impact_examples),
          growthPlan: asText(answers.growth_plan),
        })
        return `Annual review draft saved for ${year}.`
      },
    },
  ]
}
