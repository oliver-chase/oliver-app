import { expect, test } from '@playwright/test'
import {
  mergeDeviceReceiptsIntoNotes,
  parseDeviceReceiptsFromNotes,
  parseResumeAssets,
  serializeResumeAssets,
  sortAssetsNewestFirst,
  type StoredDocumentAsset,
} from '../../src/lib/hr-assets'

function makeAsset(overrides: Partial<StoredDocumentAsset>): StoredDocumentAsset {
  return {
    id: overrides.id ?? 'ASSET-default',
    name: overrides.name ?? 'Asset',
    kind: overrides.kind ?? 'link',
    url: overrides.url ?? 'https://example.com/default.pdf',
    createdAt: overrides.createdAt ?? '2026-04-24T00:00:00.000Z',
    mimeType: overrides.mimeType,
  }
}

test.describe('hr asset helpers', () => {
  test('parseResumeAssets supports legacy url values', () => {
    const assets = parseResumeAssets('https://cdn.example.com/candidate-v2.pdf')
    expect(assets).toHaveLength(1)
    expect(assets[0]?.kind).toBe('link')
    expect(assets[0]?.name).toBe('Resume')
    expect(assets[0]?.url).toBe('https://cdn.example.com/candidate-v2.pdf')
  })

  test('parseResumeAssets rejects malformed and non-url raw values', () => {
    expect(parseResumeAssets('{bad json')).toEqual([])
    expect(parseResumeAssets('candidate-v2.pdf')).toEqual([])
    expect(parseResumeAssets('')).toEqual([])
  })

  test('serializeResumeAssets round-trips and keeps newest-first ordering', () => {
    const older = makeAsset({
      id: 'ASSET-1',
      name: 'resume-2025.pdf',
      createdAt: '2025-06-01T00:00:00.000Z',
    })
    const newer = makeAsset({
      id: 'ASSET-2',
      name: 'resume-2026.pdf',
      createdAt: '2026-03-15T00:00:00.000Z',
    })

    const serialized = serializeResumeAssets([older, newer])
    const parsed = parseResumeAssets(serialized)
    expect(parsed.map(item => item.id)).toEqual(['ASSET-2', 'ASSET-1'])
    expect(parsed.map(item => item.name)).toEqual(['resume-2026.pdf', 'resume-2025.pdf'])
  })

  test('sortAssetsNewestFirst handles mixed dates deterministically', () => {
    const sorted = sortAssetsNewestFirst([
      makeAsset({ id: 'ASSET-old', createdAt: '2024-01-01T00:00:00.000Z' }),
      makeAsset({ id: 'ASSET-new', createdAt: '2026-01-01T00:00:00.000Z' }),
      makeAsset({ id: 'ASSET-mid', createdAt: '2025-01-01T00:00:00.000Z' }),
    ])
    expect(sorted.map(item => item.id)).toEqual(['ASSET-new', 'ASSET-mid', 'ASSET-old'])
  })

  test('receipt metadata merge and parse preserve plain notes and artifacts', () => {
    const receipts = [
      makeAsset({
        id: 'ASSET-r1',
        name: 'receipt-2026-03-10.pdf',
        kind: 'file',
        mimeType: 'application/pdf',
        url: 'data:application/pdf;base64,aGVsbG8=',
        createdAt: '2026-03-10T12:00:00.000Z',
      }),
      makeAsset({
        id: 'ASSET-r2',
        name: 'receipt-2026-04-10.pdf',
        kind: 'link',
        url: 'https://docs.example.com/receipt-2026-04-10.pdf',
        createdAt: '2026-04-10T12:00:00.000Z',
      }),
    ]

    const merged = mergeDeviceReceiptsIntoNotes('MacBook assigned to QA', receipts)
    const parsed = parseDeviceReceiptsFromNotes(merged)

    expect(parsed.plainNotes).toBe('MacBook assigned to QA')
    expect(parsed.receipts.map(item => item.id)).toEqual(['ASSET-r2', 'ASSET-r1'])
  })

  test('receipt parser fails safe when metadata is malformed', () => {
    const malformed = 'plain note\n\n<!--OLIVER_RECEIPTS:{"schema":"oliver-receipts-v1","items":[oops]}-->'
    const parsed = parseDeviceReceiptsFromNotes(malformed)
    expect(parsed.plainNotes).toBe('plain note')
    expect(parsed.receipts).toEqual([])
  })
})
