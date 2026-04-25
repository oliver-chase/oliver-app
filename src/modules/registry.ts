import type { PagePermission } from '@/types/auth'

export type ModuleId = PagePermission

export interface ModuleDefinition {
  id: ModuleId
  name: string
  description: string
  href: string
  pageLabel: string
  defaultPlaceholder: string
  defaultGreeting: string
  comingSoon?: boolean
  enabledByDefault?: boolean
  showInHub?: boolean
}

const MODULES: ModuleDefinition[] = [
  {
    id: 'accounts',
    name: 'Account Strategy & Planning',
    description: 'Strategic account planning, stakeholder mapping, meeting notes, and action tracking.',
    href: '/accounts',
    pageLabel: 'Account Planning',
    defaultPlaceholder: 'Type a message or pick a command...',
    defaultGreeting: "Hi, I'm Oliver. You're viewing Account Planning. What would you like to do?",
  },
  {
    id: 'hr',
    name: 'HR & People Ops',
    description: 'Applicant tracking, employee directory, onboarding, and device management.',
    href: '/hr',
    pageLabel: 'HR & People Ops',
    defaultPlaceholder: 'What do you want to do?',
    defaultGreeting: "Hi, I'm Oliver. You're viewing HR & People Ops. What would you like to do?",
  },
  {
    id: 'sdr',
    name: 'SDR & Outreach',
    description: 'Prospect pipeline, outreach sequences, and engagement tracking.',
    href: '/sdr',
    pageLabel: 'SDR & Outreach',
    defaultPlaceholder: 'What do you want to do?',
    defaultGreeting: "Hi, I'm Oliver. You're viewing SDR & Outreach. What would you like to do?",
  },
  {
    id: 'slides',
    name: 'Slide Editor',
    description: 'Import slide HTML, save to My Slides, and manage templates.',
    href: '/slides',
    pageLabel: 'Slide Editor',
    defaultPlaceholder: 'Import or paste slide HTML, then save or export...',
    defaultGreeting: "Hi, I'm Oliver. You're viewing Slide Editor. Import HTML, edit slides, and export when ready.",
  },
  {
    id: 'reviews',
    name: 'Self-Led Growth & Review',
    description: 'Employee-driven growth tracking, evidence capture, and reviewer preparation workflows.',
    href: '/reviews',
    pageLabel: 'Growth & Review',
    defaultPlaceholder: 'Ask about focus areas, quarterly prompts, or review packet setup…',
    defaultGreeting: "Hi, I'm Oliver. You're viewing Self-Led Growth & Review. Goals, updates, quarterly reflections, and annual drafts are available.",
    comingSoon: true,
    showInHub: false,
  },
  {
    id: 'crm',
    name: 'CRM & Business Development',
    description: 'Client relationships, opportunity tracking, and proposal management.',
    href: '/crm',
    pageLabel: 'CRM & Business Development',
    defaultPlaceholder: 'Ask about the CRM roadmap…',
    defaultGreeting: "Hi, I'm Oliver. CRM & Business Development is in the backlog.",
    comingSoon: true,
    enabledByDefault: false,
    showInHub: false,
  },
]

const MODULE_BY_ID = new Map<ModuleId, ModuleDefinition>(MODULES.map(module => [module.id, module]))

function parseModuleIdList(rawValue: string | undefined): Set<ModuleId> {
  if (!rawValue) return new Set<ModuleId>()
  const ids = rawValue
    .split(',')
    .map(part => part.trim().toLowerCase())
    .filter(Boolean)

  const result = new Set<ModuleId>()
  for (const id of ids) {
    if (MODULE_BY_ID.has(id as ModuleId)) result.add(id as ModuleId)
  }
  return result
}

const DISABLED_MODULES = parseModuleIdList(process.env.NEXT_PUBLIC_DISABLED_MODULES)

export function getModuleById(id: ModuleId): ModuleDefinition {
  const module = MODULE_BY_ID.get(id)
  if (!module) throw new Error('Unknown module: ' + id)
  return module
}

export function getAllModules(): ModuleDefinition[] {
  return MODULES
}

export function getPermissionModules(): ModuleDefinition[] {
  return MODULES.filter(module => module.showInHub !== false)
}

export function isModuleEnabled(id: ModuleId): boolean {
  const module = getModuleById(id)
  if (module.enabledByDefault === false) return false
  return !DISABLED_MODULES.has(id)
}

export function getHubModules(): ModuleDefinition[] {
  return getPermissionModules().filter(module => isModuleEnabled(module.id))
}
