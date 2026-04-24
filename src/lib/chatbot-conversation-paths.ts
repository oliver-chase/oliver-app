export type OliverConversationPathId =
  | 'accounts'
  | 'hr'
  | 'sdr'
  | 'slides'
  | 'crm'
  | 'admin'

export interface OliverConversationPath {
  id: OliverConversationPathId
  moduleId: OliverConversationPathId
  label: string
  allowedTopics: string[]
}

const PATHS: Record<OliverConversationPathId, OliverConversationPath> = {
  accounts: {
    id: 'accounts',
    moduleId: 'accounts',
    label: 'Account Strategy & Planning',
    allowedTopics: ['account list', 'portfolio health', 'stakeholders', 'opportunities', 'projects', 'meeting transcripts'],
  },
  hr: {
    id: 'hr',
    moduleId: 'hr',
    label: 'HR & People Ops',
    allowedTopics: ['candidates', 'employees', 'onboarding', 'offboarding', 'inventory', 'assignments', 'hr reporting'],
  },
  sdr: {
    id: 'sdr',
    moduleId: 'sdr',
    label: 'SDR & Outreach',
    allowedTopics: ['prospects', 'lead status', 'email drafts', 'approval queue', 'outreach activity'],
  },
  slides: {
    id: 'slides',
    moduleId: 'slides',
    label: 'Slide Editor',
    allowedTopics: ['html import', 'slide component conversion', 'slide parsing'],
  },
  crm: {
    id: 'crm',
    moduleId: 'crm',
    label: 'CRM & Business Development',
    allowedTopics: ['crm roadmap', 'business development scope'],
  },
  admin: {
    id: 'admin',
    moduleId: 'admin',
    label: 'Admin',
    allowedTopics: ['user permissions', 'design tokens', 'component library', 'admin controls'],
  },
}

export function getConversationPath(id: OliverConversationPathId): OliverConversationPath {
  return PATHS[id]
}
