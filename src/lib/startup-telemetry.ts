export type StartupMetricName =
  | 'auth_bootstrap_ms'
  | 'user_fetch_ms'
  | 'permission_filter_ms'
  | 'hub_interactive_ms'

export interface StartupBudgetThreshold {
  p50: number
  p95: number
}

export interface StartupTimingSample {
  metric: StartupMetricName
  duration_ms: number
  route: string
  at: string
  viewport: 'mobile' | 'desktop'
  cold_start: boolean
}

interface StartupBudgetSummaryItem extends StartupBudgetThreshold {
  count: number
  p50_actual: number | null
  p95_actual: number | null
  pass: boolean
}

export interface StartupBudgetSummary {
  generated_at: string
  budgets: Record<StartupMetricName, StartupBudgetSummaryItem>
}

const STORAGE_KEY = 'oliver-startup-telemetry-v1'
const MAX_SAMPLES = 240
const COLD_START_WINDOW_MS = 30_000

export const STARTUP_BUDGET_MS: Record<StartupMetricName, StartupBudgetThreshold> = {
  auth_bootstrap_ms: { p50: 900, p95: 1800 },
  user_fetch_ms: { p50: 800, p95: 1800 },
  permission_filter_ms: { p50: 40, p95: 120 },
  hub_interactive_ms: { p50: 2500, p95: 4000 },
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function getNowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

function quantile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null
  const clampedQ = Math.max(0, Math.min(1, q))
  const index = Math.floor((sorted.length - 1) * clampedQ)
  const value = sorted[index]
  return Number.isFinite(value) ? value : null
}

function getViewport(): 'mobile' | 'desktop' {
  if (!isBrowser()) return 'desktop'
  return window.innerWidth <= 768 ? 'mobile' : 'desktop'
}

function getSessionStartMs(): number {
  if (!isBrowser()) return 0
  const existing = window.sessionStorage.getItem('oliver-startup-session-start-ms')
  if (existing && Number.isFinite(Number(existing))) return Number(existing)
  const now = Date.now()
  window.sessionStorage.setItem('oliver-startup-session-start-ms', String(now))
  return now
}

function readSamples(): StartupTimingSample[] {
  if (!isBrowser()) return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.metric === 'string') : []
  } catch {
    return []
  }
}

function writeSamples(samples: StartupTimingSample[]) {
  if (!isBrowser()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(samples.slice(-MAX_SAMPLES)))
}

export function clearStartupTimingSamples() {
  if (!isBrowser()) return
  window.localStorage.removeItem(STORAGE_KEY)
  if (window.__oliverStartupTelemetry) {
    window.__oliverStartupTelemetry = getStartupBudgetSummary()
  }
}

export function recordStartupTiming(metric: StartupMetricName, durationMs: number, route = '/') {
  if (!isBrowser()) return
  if (!Number.isFinite(durationMs)) return
  const boundedDuration = Math.max(0, Math.round(durationMs))
  const sessionAge = Date.now() - getSessionStartMs()
  const next: StartupTimingSample = {
    metric,
    duration_ms: boundedDuration,
    route,
    at: new Date().toISOString(),
    viewport: getViewport(),
    cold_start: sessionAge <= COLD_START_WINDOW_MS,
  }
  const samples = readSamples()
  samples.push(next)
  writeSamples(samples)
  window.__oliverStartupTelemetry = getStartupBudgetSummary()
}

export function getStartupTimingSamples(): StartupTimingSample[] {
  return readSamples()
}

function summarizeMetric(samples: StartupTimingSample[], metric: StartupMetricName): StartupBudgetSummaryItem {
  const budget = STARTUP_BUDGET_MS[metric]
  const series = samples
    .filter((sample) => sample.metric === metric)
    .map((sample) => sample.duration_ms)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b)

  const p50Actual = quantile(series, 0.5)
  const p95Actual = quantile(series, 0.95)

  const pass = (p50Actual === null || p50Actual <= budget.p50)
    && (p95Actual === null || p95Actual <= budget.p95)

  return {
    p50: budget.p50,
    p95: budget.p95,
    count: series.length,
    p50_actual: p50Actual,
    p95_actual: p95Actual,
    pass,
  }
}

export function getStartupBudgetSummary(): StartupBudgetSummary {
  const samples = readSamples()
  return {
    generated_at: new Date().toISOString(),
    budgets: {
      auth_bootstrap_ms: summarizeMetric(samples, 'auth_bootstrap_ms'),
      user_fetch_ms: summarizeMetric(samples, 'user_fetch_ms'),
      permission_filter_ms: summarizeMetric(samples, 'permission_filter_ms'),
      hub_interactive_ms: summarizeMetric(samples, 'hub_interactive_ms'),
    },
  }
}

export function withStartupTimer<T>(metric: StartupMetricName, route: string, run: () => T): T {
  const start = getNowMs()
  const result = run()
  const elapsed = getNowMs() - start
  recordStartupTiming(metric, elapsed, route)
  return result
}

declare global {
  interface Window {
    __oliverStartupTelemetry?: StartupBudgetSummary
  }
}
