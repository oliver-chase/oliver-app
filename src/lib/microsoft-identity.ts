import type { AccountInfo } from '@azure/msal-browser'

type MicrosoftIdentity = {
  microsoftOid?: string
  microsoftTid?: string
  microsoftSub?: string
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalize(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function claim(claims: Record<string, unknown> | undefined, key: string) {
  return normalize(claims?.[key])
}

function parseHomeAccountId(homeAccountId: string | undefined) {
  const normalized = normalize(homeAccountId)
  if (!normalized) return { subject: '', tenant: '' }
  const parts = normalized.split('.')
  if (parts.length < 2) return { subject: normalized, tenant: '' }
  return {
    subject: normalize(parts[0]),
    tenant: normalize(parts[1]),
  }
}

function prefer<T extends string>(...values: T[]) {
  for (const value of values) {
    if (value) return value
  }
  return ''
}

export function getAccountMicrosoftIdentity(account: AccountInfo | null): MicrosoftIdentity {
  if (!account) return {}

  const claims = account.idTokenClaims as Record<string, unknown> | undefined
  const home = parseHomeAccountId(account.homeAccountId)
  const localAccountId = normalize(account.localAccountId)

  const microsoftTid = prefer(
    claim(claims, 'tid'),
    normalize(account.tenantId),
    home.tenant,
  )

  const microsoftSub = prefer(
    claim(claims, 'sub'),
    localAccountId,
    home.subject,
  )

  const oidFromClaims = claim(claims, 'oid')
  const microsoftOid = prefer(
    oidFromClaims,
    GUID_RE.test(localAccountId) ? localAccountId : '',
    GUID_RE.test(home.subject) ? home.subject : '',
  )

  const identity: MicrosoftIdentity = {}
  if (microsoftOid) identity.microsoftOid = microsoftOid
  if (microsoftTid) identity.microsoftTid = microsoftTid
  if (microsoftSub) identity.microsoftSub = microsoftSub
  return identity
}
