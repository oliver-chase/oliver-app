'use client'

import { useEffect, useState } from 'react'
import { listTokenOverrides, upsertToken, type DesignToken } from '@/lib/tokens'
import styles from './admin.module.css'

// Token categories surfaced from tokens.css
const BASE_TOKENS: { name: string; category: string }[] = [
  { name: '--color-brand-purple', category: 'brand' },
  { name: '--color-brand-purple-light', category: 'brand' },
  { name: '--color-brand-purple-dark', category: 'brand' },
  { name: '--color-brand-pink', category: 'brand' },
  { name: '--color-brand-pink-light', category: 'brand' },
  { name: '--color-text-primary', category: 'text' },
  { name: '--color-text-secondary', category: 'text' },
  { name: '--color-text-placeholder', category: 'text' },
  { name: '--color-bg-page', category: 'background' },
  { name: '--color-bg-card', category: 'background' },
  { name: '--color-bg-input', category: 'background' },
  { name: '--color-bg-hover', category: 'background' },
  { name: '--color-border', category: 'border' },
  { name: '--color-border-focus', category: 'border' },
  { name: '--color-nav-bg', category: 'nav' },
  { name: '--color-nav-bg-deep', category: 'nav' },
  { name: '--color-nav-text', category: 'nav' },
  { name: '--color-nav-text-muted', category: 'nav' },
  { name: '--color-nav-text-faint', category: 'nav' },
  { name: '--radius-sm', category: 'radius' },
  { name: '--radius-md', category: 'radius' },
  { name: '--radius-lg', category: 'radius' },
  { name: '--radius-xl', category: 'radius' },
  { name: '--radius-full', category: 'radius' },
]

function getCssVar(name: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function TokenEditor() {
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listTokenOverrides().then(tokens => {
      const map: Record<string, string> = {}
      for (const t of tokens) map[t.token_name] = t.token_value
      setOverrides(map)
    })
  }, [])

  async function save(tokenName: string) {
    if (!draft.trim()) return
    setSaving(true)
    const token = BASE_TOKENS.find(t => t.name === tokenName)
    await upsertToken(tokenName, draft.trim(), token?.category ?? 'other')
    document.documentElement.style.setProperty(tokenName, draft.trim())
    setOverrides(prev => ({ ...prev, [tokenName]: draft.trim() }))
    setEditing(null)
    setSaving(false)
  }

  const categories = [...new Set(BASE_TOKENS.map(t => t.category))]

  return (
    <div className={styles.tokenEditor}>
      {categories.map(cat => (
        <div key={cat} className={styles.tokenGroup}>
          <div className={styles.tokenGroupLabel}>{cat}</div>
          {BASE_TOKENS.filter(t => t.category === cat).map(token => {
            const currentValue = overrides[token.name] ?? getCssVar(token.name)
            const isColor = token.name.startsWith('--color')
            const isEditing = editing === token.name

            return (
              <div key={token.name} className={styles.tokenRow}>
                <span className={styles.tokenName}>{token.name}</span>
                <div className={styles.tokenValue}>
                  {isColor && (
                    <span
                      className={styles.colorSwatch}
                      style={{ background: currentValue }}
                    />
                  )}
                  {isEditing ? (
                    <input
                      className={styles.tokenInput}
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') save(token.name)
                        if (e.key === 'Escape') setEditing(null)
                      }}
                    />
                  ) : (
                    <span className={styles.tokenValueText}>{currentValue || '-'}</span>
                  )}
                </div>
                {isEditing ? (
                  <button
                    className={styles.tokenSaveBtn}
                    onClick={() => save(token.name)}
                    disabled={saving}
                  >
                    Save
                  </button>
                ) : (
                  <button
                    className={styles.tokenEditBtn}
                    onClick={() => { setDraft(currentValue); setEditing(token.name) }}
                  >
                    Edit
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
