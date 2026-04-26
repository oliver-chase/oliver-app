import { getConversationPath, type OliverConversationPath, type OliverConversationPathId } from '@/lib/chatbot-conversation-paths'
import type { ModuleId } from '@/modules/registry'
import { isModuleEnabled, isModuleHubVisible } from '@/modules/registry'

interface ModuleIntentPattern {
  moduleId: OliverConversationPathId
  pattern: RegExp
}

type PathIntentDetection =
  | { type: 'discoverable'; moduleId: OliverConversationPathId }
  | { type: 'hidden' }

const PROFILE_INTENT_PATTERN =
  /\b(my profile|profile settings|change (?:my )?(?:password|email|name)|update (?:my )?(?:password|email|name)|edit (?:my )?(?:password|email|name)|security info|security settings|sign-?in settings|personal info|account security|manage (?:my )?(?:password|email|name))\b/i

const MODULE_INTENT_PATTERNS: readonly ModuleIntentPattern[] = [
  { moduleId: 'slides', pattern: /\b(slide|slides|presentation|deck|html import|component json)\b/i },
  { moduleId: 'reviews', pattern: /\b(self-?led growth|growth review|review packet|focus area|focus areas|quarterly prompt|annual self review|performance review)\b/i },
  {
    moduleId: 'campaigns',
    pattern: /\b(campaign|content library|review queue|unclaimed content|claim content|mark as posted|posting reminder|ics|campaign report)\b/i,
  },
  { moduleId: 'admin', pattern: /\b(admin|permission|access control|design token|token editor|component library|user manager)\b/i },
  { moduleId: 'sdr', pattern: /\b(sdr|prospect|lead|outreach|approval queue|draft email|reply rate|pipeline updates?)\b/i },
  { moduleId: 'hr', pattern: /\b(hr|people ops|candidate|applicant|interview|employee|onboard(?:ing)?|offboard(?:ing)?|device inventory|assignment)\b/i },
  { moduleId: 'accounts', pattern: /\b(account(?:s)?|portfolio|stakeholder|org chart|meeting notes?|transcript|strategic account|opportunit(?:y|ies)|project(?:s)?)\b/i },
  { moduleId: 'crm', pattern: /\b(crm|business development|bd roadmap|deal pipeline|proposal)\b/i },
]

function isDiscoverableIntentModule(moduleId: OliverConversationPathId): boolean {
  if (moduleId === 'admin') return true
  const modulePermission = moduleId as ModuleId
  return isModuleEnabled(modulePermission) && isModuleHubVisible(modulePermission)
}

function detectRequestedModule(
  text: string,
  currentModuleId: OliverConversationPathId,
): PathIntentDetection | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const discoverableMatches: OliverConversationPathId[] = []
  let matchedHiddenModule = false
  for (const matcher of MODULE_INTENT_PATTERNS) {
    if (!isDiscoverableIntentModule(matcher.moduleId)) continue
    if (!matcher.pattern.test(trimmed)) continue
    if (!discoverableMatches.includes(matcher.moduleId)) discoverableMatches.push(matcher.moduleId)
  }

  for (const matcher of MODULE_INTENT_PATTERNS) {
    if (isDiscoverableIntentModule(matcher.moduleId)) continue
    if (!matcher.pattern.test(trimmed)) continue
    matchedHiddenModule = true
    break
  }

  if (discoverableMatches.includes(currentModuleId)) return null
  if (discoverableMatches.length > 0) {
    return { type: 'discoverable', moduleId: discoverableMatches[0] }
  }
  if (matchedHiddenModule) return { type: 'hidden' }
  return null
}

export function detectPathScopeViolation(
  text: string,
  currentPath: OliverConversationPath,
): { requested: OliverConversationPath | null; message: string } | null {
  const intentDetection = detectRequestedModule(text, currentPath.moduleId)
  if (!intentDetection) return null

  const scopeText = currentPath.allowedTopics.join(', ')
  if (intentDetection.type === 'hidden') {
    return {
      requested: null,
      message: `You are in ${currentPath.label}. I can help with ${scopeText}. That workflow is not available in this environment.`,
    }
  }

  const requested = getConversationPath(intentDetection.moduleId)
  const message = `You are in ${currentPath.label}. I can help with ${scopeText}. For ${requested.label}, open that module first.`
  return { requested, message }
}

export function detectProfileIntent(text: string): boolean {
  return PROFILE_INTENT_PATTERN.test(text.trim())
}
