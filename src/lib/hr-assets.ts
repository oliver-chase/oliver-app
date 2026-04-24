export type StoredDocumentAssetKind = 'file' | 'link'

export interface StoredDocumentAsset {
  id: string
  name: string
  kind: StoredDocumentAssetKind
  url: string
  mimeType?: string
  createdAt: string
}

const RESUME_SCHEMA = 'oliver-resume-v1'
const RECEIPT_SCHEMA = 'oliver-receipts-v1'
const RECEIPT_MARKER_START = '<!--OLIVER_RECEIPTS:'
const RECEIPT_MARKER_END = '-->'

function nowIso() {
  return new Date().toISOString()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function validDate(value: string | undefined): string {
  if (!value) return nowIso()
  const stamp = Date.parse(value)
  return Number.isFinite(stamp) ? new Date(stamp).toISOString() : nowIso()
}

function normalizeAsset(value: unknown, fallbackName = 'Attachment'): StoredDocumentAsset | null {
  if (!isRecord(value)) return null
  const rawUrl = typeof value.url === 'string' ? value.url.trim() : ''
  if (!rawUrl) return null
  const rawKind = value.kind === 'file' ? 'file' : 'link'
  const rawName = typeof value.name === 'string' ? value.name.trim() : ''
  const createdAt = validDate(typeof value.createdAt === 'string' ? value.createdAt : undefined)
  const mimeType = typeof value.mimeType === 'string' && value.mimeType.trim() ? value.mimeType.trim() : undefined
  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id : 'ASSET-' + crypto.randomUUID(),
    name: rawName || fallbackName,
    kind: rawKind,
    url: rawUrl,
    mimeType,
    createdAt,
  }
}

export function sortAssetsNewestFirst<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

function normalizeAssetList(list: unknown, fallbackName: string): StoredDocumentAsset[] {
  if (!Array.isArray(list)) return []
  const out: StoredDocumentAsset[] = []
  for (const item of list) {
    const normalized = normalizeAsset(item, fallbackName)
    if (normalized) out.push(normalized)
  }
  return sortAssetsNewestFirst(out)
}

export function parseResumeAssets(rawResumeField: string): StoredDocumentAsset[] {
  const raw = (rawResumeField || '').trim()
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      return normalizeAssetList(parsed, 'Resume')
    }
    if (isRecord(parsed) && parsed.schema === RESUME_SCHEMA) {
      return normalizeAssetList(parsed.items, 'Resume')
    }
  } catch {
    // Legacy string format: single URL/link.
  }

  const isLikelyUrl = /^https?:\/\//i.test(raw) || raw.startsWith('data:')
  if (!isLikelyUrl) return []
  return [{
    id: 'ASSET-' + crypto.randomUUID(),
    name: 'Resume',
    kind: raw.startsWith('data:') ? 'file' : 'link',
    url: raw,
    createdAt: nowIso(),
  }]
}

export function serializeResumeAssets(assets: StoredDocumentAsset[]): string {
  const cleaned = sortAssetsNewestFirst(
    assets
      .map(a => normalizeAsset(a, 'Resume'))
      .filter((a): a is StoredDocumentAsset => !!a),
  )
  if (!cleaned.length) return ''
  return JSON.stringify({ schema: RESUME_SCHEMA, items: cleaned })
}

export function parseDeviceReceiptsFromNotes(notes: string) {
  const raw = notes || ''
  const markerIdx = raw.lastIndexOf(RECEIPT_MARKER_START)
  if (markerIdx < 0) {
    return { plainNotes: raw.trim(), receipts: [] as StoredDocumentAsset[] }
  }
  const markerEnd = raw.indexOf(RECEIPT_MARKER_END, markerIdx)
  if (markerEnd < 0) {
    return { plainNotes: raw.trim(), receipts: [] as StoredDocumentAsset[] }
  }

  const jsonText = raw.slice(markerIdx + RECEIPT_MARKER_START.length, markerEnd).trim()
  const plainNotes = raw.slice(0, markerIdx).trim()

  try {
    const parsed = JSON.parse(jsonText) as unknown
    if (isRecord(parsed) && parsed.schema === RECEIPT_SCHEMA) {
      return { plainNotes, receipts: normalizeAssetList(parsed.items, 'Receipt') }
    }
  } catch {
    // Ignore malformed metadata and keep plain text.
  }

  return { plainNotes, receipts: [] as StoredDocumentAsset[] }
}

export function mergeDeviceReceiptsIntoNotes(plainNotes: string, receipts: StoredDocumentAsset[]) {
  const cleanPlain = (plainNotes || '').trim()
  const cleanReceipts = sortAssetsNewestFirst(
    receipts
      .map(r => normalizeAsset(r, 'Receipt'))
      .filter((r): r is StoredDocumentAsset => !!r),
  )
  if (!cleanReceipts.length) return cleanPlain
  const payload = JSON.stringify({ schema: RECEIPT_SCHEMA, items: cleanReceipts })
  const meta = RECEIPT_MARKER_START + payload + RECEIPT_MARKER_END
  return cleanPlain ? cleanPlain + '\n\n' + meta : meta
}

export function inferNameFromUrl(url: string, fallback: string) {
  const trimmed = (url || '').trim()
  if (!trimmed) return fallback
  try {
    const parsed = new URL(trimmed)
    const pathBits = parsed.pathname.split('/').filter(Boolean)
    const last = pathBits[pathBits.length - 1]
    return decodeURIComponent(last || parsed.hostname || fallback)
  } catch {
    return fallback
  }
}

export function createLinkAsset(url: string, fallbackName: string): StoredDocumentAsset {
  return {
    id: 'ASSET-' + crypto.randomUUID(),
    kind: 'link',
    url: url.trim(),
    name: inferNameFromUrl(url, fallbackName),
    createdAt: nowIso(),
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        const comma = result.indexOf(',')
        resolve(comma >= 0 ? result.slice(comma + 1) : result)
      } else {
        reject(new Error('Unsupported file reader result'))
      }
    }
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
  const mime = file.type || 'application/octet-stream'
  return `data:${mime};base64,${base64}`
}

export async function createFileAsset(file: File, fallbackName: string): Promise<StoredDocumentAsset> {
  const dataUrl = await fileToDataUrl(file)
  return {
    id: 'ASSET-' + crypto.randomUUID(),
    kind: 'file',
    url: dataUrl,
    name: file.name || fallbackName,
    mimeType: file.type || 'application/octet-stream',
    createdAt: nowIso(),
  }
}

export function filenameForDownload(asset: StoredDocumentAsset, fallbackPrefix: string) {
  const trimmed = (asset.name || '').trim()
  if (trimmed) return trimmed
  const ext = asset.mimeType === 'application/pdf' ? '.pdf' : asset.mimeType === 'text/plain' ? '.txt' : ''
  return fallbackPrefix + ext
}
