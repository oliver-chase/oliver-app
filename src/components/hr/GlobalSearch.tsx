'use client'
import { useState, useEffect, useRef, useId } from 'react'
import type { HrDB, HrPage } from './types'

interface Props {
  db: HrDB
  onClose: () => void
  onNavigate: (page: HrPage) => void
}

interface Result {
  group: 'Candidates' | 'Employees' | 'Devices'
  id: string
  name: string
  sub: string
  page: HrPage
}

function search(db: HrDB, q: string): Result[] {
  if (!q || q.length < 2) return []
  const lq = q.toLowerCase()
  const cand = db.candidates
    .filter(c => c.name.toLowerCase().includes(lq) || c.role.toLowerCase().includes(lq) || (c.city || '').toLowerCase().includes(lq) || (c.state || '').toLowerCase().includes(lq))
    .slice(0, 5)
    .map<Result>(c => ({ group: 'Candidates', id: c.id, name: c.name, sub: c.role + (c.stage ? ' \u00b7 ' + c.stage : ''), page: 'hiring' }))
  const emp = db.employees
    .filter(e => e.name.toLowerCase().includes(lq) || e.role.toLowerCase().includes(lq) || (e.city || '').toLowerCase().includes(lq) || (e.state || '').toLowerCase().includes(lq) || (e.email || '').toLowerCase().includes(lq))
    .slice(0, 5)
    .map<Result>(e => ({ group: 'Employees', id: e.id, name: e.name, sub: e.role + (e.dept ? ' \u00b7 ' + e.dept : ''), page: 'directory' }))
  const dev = db.devices
    .filter(d => d.name.toLowerCase().includes(lq) || (d.serial || '').toLowerCase().includes(lq) || (d.make || '').toLowerCase().includes(lq) || (d.model || '').toLowerCase().includes(lq))
    .slice(0, 5)
    .map<Result>(d => ({ group: 'Devices', id: d.id, name: d.name, sub: d.serial || '', page: 'inventory' }))
  return [...cand, ...emp, ...dev]
}

export default function GlobalSearch({ db, onClose, onNavigate }: Props) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const results = search(db, q)
  const groups = (['Candidates', 'Employees', 'Devices'] as const).map(g => ({
    group: g,
    items: results.filter(r => r.group === g),
  })).filter(g => g.items.length > 0)

  function handleSelect(r: Result) {
    onNavigate(r.page)
    onClose()
  }

  return (
    <div className="app-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="app-modal gs-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 className="app-modal-title" id={titleId}>Search</h2>
        <div className="gs-search-wrap">
          <input
            ref={inputRef}
            type="text"
            className="gs-search-input"
            placeholder={'Search candidates, employees, devices\u2026'}
            value={q}
            onChange={e => setQ(e.currentTarget.value)}
            aria-label="Search query"
          />
        </div>
        <div className="gs-results">
          {q.length < 2 ? (
            <div className="gs-no-results">{'Type at least 2 characters\u2026'}</div>
          ) : groups.length === 0 ? (
            <div className="gs-no-results">No results</div>
          ) : groups.map(g => (
            <div key={g.group} className="gs-group">
              <div className="gs-group-label">{g.group}</div>
              {g.items.map(r => (
                <div
                  key={r.group + r.id}
                  className="gs-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelect(r)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(r) } }}
                >
                  <div className="gs-item-name">{r.name}</div>
                  <div className="gs-item-sub">{r.sub}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
