'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { today, upsertBackground } from '@/lib/db'
import { useAppModal } from '@/components/shared/AppModal'
import { useSyncReport } from '@/lib/sync-context'
import type { AppState, Background, Note } from '@/types'
import { Picker } from './Picker'

interface Props {
  accountId: string
  data: AppState
  setData: React.Dispatch<React.SetStateAction<AppState>>
}

const FREQ_OPTS: [string, string][] = [
  ['', 'Does not repeat'],
  ['weekly', 'Weekly'],
  ['biweekly', 'Every 2 weeks'],
  ['monthly', 'Monthly'],
  ['quarterly', 'Quarterly'],
]
const DAY_LABELS: [string, string][] = [
  ['Sun', 'Su'], ['Mon', 'Mo'], ['Tue', 'Tu'], ['Wed', 'We'],
  ['Thu', 'Th'], ['Fri', 'Fr'], ['Sat', 'Sa'],
]
const DAY_FULL: Record<string, string> = {
  Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday',
}
const PH_SELECT = 'Select person\u2026'
const MTL_PH = 'e.g. NCL Account Planning | Internal V.Two'

function fmtDate(d: string) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtRevValue(v: string) { return v }
function isEmptyRevValue(v: string) { return !v || v.trim() === '' }

function getFreqLabel(v: string) {
  return FREQ_OPTS.find(o => o[0] === v)?.[1] ?? 'Does not repeat'
}

function getSummaryText(bg: Background) {
  const freq = bg.meeting_frequency || ''
  const n = parseInt(bg.meeting_interval || '1') || 1
  const day = bg.meeting_day || ''
  if (!freq) return ''
  const fullDay = day ? (DAY_FULL[day] ?? day) : ''
  if (freq === 'weekly') return n === 1 ? (fullDay ? 'Every ' + fullDay : 'Weekly') : 'Every ' + n + ' weeks' + (fullDay ? ' on ' + fullDay : '')
  if (freq === 'biweekly') return 'Every 2 weeks' + (fullDay ? ' on ' + fullDay : '')
  if (freq === 'monthly') return n === 1 ? 'Monthly' : 'Every ' + n + ' months'
  if (freq === 'quarterly') return n === 1 ? 'Quarterly' : 'Every ' + n + ' quarters'
  return ''
}

function computeNextMeeting(bg: Background, notes: Note[], accountId: string): string | null {
  const freq = bg.meeting_frequency || ''
  if (!freq) return null
  const sorted = notes.filter(n => n.account_id === accountId && n.date).sort((a, b) => b.date.localeCompare(a.date))
  const lastNoteDate = sorted.length ? sorted[0].date : null
  if (!lastNoteDate) return null
  const DAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const base = new Date(lastNoteDate + 'T00:00:00')
  if (freq === 'weekly' || freq === 'biweekly') {
    const offsetDays = freq === 'weekly' ? 7 : 14
    const targetDay = DAY_ORDER.indexOf(bg.meeting_day || '')
    const from = new Date(base.getTime() + offsetDays * 86400000)
    if (targetDay >= 0) { const fromDay = from.getDay(); const diff = (targetDay - fromDay + 7) % 7; from.setDate(from.getDate() + diff) }
    return from.getFullYear() + '-' + String(from.getMonth() + 1).padStart(2, '0') + '-' + String(from.getDate()).padStart(2, '0')
  }
  if (freq === 'monthly') {
    const d = new Date(base); d.setMonth(d.getMonth() + 1)
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  }
  if (freq === 'quarterly') {
    const d = new Date(base); d.setMonth(d.getMonth() + 3)
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  }
  return null
}

function getTeamNames(bg: Background | undefined): string[] {
  const set = new Set<string>()
  if (!bg) return []
  for (const k of ['account_director', 'account_manager', 'account_team'] as const) {
    if (bg[k]) bg[k].split(/[;\n]/).map(s => s.trim()).filter(Boolean).forEach(n => set.add(n))
  }
  return Array.from(set)
}

