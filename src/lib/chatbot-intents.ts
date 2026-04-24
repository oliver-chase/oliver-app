import { getConversationPath, type OliverConversationPath, type OliverConversationPathId } from '@/lib/chatbot-conversation-paths'

interface ModuleIntentPattern {
  moduleId: OliverConversationPathId
  pattern: RegExp
}

const MODULE_INTENT_PATTERNS: readonly ModuleIntentPattern[] = [
  { moduleId: 'slides', pattern: /\b(slide|slides|presentation|deck|html import|component json)\b/i },
  { moduleId: 'admin', pattern: /\b(admin|permission|access control|design token|token editor|component library|user manager)\b/i },
  { moduleId: 'sdr', pattern: /\b(sdr|prospect|lead|outreach|approval queue|draft email|reply rate|pipeline updates?)\b/i },
  { moduleId: 'hr', pattern: /\b(hr|people ops|candidate|applicant|interview|employee|onboard(?:ing)?|offboard(?:ing)?|device inventory|assignment)\b/i },
  { moduleId: 'accounts', pattern: /\b(account(?:s)?|portfolio|stakeholder|org chart|meeting notes?|transcript|strategic account|opportunit(?:y|ies)|project(?:s)?)\b/i },
  { moduleId: 'crm', pattern: /\b(crm|business development|bd roadmap|deal pipeline|proposal)\b/i },
]

function detectRequestedModule(
  text: string,
  currentModuleId: OliverConversationPathId,
): OliverConversationPathId | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const matches: OliverConversationPathId[] = []
  for (const matcher of MODULE_INTENT_PATTERNS) {
    if (!matcher.pattern.test(trimmed)) continue
    if (!matches.includes(matcher.moduleId)) matches.push(matcher.moduleId)
  }

  if (matches.length === 0) return null
  if (matches.includes(currentModuleId)) return null
  return matches[0]
}

export function detectPathScopeViolation(
  text: string,
  currentPath: OliverConversationPath,
): { requested: OliverConversationPath; message: string } | null {
  const requestedModuleId = detectRequestedModule(text, currentPath.moduleId)
  if (!requestedModuleId) return null

  const requested = getConversationPath(requestedModuleId)
  const scopeText = currentPath.allowedTopics.join(', ')
  const message = `You are in ${currentPath.label}. I can help with ${scopeText}. For ${requested.label}, open that module first.`
  return { requested, message }
}
