'use client'
import { useState, useMemo } from 'react'

interface PickItem { id: string; name: string; sub?: string }

interface PickStepProps {
  items: PickItem[]
  selectedId: string
  onSelect: (id: string) => void
  emptyMessage?: string
}

export function PickStep({ items, selectedId, onSelect, emptyMessage = 'No items' }: PickStepProps) {
  const [q, setQ] = useState('')
  const lq = q.toLowerCase()
  const filtered = useMemo(() => items.filter(i => !lq || i.name.toLowerCase().includes(lq) || (i.sub || '').toLowerCase().includes(lq)), [items, lq])
  return (
    <div className="step-flow-pick-list">
      <input
        autoFocus
        type="text"
        className="step-flow-pick-search"
        placeholder={'Search\u2026'}
        value={q}
        onChange={e => setQ(e.currentTarget.value)}
        aria-label="Filter list"
      />
      {filtered.length === 0 ? (
        <div style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>{emptyMessage}</div>
      ) : filtered.map(i => (
        <div
          key={i.id}
          role="button"
          tabIndex={0}
          className={'step-flow-pick-item' + (i.id === selectedId ? ' step-flow-pick-item--selected' : '')}
          onClick={() => onSelect(i.id)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i.id) } }}
        >
          <div className="step-flow-pick-name">{i.name}</div>
          {i.sub && <div className="step-flow-pick-sub">{i.sub}</div>}
        </div>
      ))}
    </div>
  )
}