export default function OverviewSection({ accountId, data, setData }: Props) {
  const bg = data.background.find(b => b.account_id === accountId && !b.engagement_id)
  const { modal, showModal } = useAppModal()
  const reportSync = useSyncReport()

  const ensureBg = useCallback((): Background => {
    if (bg) return bg
    return {
      background_id: 'BG-' + Date.now(),
      account_id: accountId, engagement_id: '',
      overview: '', strategic_context: '', delivery_model: '', key_dates: '',
      account_director: '', account_manager: '', account_team: '',
      next_meeting: '', account_tier: '',
      meeting_title: '', meeting_frequency: '', meeting_day: '',
      meeting_attendees: '', meeting_interval: '', next_meeting_override: '',
      created_date: today(), last_updated: today(), revenue: {},
    }
  }, [bg, accountId])

  const saveBg = useCallback(async (updated: Background) => {
    const b = { ...updated, last_updated: today() }
    setData(prev => {
      const exists = prev.background.some(x => x.background_id === b.background_id)
      return {
        ...prev,
        background: exists
          ? prev.background.map(x => x.background_id === b.background_id ? b : x)
          : [...prev.background, b],
      }
    })
    reportSync('syncing')
    try { await upsertBackground(b); reportSync('ok') } catch { reportSync('error') }
  }, [setData, reportSync])

  const b = ensureBg()
  const [cadenceOpen, setCadenceOpen] = useState(!b.meeting_frequency)
  const [showDateInput, setShowDateInput] = useState(false)
  const [showHistForm, setShowHistForm] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  const teamNames = getTeamNames(b)
  const curYear = new Date().getFullYear()
  const prevYear = curYear - 1

  const attendees = (b.meeting_attendees || '').split(';').map(s => s.trim()).filter(Boolean)
  const teamMembers = (b.account_team || '').split(/[;\n]/).map(s => s.trim()).filter(Boolean)

  const todayStr = today()
  const override = b.next_meeting_override && b.next_meeting_override >= todayStr ? b.next_meeting_override : null
  const computed = !override ? computeNextMeeting(b, data.notes, accountId) : null

  const lastNote = data.notes
    .filter(n => n.account_id === accountId && n.date)
    .sort((a, b2) => b2.date.localeCompare(a.date))[0]

  useEffect(() => {
    if (!chartRef.current) return
    renderChart(b, chartRef.current, updated => saveBg(updated))
  })

  return (
    <div>
      {modal}
      <div className="overview-row" style={{ marginBottom: '12px' }}>
        <div className="app-card overview-card-col">
          <div className="app-card-label">Account Director</div>
          <PersonPill
            value={b.account_director || ''}
            teamNames={teamNames}
            addLabel="+ Add director"
            onChange={async nm => await saveBg({ ...b, account_director: nm })}
          />
          <div className="app-card-label" style={{ marginTop: '10px' }}>Account Manager</div>
          <PersonPill
            value={b.account_manager || ''}
            teamNames={teamNames}
            addLabel="+ Add manager"
            onChange={async nm => await saveBg({ ...b, account_manager: nm })}
          />
          <div className="app-card-label" style={{ marginTop: '10px' }}>Account Team (V.Two)</div>
          <TeamPills
            members={teamMembers}
            teamNames={teamNames}
            onRemove={async idx => {
              const cur = [...teamMembers]; cur.splice(idx, 1)
              await saveBg({ ...b, account_team: cur.join('; ') })
            }}
            onAdd={async nm => {
              const cur = [...teamMembers]
              if (!cur.includes(nm)) cur.push(nm)
              await saveBg({ ...b, account_team: cur.join('; ') })
            }}
          />
        </div>

        <div className="app-card overview-card-col overview-meeting-card">
          <div className="overview-stat-label">MEETING CADENCE</div>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '28px', cursor: 'pointer' }}
            onClick={() => setCadenceOpen(o => !o)}
          >
            <span style={{
              fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font)', flex: 1, minWidth: 0,
              color: b.meeting_frequency ? 'var(--text)' : 'var(--gray)',
              fontStyle: b.meeting_frequency ? 'normal' : 'italic',
            }}>
              {b.meeting_frequency ? getSummaryText(b) : 'Not set'}
            </span>
          </div>
          {cadenceOpen && (
            <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border)', marginTop: '6px' }}>
              <Picker
                value={getFreqLabel(b.meeting_frequency || '')}
                options={FREQ_OPTS.map(([, label]) => label)}
                placeholder="Does not repeat"
                triggerClass={'card-owner-btn' + (!b.meeting_frequency ? ' picker-placeholder' : '')}
                showUnassigned={false}
                onChange={val => {
                  const v = FREQ_OPTS.find(([, l]) => l === val)?.[0] ?? ''
                  saveBg({ ...b, meeting_frequency: v, meeting_day: (v === 'weekly' || v === 'biweekly') ? b.meeting_day : '' })
                }}
              />
              {b.meeting_frequency && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text)', fontFamily: 'var(--font)' }}>Every</span>
                  <IntervalInput value={b.meeting_interval || '1'} onChange={v => saveBg({ ...b, meeting_interval: v })} />
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text)', fontFamily: 'var(--font)' }}>
                    {b.meeting_frequency === 'weekly' || b.meeting_frequency === 'biweekly' ? 'week(s)' : b.meeting_frequency === 'monthly' ? 'month(s)' : 'quarter(s)'}
                  </span>
                </div>
              )}
              {(b.meeting_frequency === 'weekly' || b.meeting_frequency === 'biweekly') && (
                <div className="overview-chip-row" style={{ marginTop: '6px' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray)', fontFamily: 'var(--font)', marginRight: '2px' }}>On</span>
                  {DAY_LABELS.map(([val, label]) => (
                    <button key={val} type="button" title={val}
                      style={{
                        fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font)', fontWeight: 600,
                        width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', border: 'none',
                        background: b.meeting_day === val ? 'var(--purple)' : 'var(--surface2)',
                        color: b.meeting_day === val ? 'var(--white)' : 'var(--gray)',
                      }}
                      onClick={() => saveBg({ ...b, meeting_day: val })}
                    >{label}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div>
            <div className="overview-field-label">Meeting title</div>
            <FadedEditable value={b.meeting_title || ''} placeholder={MTL_PH} ariaLabel="Meeting title" className="overview-stat-val" onSave={v => saveBg({ ...b, meeting_title: v })} />
          </div>
          <div>
            <div className="overview-field-label">Recurring Attendees</div>
            <TeamPills
              members={attendees}
              teamNames={teamNames}
              addLabel="+ Add attendee"
              onRemove={async idx => { const cur = [...attendees]; cur.splice(idx, 1); await saveBg({ ...b, meeting_attendees: cur.join('; ') }) }}
              onAdd={async nm => { const cur = [...attendees]; if (!cur.includes(nm)) cur.push(nm); await saveBg({ ...b, meeting_attendees: cur.join('; ') }) }}
            />
          </div>
        </div>
      </div>

      <div className="overview-stats">
        <div className="overview-stat" title="Next scheduled or projected meeting date based on cadence.">
          <div className="overview-stat-label">Next Meeting</div>
          {override ? (
            <div>
              <div className="overview-stat-date">{fmtDate(override)}</div>
              <div className="overview-stat-sublabel">
                Override
                <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--gray)', padding: 0, lineHeight: 1, fontFamily: 'var(--font)' }} title="Clear override" onClick={() => saveBg({ ...b, next_meeting_override: '' })}>
                  ×
                </button>
              </div>
            </div>
          ) : computed ? (
            <div>
              <div className="overview-stat-date">{fmtDate(computed)}</div>
              <div className="overview-stat-sublabel">Projected</div>
            </div>
          ) : (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray)', fontStyle: 'italic' }}>Not scheduled</div>
          )}
          <div style={{ marginTop: '4px' }}>
            {!showDateInput ? (
              <button type="button" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--pink)', cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontFamily: 'var(--font)' }} onClick={() => setShowDateInput(true)}>
                Set date →
              </button>
            ) : (
              <input type="date"
                style={{ fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '3px 6px', marginTop: '4px', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                autoFocus
                onChange={e => { if (e.currentTarget.value) { saveBg({ ...b, next_meeting_override: e.currentTarget.value }); setShowDateInput(false) } }}
                onBlur={() => setShowDateInput(false)}
              />
            )}
          </div>
        </div>

        <div className="overview-stat" title="Date of the most recent note added for this account.">
          <div className="overview-stat-label">Last Activity</div>
          {lastNote ? (
            <div className="overview-stat-val">{fmtDate(lastNote.date)}</div>
          ) : (
            <div className="overview-stat-val faded">No activity</div>
          )}
        </div>

        <div className="overview-stat" title="Expected revenue from this account in the current year.">
          <div className="overview-stat-label">CURRENT YEAR PROJECTED REVENUE</div>
          <FadedEditable value={(b.revenue[curYear] || {}).projected || ''} placeholder="e.g. $450K" ariaLabel="Current year projected revenue" className="overview-stat-val" onSave={v => saveBg({ ...b, revenue: { ...b.revenue, [curYear]: { ...(b.revenue[curYear] || {}), projected: v } } })} />
        </div>

        <div className="overview-stat" title="Total revenue closed with this account in the prior year.">
          <div className="overview-stat-label">PRIOR YEAR CLOSED REVENUE</div>
          <FadedEditable value={(b.revenue[prevYear] || {}).closed || ''} placeholder="e.g. $380K" ariaLabel="Prior year closed revenue" className="overview-stat-val" onSave={v => saveBg({ ...b, revenue: { ...b.revenue, [prevYear]: { ...(b.revenue[prevYear] || {}), closed: v } } })} />
        </div>
      </div>

      <div className="overview-row" style={{ marginTop: '12px' }}>
        <div className="overview-chart-card">
          <div className="app-card-label" style={{ marginBottom: '4px' }}>Revenue History</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <RevLegend color="var(--color-chart-bar)" label="Projected" />
            <RevLegend color="var(--purple)" label="Closed" />
          </div>
          <div ref={chartRef} style={{ position: 'relative', width: '100%', flex: 1, minHeight: 0 }} />
          <button type="button" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--pink)', cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontFamily: 'var(--font)', marginTop: '8px', textAlign: 'left' }} onClick={() => setShowHistForm(v => !v)}>
            + Add historical year
          </button>
          {showHistForm && (
            <HistoricalYearForm bg={b}
              onSave={async (year, proj, closed) => {
                await saveBg({ ...b, revenue: { ...b.revenue, [year]: { ...(b.revenue[year] || {}), projected: proj, closed } } })
                setShowHistForm(false)
              }}
              onCancel={() => setShowHistForm(false)}
            />
          )}
        </div>

        <div className="app-card overview-card-col">
          <div className="app-card-label">Account Notes</div>
          <NotesText value={b.strategic_context || ''} onSave={v => saveBg({ ...b, strategic_context: v })} />
        </div>
      </div>
    </div>
  )
}

function PersonPill({ value, teamNames, addLabel = '+ Add', onChange }: {
  value: string
  teamNames: string[]
  addLabel?: string
  onChange: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const newInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(''); setAddingNew(false); setNewName('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = query ? teamNames.filter(n => n.toLowerCase().includes(query.toLowerCase())) : teamNames

  const handleOpen = () => {
    setOpen(o => !o); setQuery(''); setAddingNew(false); setNewName('')
    setTimeout(() => searchRef.current?.focus(), 0)
  }

  const commitNew = () => {
    const n = newName.trim()
    if (n) { onChange(n); setOpen(false); setQuery(''); setAddingNew(false); setNewName('') }
  }

  return (
    <div className="overview-chip-row">
      {value && (
        <span className="app-chip">
          {value}
          <button type="button" className="app-chip-remove" title="Remove" onClick={() => onChange('')}>×</button>
        </span>
      )}
      {!value && (
        <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
          <button type="button" className="btn-link" onClick={handleOpen}>{addLabel}</button>
          {open && (
            <div className="app-popover" style={{ minWidth: 180 }}>
              <input ref={searchRef} className="app-popover-search" placeholder="Search…" value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery('') } }}
              />
              <div className="app-popover-list">
                {filtered.map(n => (
                  <div key={n} className="app-popover-item" onMouseDown={e => { e.preventDefault(); onChange(n); setOpen(false); setQuery('') }}>{n}</div>
                ))}
                {filtered.length === 0 && !addingNew && <div className="app-popover-empty">No matches</div>}
              </div>
              {addingNew ? (
                <input ref={newInputRef} className="app-popover-search" placeholder="Enter name…" value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitNew(); if (e.key === 'Escape') { setAddingNew(false); setNewName(''); setTimeout(() => searchRef.current?.focus(), 0) } }}
                  onBlur={() => { if (newName.trim()) commitNew() }}
                />
              ) : (
                <div className="app-popover-add-new" onMouseDown={e => { e.preventDefault(); setAddingNew(true); setTimeout(() => newInputRef.current?.focus(), 0) }}>
                  + Add new person
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {value && (
        <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
          <button type="button" className="btn-link" onClick={handleOpen}>Change</button>
          {open && (
            <div className="app-popover" style={{ minWidth: 180 }}>
              <input ref={searchRef} className="app-popover-search" placeholder="Search…" value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery('') } }}
              />
              <div className="app-popover-list">
                {filtered.map(n => (
                  <div key={n} className="app-popover-item" onMouseDown={e => { e.preventDefault(); onChange(n); setOpen(false); setQuery('') }}>{n}</div>
                ))}
                {filtered.length === 0 && !addingNew && <div className="app-popover-empty">No matches</div>}
              </div>
              {addingNew ? (
                <input ref={newInputRef} className="app-popover-search" placeholder="Enter name…" value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitNew(); if (e.key === 'Escape') { setAddingNew(false); setNewName(''); setTimeout(() => searchRef.current?.focus(), 0) } }}
                  onBlur={() => { if (newName.trim()) commitNew() }}
                />
              ) : (
                <div className="app-popover-add-new" onMouseDown={e => { e.preventDefault(); setAddingNew(true); setTimeout(() => newInputRef.current?.focus(), 0) }}>
                  + Add new person
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TeamPills({ members, teamNames, addLabel = '+ Add', onRemove, onAdd }: {
  members: string[]
  teamNames: string[]
  addLabel?: string
  onRemove: (idx: number) => void
  onAdd: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const newInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(''); setAddingNew(false); setNewName('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const existing = members.map(n => n.toLowerCase())
  const available = teamNames.filter(n => !existing.includes(n.toLowerCase()))
  const filtered = query ? available.filter(n => n.toLowerCase().includes(query.toLowerCase())) : available

  const handleOpen = () => {
    setOpen(o => !o); setQuery(''); setAddingNew(false); setNewName('')
    setTimeout(() => searchRef.current?.focus(), 0)
  }

  const select = (name: string) => { onAdd(name); setOpen(false); setQuery('') }

  const commitNew = () => {
    const n = newName.trim()
    if (n) { onAdd(n); setOpen(false); setQuery(''); setAddingNew(false); setNewName('') }
  }

  return (
    <div className="overview-chip-row">
      {members.map((name, i) => (
        <span key={i} className="app-chip">
          {name}
          <button type="button" className="app-chip-remove" title="Remove" onClick={() => onRemove(i)}>×</button>
        </span>
      ))}
      <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
        <button type="button" className="btn-link" onClick={handleOpen}>{addLabel}</button>
        {open && (
          <div className="app-popover" style={{ minWidth: 180 }}>
            <input
              ref={searchRef}
              className="app-popover-search"
              placeholder="Search…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery('') } }}
            />
            <div className="app-popover-list">
              {filtered.map(n => (
                <div key={n} className="app-popover-item" onMouseDown={e => { e.preventDefault(); select(n) }}>{n}</div>
              ))}
              {filtered.length === 0 && !addingNew && <div className="app-popover-empty">No matches</div>}
            </div>
            {addingNew ? (
              <input
                ref={newInputRef}
                className="app-popover-search"
                placeholder="Enter name…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitNew()
                  if (e.key === 'Escape') { setAddingNew(false); setNewName(''); setTimeout(() => searchRef.current?.focus(), 0) }
                }}
                onBlur={() => { if (newName.trim()) commitNew() }}
              />
            ) : (
              <div
                className="app-popover-add-new"
                onMouseDown={e => { e.preventDefault(); setAddingNew(true); setTimeout(() => newInputRef.current?.focus(), 0) }}
              >
                + Add new person
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function FadedEditable({ value, placeholder, ariaLabel, className, onSave }: {
  value: string; placeholder: string; ariaLabel: string; className: string; onSave: (v: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const empty = isEmptyRevValue(value)
  return (
    <div ref={ref} className={className + (empty ? ' faded' : '')} contentEditable suppressContentEditableWarning aria-label={ariaLabel} role="textbox"
      onFocus={() => { if (!ref.current) return; if (empty || ref.current.textContent === placeholder) { ref.current.textContent = ''; ref.current.classList.remove('faded') } }}
      onBlur={() => {
        if (!ref.current) return
        const v = ref.current.textContent?.trim() || ''
        if (!v || v === placeholder) { ref.current.textContent = placeholder; ref.current.classList.add('faded') }
        else { ref.current.classList.remove('faded') }
        const toSave = (!v || v === placeholder) ? '' : v
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => onSave(toSave), 500)
      }}
    >{empty ? placeholder : value}</div>
  )
}

function IntervalInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <input ref={ref} type="number" min={1} defaultValue={value || '1'}
      style={{ width: '50px', fontFamily: 'var(--font)', fontSize: 'var(--font-size-sm)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 6px', color: 'var(--text)', background: 'var(--surface)', outline: 'none' }}
      onBlur={() => { const v = String(parseInt(ref.current?.value || '1') || 1); if (ref.current) ref.current.value = v; onChange(v) }}
    />
  )
}

function RevLegend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-xs)', color: 'var(--gray)' }}>
      <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: color }} />
      {label}
    </span>
  )
}

function NotesText({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  return (
    <div ref={ref} className="overview-notes-text" contentEditable suppressContentEditableWarning aria-label="Account notes" role="textbox"
      onBlur={() => {
        const v = ref.current?.textContent?.trim() || ''
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => onSave(v), 500)
      }}
    >{value}</div>
  )
}

function HistoricalYearForm({ bg, onSave, onCancel }: {
  bg: Background
  onSave: (year: number, proj: string, closed: string) => void
  onCancel: () => void
}) {
  const curYear = new Date().getFullYear()
  const [year, setYear] = useState(curYear - 1)
  const projRef = useRef<HTMLInputElement>(null)
  const closedRef = useRef<HTMLInputElement>(null)
  const existing = bg.revenue[year] || {}
  const yearOptions = Array.from({ length: curYear - 2017 }, (_, i) => String(curYear - 1 - i))
  return (
    <div style={{ marginTop: '6px', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface2)' }}>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Picker
          value={String(year)}
          options={yearOptions}
          showUnassigned={false}
          onChange={v => setYear(Number(v))}
        />
        <input ref={projRef} type="text" defaultValue={existing.projected || ''} placeholder="Projected (e.g. $450K)" style={{ width: '110px', fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 6px', background: 'var(--surface)' }} />
        <input ref={closedRef} type="text" defaultValue={existing.closed || ''} placeholder="Closed (e.g. $380K)" style={{ width: '110px', fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 6px', background: 'var(--surface)' }} />
        <button type="button" className="btn-primary btn--compact" style={{ fontSize: 'var(--font-size-xs)', padding: '4px 8px' }} onClick={() => onSave(year, projRef.current?.value.trim() || '', closedRef.current?.value.trim() || '')}>Save</button>
        <button type="button" className="btn-ghost btn--compact" style={{ fontSize: 'var(--font-size-xs)', padding: '4px 8px' }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function renderChart(bg: Background, container: HTMLDivElement, onSave: (bg: Background) => void) {
  while (container.firstChild) container.removeChild(container.firstChild)
  container.style.maxWidth = '640px'
  const curYear = new Date().getFullYear()
  const dataYears = new Set<number>()
  Object.entries(bg.revenue || {}).forEach(([y, d]) => { if (d && (d.projected || d.closed)) dataYears.add(Number(y)) })
  dataYears.add(curYear)
  const minYear = Math.min(...dataYears)
  const years: number[] = []
  for (let y = minYear; y <= curYear; y++) years.push(y)
  let hasData = false
  years.forEach(y => {
    const r = bg.revenue[y] || {}
    const p = parseFloat((r.projected || '').replace(/[^0-9.]/g, '')) || 0
    const c = parseFloat((r.closed || '').replace(/[^0-9.]/g, '')) || 0
    if (p || c) hasData = true
  })
  const W = container.clientWidth || 600
  const NS = 'http://www.w3.org/2000/svg'
  if (!hasData) {
    const H = 90; const ML = 8; const colW = Math.floor((W - ML) / Math.max(years.length, 1))
    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('width', String(W)); svg.setAttribute('height', String(H))
    svg.style.cssText = 'display:block;width:100%;height:' + H + 'px;'
    years.forEach((y, i) => {
      const xMid = ML + i * colW + colW / 2
      const xt = document.createElementNS(NS, 'text')
      xt.setAttribute('x', String(xMid)); xt.setAttribute('y', String(H - 8)); xt.setAttribute('text-anchor', 'middle'); xt.setAttribute('font-size', '10'); xt.setAttribute('fill', '#6c6c6f'); xt.textContent = String(y); svg.appendChild(xt)
    })
    const msg = document.createElementNS(NS, 'text')
    msg.setAttribute('x', String(W / 2)); msg.setAttribute('y', String((H - 28) / 2 + 10)); msg.setAttribute('text-anchor', 'middle'); msg.setAttribute('font-size', '11'); msg.setAttribute('fill', '#767679'); msg.setAttribute('font-style', 'italic'); msg.textContent = 'No revenue data \u2014 click bars to add'; svg.appendChild(msg)
    container.appendChild(svg); return
  }
  const H = 110; const BP = 22; const ML = 44
  const barW = Math.min(32, Math.floor((W - ML - years.length * 8) / (years.length * 2 + 1)))
  const gap = 4; const colW = barW * 2 + gap + 12
  const chartW = Math.max(W, ML + years.length * colW)
  let maxVal = 0
  years.forEach(y => {
    const r = bg.revenue[y] || {}
    const p = parseFloat((r.projected || '').replace(/[^0-9.]/g, '')) || 0
    const c = parseFloat((r.closed || '').replace(/[^0-9.]/g, '')) || 0
    if (p > maxVal) maxVal = p; if (c > maxVal) maxVal = c
  })
  if (maxVal === 0) maxVal = 100000
  const chartH = H - BP
  const yScale = (v: number) => chartH - Math.round((v / maxVal) * chartH)
  const axisLabel = (v: number) => v >= 1000000 ? '$' + (v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1) + 'M' : v >= 1000 ? '$' + (v / 1000).toFixed(0) + 'k' : '$' + Math.round(v)
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('width', String(chartW)); svg.setAttribute('height', String(H)); svg.style.cssText = 'display:block;width:100%;height:' + H + 'px;overflow:visible'
  const ticks = 4
  for (let i = 0; i <= ticks; i++) {
    const v = (maxVal / ticks) * i; const y = yScale(v) + 10
    const line = document.createElementNS(NS, 'line')
    line.setAttribute('x1', String(ML - 4)); line.setAttribute('y1', String(y)); line.setAttribute('x2', String(chartW)); line.setAttribute('y2', String(y)); line.setAttribute('stroke', '#e0e0e2'); line.setAttribute('stroke-width', '1'); svg.appendChild(line)
    const txt = document.createElementNS(NS, 'text')
    txt.setAttribute('x', String(ML - 6)); txt.setAttribute('y', String(y + 4)); txt.setAttribute('text-anchor', 'end'); txt.setAttribute('font-size', '9'); txt.setAttribute('fill', '#767679'); txt.textContent = axisLabel(v); svg.appendChild(txt)
  }
  const tooltip = document.createElement('div')
  tooltip.style.cssText = 'position:fixed;background:var(--text);color:var(--white);font-size:var(--font-size-xs);padding:5px 9px;border-radius:4px;pointer-events:none;z-index:100;display:none;white-space:nowrap'
  container.appendChild(tooltip)
  years.forEach((y, i) => {
    const xBase = ML + i * colW
    const rev = bg.revenue[y] || {}
    const proj = parseFloat((rev.projected || '').replace(/[^0-9.]/g, '')) || 0
    const closed = parseFloat((rev.closed || '').replace(/[^0-9.]/g, '')) || 0
    if (proj > 0) {
      const bh = chartH - yScale(proj); const by = yScale(proj) + 10
      const rect = document.createElementNS(NS, 'rect')
      rect.setAttribute('x', String(xBase)); rect.setAttribute('y', String(by)); rect.setAttribute('width', String(barW)); rect.setAttribute('height', String(bh)); rect.setAttribute('fill', 'var(--color-chart-bar)'); rect.setAttribute('rx', '3'); (rect as SVGRectElement).style.cursor = 'pointer'
      rect.addEventListener('mouseenter', () => { tooltip.style.display = 'block'; tooltip.textContent = y + ' Projected: ' + fmtRevValue(rev.projected || String(proj)) })
      rect.addEventListener('mousemove', (e: Event) => { const me = e as MouseEvent; tooltip.style.left = (me.clientX + 10) + 'px'; tooltip.style.top = (me.clientY - 28) + 'px' })
      rect.addEventListener('mouseleave', () => { tooltip.style.display = 'none' })
      rect.addEventListener('click', () => openBarEdit(y, 'projected', bg, container, xBase, by, onSave))
      svg.appendChild(rect)
    }
    if (closed > 0) {
      const bh = chartH - yScale(closed); const by = yScale(closed) + 10
      const rect = document.createElementNS(NS, 'rect')
      rect.setAttribute('x', String(xBase + barW + gap)); rect.setAttribute('y', String(by)); rect.setAttribute('width', String(barW)); rect.setAttribute('height', String(bh)); rect.setAttribute('fill', 'var(--purple)'); rect.setAttribute('rx', '3'); (rect as SVGRectElement).style.cursor = 'pointer'
      rect.addEventListener('mouseenter', () => { tooltip.style.display = 'block'; tooltip.textContent = y + ' Closed: ' + fmtRevValue(rev.closed || String(closed)) })
      rect.addEventListener('mousemove', (e: Event) => { const me = e as MouseEvent; tooltip.style.left = (me.clientX + 10) + 'px'; tooltip.style.top = (me.clientY - 28) + 'px' })
      rect.addEventListener('mouseleave', () => { tooltip.style.display = 'none' })
      rect.addEventListener('click', () => openBarEdit(y, 'closed', bg, container, xBase + barW + gap, by, onSave))
      svg.appendChild(rect)
    }
    const xt = document.createElementNS(NS, 'text')
    xt.setAttribute('x', String(xBase + barW + gap / 2)); xt.setAttribute('y', String(H - 8)); xt.setAttribute('text-anchor', 'middle'); xt.setAttribute('font-size', '10'); xt.setAttribute('fill', '#6c6c6f'); xt.textContent = String(y); svg.appendChild(xt)
  })
  container.appendChild(svg)
}

function openBarEdit(year: number, type: 'projected' | 'closed', bg: Background, container: HTMLDivElement, svgX: number, svgY: number, onSave: (bg: Background) => void) {
  const existing = container.querySelector('.bar-edit-input')
  if (existing) existing.remove()
  const inp = document.createElement('input')
  inp.type = 'text'; inp.className = 'bar-edit-input'
  inp.value = (bg.revenue[year] || {})[type] || ''; inp.placeholder = 'e.g. $450K'
  inp.style.cssText = 'position:absolute;font-size:var(--font-size-xs);font-family:var(--font);border:1px solid var(--pink);border-radius:4px;padding:3px 6px;width:90px;z-index:50;background:var(--surface);color:var(--text)'
  container.style.position = 'relative'
  const cRect = container.getBoundingClientRect()
  inp.style.left = Math.max(0, svgX - cRect.left) + 'px'
  inp.style.top = Math.max(0, svgY - cRect.top - 30) + 'px'
  const commit = () => {
    const v = inp.value.trim()
    const updated = { ...bg, revenue: { ...bg.revenue, [year]: { ...(bg.revenue[year] || {}), [type]: v } } }
    inp.remove(); onSave(updated)
  }
  inp.addEventListener('blur', commit)
  inp.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); commit() } if (e.key === 'Escape') inp.remove() })
  container.appendChild(inp); inp.focus(); inp.select()
}
