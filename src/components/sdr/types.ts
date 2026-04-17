export interface SdrProspect {
  id: string
  nm: string
  fn: string
  ti: string
  co: string
  em: string
  dm: string
  st: string
  tr: string
  sig: string
  ind: string
  sz: string
  rev: string
  city: string
  state: string
  country: string
  fuc: string
  fc: string
  sc: string
  tc: string
  nfu: string
  lc: string
  lu: string
  created_at: string
}

export interface SdrApprovalItem {
  id: string
  batch_date: string
  prospect_id: string
  em: string
  fn: string
  nm: string
  ti: string
  co: string
  tr: string
  touch: string
  subject: string
  body: string
  gen: string
  status: string
  ts: string
  created_at: string
}

export interface SdrSend {
  id: string
  prospect_id: string
  draft_id: string
  em: string
  fn: string
  nm: string
  ti: string
  co: string
  subject: string
  sent_at: string
  status: string
  fuc: string
  created_at: string
}

export type SdrTab = 'overview' | 'prospects' | 'drafts' | 'outreach'

export interface SdrFilters {
  status: string
  search: string
  track: string
  page: number
}

export const PROSPECT_STATUS_LABEL: Record<string, string> = {
  new: 'New',
  email_discovered: 'Email Found',
  draft_generated: 'Draft Ready',
  awaiting_approval: 'Awaiting Approval',
  email_sent: 'Email Sent',
  followup_due: 'Follow-up Due',
  ooo_pending: 'OOO',
  closed_positive: 'Won',
  closed_negative: 'Lost',
  closed_no_reply: 'No Reply',
  bounced_no_alt: 'Bounced',
}

export const TRACK_LABEL: Record<string, string> = {
  'product-maker': 'Product Maker',
  'ai-enablement': 'AI Enablement',
  'pace-car': 'Pace Car',
}

export const FILTER_STATUSES = [
  'new', 'email_discovered', 'draft_generated', 'email_sent',
  'followup_due', 'ooo_pending', 'closed_positive', 'closed_negative',
  'closed_no_reply', 'bounced_no_alt',
]

export const CLOSED_STATUSES = new Set(['closed_positive', 'closed_negative', 'closed_no_reply', 'bounced_no_alt'])
