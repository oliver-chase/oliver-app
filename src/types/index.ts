export interface Account {
  account_id: string
  account_name: string
  client_company: string
  status: 'Active' | 'Archived'
  created_date: string
  last_updated: string
}

export interface Engagement {
  engagement_id: string
  account_id: string
  engagement_name: string
  status: string
  start_date: string
  description: string
  delivery_model: string
  created_date: string
  last_updated: string
}

export interface Stakeholder {
  stakeholder_id: string
  account_id: string
  engagement_id: string
  name: string
  title: string
  department: string
  organization: string
  is_executive: string
  sentiment: 'Champion' | 'Supporter' | 'Neutral' | 'Detractor' | 'Unknown'
  primary_owner: string
  secondary_owner: string
  reports_to: string
  notes: string
  created_date: string
  last_updated: string
}

export interface Action {
  action_id: string
  account_id: string
  engagement_id: string
  description: string
  owner: string
  status: 'Open' | 'In Progress' | 'Done'
  closed_date: string
  created_date: string
  last_updated: string
}

export interface Note {
  note_id: string
  account_id: string
  engagement_id: string
  date: string
  type: string
  title: string
  template_data: string
  body: string
  transcript_link: string
  created_date: string
  last_updated: string
}

export interface Opportunity {
  opportunity_id: string
  account_id: string
  engagement_id: string
  description: string
  status: 'Identified' | 'Pursuing' | 'Won' | 'Lost'
  owners: string[]
  value: string
  close_date: string
  year: string
  notes: string
  created_date: string
  last_updated: string
}

export interface Project {
  project_id: string
  account_id: string
  engagement_id: string
  project_name: string
  status: 'Active' | 'Complete' | 'On Hold'
  client_stakeholder_ids: string[]
  notes: string
  year: string
  created_date: string
  last_updated: string
}

export interface Background {
  background_id: string
  account_id: string
  engagement_id: string
  overview: string
  strategic_context: string
  delivery_model: string
  key_dates: string
  account_director: string
  account_manager: string
  account_team: string
  next_meeting: string
  account_tier: 'Strategic' | 'Growth' | 'Maintenance' | 'At-Risk' | ''
  meeting_title: string
  meeting_frequency: string
  meeting_day: string
  meeting_attendees: string
  meeting_interval: string
  next_meeting_override: string
  revenue: Record<string, { projected: string; closed: string }>
  created_date: string
  last_updated: string
}

export type AccountTier = 'Strategic' | 'Growth' | 'Maintenance' | 'At-Risk'

export interface AppState {
  accounts: Account[]
  engagements: Engagement[]
  stakeholders: Stakeholder[]
  actions: Action[]
  notes: Note[]
  opportunities: Opportunity[]
  projects: Project[]
  background: Background[]
}
