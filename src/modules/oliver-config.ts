import type { OliverConfig } from '@/components/shared/OliverContext'
import type { ModuleId } from '@/modules/registry'
import { getModuleById } from '@/modules/registry'
import { getConversationPath } from '@/lib/chatbot-conversation-paths'

type ModuleOliverConfigOverrides = Omit<OliverConfig, 'pageLabel' | 'placeholder' | 'greeting'> & {
  placeholder?: string
  greeting?: string
}

export function buildModuleOliverConfig(
  moduleId: ModuleId,
  overrides: ModuleOliverConfigOverrides,
): OliverConfig {
  const module = getModuleById(moduleId)

  return {
    ...overrides,
    pageLabel: module.pageLabel,
    placeholder: overrides.placeholder ?? module.defaultPlaceholder,
    greeting: overrides.greeting ?? module.defaultGreeting,
    conversationPath: overrides.conversationPath ?? getConversationPath(moduleId),
  }
}
