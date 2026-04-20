'use client'
import { useState, useRef, useEffect, useId } from 'react'
import { CP_ACTIONS, type CpAction, type CpContext } from './cp-actions'

interface Props {
  ctx: CpContext
  onClose: () => void
}

export default function CommandPalette({ ctx, onClose }: Props) {
  const [q, setQ] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()

  useEffect(() => { inputRef.current?.focus() }, [])

  const lq = q.toLowerCase()
  const filtered = lq ? CP_ACTIONS.filter(a => a.label.toLowerCase().includes(lq) || a.group.toLowerCase().includes(lq)) : CP_ACTIONS

  useEffect(() => { setActiveIdx(0) }, [q])

  function execute(a: CpAction) {
    a.run(ctx)
    onClose()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(filtered.length - 1, i + 1)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)); return }
    if (e.key === 'Enter') { e.preventDefault(); const a = filtered[activeIdx]; if (a) execute(a) }
  }

  const groups = (['Search', 'Create', 'Candidates', 'Employees', 'Devices', 'Navigate'] as const)
    .map(g => ({ group: g, items: filtered.filter(a => a.group === g) }))
    .filter(g => g.items.length > 0)

  return (
    <div id="cp-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div id="cp-content" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className="visually-hidden" style={{ position: 'absolute', clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', width: 1, height: 1, overflow: 'hidden' }}>Command Palette</h2>
        <div className="cp-search-wrap">
          <input
            ref={inputRef}
            className="cp-input"
            type="text"
            placeholder={'Type a command\u2026'}
            value={q}
            onChange={e => setQ(e.currentTarget.value)}
            onKeyDown={onKeyDown}
            aria-label="Command query"
          />
        </div>
        <div className="cp-body" role="listbox">
          {filtered.length === 0 ? (
            <div className="cp-no-results">No matching commands</div>
          ) : groups.map(g => (
            <div key={g.group} role="group" aria-label={g.group}>
              <div className="cp-group-label" aria-hidden="true">{g.group}</div>
              {g.items.map(a => {
                const flatIdx = filtered.indexOf(a)
                const active = flatIdx === activeIdx
                return (
                  <div
                    key={a.id}
                    role="option"
                    aria-selected={active}
                    className={'cp-item' + (active ? ' selected' : '')}
                    onMouseEnter={() => setActiveIdx(flatIdx)}
                    onMouseDown={e => { e.preventDefault(); execute(a) }}
                  >
                    <div className="cp-item-text">
                      <div className="cp-item-title">{a.label}</div>
                      {a.hint && <div className="cp-item-sub">{a.hint}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
