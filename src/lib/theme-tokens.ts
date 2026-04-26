export type ThemeColorToken = '--color-text-primary' | '--color-bg-card'

const TOKEN_COLOR_FALLBACKS: Record<ThemeColorToken, string> = {
  '--color-text-primary': '#1a1a1a',
  '--color-bg-card': '#feffff',
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{3,8}$/i.test(value.trim())
}

export function getThemeColorCssVar(tokenName: ThemeColorToken): string {
  return `var(${tokenName})`
}

export function getThemeColorInputValue(tokenName: ThemeColorToken): string {
  const fallback = TOKEN_COLOR_FALLBACKS[tokenName]
  if (typeof window === 'undefined') return fallback

  const resolved = getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim()
  return isHexColor(resolved) ? resolved : fallback
}
