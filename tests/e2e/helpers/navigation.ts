import type { Page } from '@playwright/test'

interface GotoAndSettleOptions {
  waitUntil?: 'commit' | 'domcontentloaded' | 'load' | 'networkidle'
  settle?: boolean
  settleState?: 'domcontentloaded' | 'load' | 'networkidle'
  maxAttempts?: number
  retryDelayMs?: number
}

function isRetryableNavigationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message || ''
  return message.includes('ERR_CONNECTION_REFUSED') || message.includes('ECONNREFUSED')
}

export async function gotoAndSettle(page: Page, path: string, options: GotoAndSettleOptions = {}) {
  const {
    waitUntil = 'load',
    settle = true,
    settleState = 'networkidle',
    maxAttempts = 3,
    retryDelayMs = 500,
  } = options

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await page.goto(path, { waitUntil })
      if (settle) {
        await page.waitForLoadState(settleState)
      }
      return
    } catch (error) {
      const shouldRetry = isRetryableNavigationError(error) && attempt < maxAttempts
      if (!shouldRetry) throw error
      await page.waitForTimeout(retryDelayMs * attempt)
    }
  }
}
