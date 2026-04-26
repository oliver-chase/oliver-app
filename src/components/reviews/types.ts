export type ReviewFocusArea =
  | 'legacy'
  | 'craftsmanship-quality'
  | 'client-focus'
  | 'growth-ownership'

export type ReviewGoalStatus = 'draft' | 'active' | 'paused' | 'completed'

export type ReviewUpdateType = 'action' | 'win' | 'lesson' | 'feedback' | 'evidence'

export interface ReviewGoal {
  id: string
  owner_user_id: string
  focus_area: ReviewFocusArea
  title: string
  success_metric: string
  status: ReviewGoalStatus
  progress_percent: number
  target_date: string | null
  created_at: string
  updated_at: string
}

export interface ReviewUpdate {
  id: string
  goal_id: string
  owner_user_id: string
  update_type: ReviewUpdateType
  content: string
  evidence_link: string
  created_at: string
}

export interface ReviewQuarterlyReflection {
  id: string
  owner_user_id: string
  cycle_label: string
  reflection: string
  blockers: string
  support_needed: string
  created_at: string
  updated_at: string
}

export interface ReviewAnnualReview {
  id: string
  owner_user_id: string
  review_year: number
  self_summary: string
  impact_examples: string
  growth_plan: string
  created_at: string
  updated_at: string
}

export interface ReviewFocusAreaMeta {
  value: ReviewFocusArea
  label: string
  prompt: string
}

export const REVIEW_FOCUS_AREAS: ReviewFocusAreaMeta[] = [
  {
    value: 'legacy',
    label: 'Legacy',
    prompt: 'What are you building, improving, or leaving behind that creates value beyond the immediate task?',
  },
  {
    value: 'craftsmanship-quality',
    label: 'Craftsmanship / Quality',
    prompt: 'How are you improving the quality, reliability, and clarity of what you deliver?',
  },
  {
    value: 'client-focus',
    label: 'Client Focus',
    prompt: 'How are you helping clients feel informed, supported, and successful?',
  },
  {
    value: 'growth-ownership',
    label: 'Growth & Ownership',
    prompt: 'How are you expanding ownership, impact, and continuous improvement?',
  },
]

export const REVIEW_UPDATE_TYPES: Array<{ value: ReviewUpdateType; label: string }> = [
  { value: 'action', label: 'Action' },
  { value: 'win', label: 'Win' },
  { value: 'lesson', label: 'Lesson' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'evidence', label: 'Evidence' },
]
