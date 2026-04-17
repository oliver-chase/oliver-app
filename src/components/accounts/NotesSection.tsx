'use client'
import { useState, useRef, useEffect } from 'react'
import { upsertNote, upsertBackground, deleteRecord, newId, today } from '@/lib/db'
import { useAppModal } from '@/components/shared/AppModal'
import { useSoftDelete } from '@/hooks/useSoftDelete'
import { useSyncReport } from '@/lib/sync-context'
import type { Note, Background, AppState } from '@/types'
import { Picker } from './Picker'

interface NoteSection { heading: string; bullets: Array<{ text: string; indent: number }> }
interface NoteData { sections: NoteSection[] }

function parseNoteData(template_data: string): NoteData {
  try { return JSON.parse(template_data) } catch { return { sections: [] } }
}

function serializeNoteData(data: NoteData): string {
  return JSON.stringify(data)
}

function getAttendees(template_data: string): string[] {
  const d = parseNoteData(template_data)
  const sec = d.sections.find(s => s.heading === 'Attendees')
  return (sec?.bullets || []).map(b => b.text)
}

function setAttendees(template_data: string, attendees: string[]): string {
  const d = parseNoteData(template_data)
  const idx = d.sections.findIndex(s => s.heading === 'Attendees')
  const sec: NoteSection = { heading: 'Attendees', bullets: attendees.map(t => ({ text: t, indent: 0 })) }
  if (idx >= 0) d.sections[idx] = sec
  else d.sections = [sec, ...d.sections]
  return serializeNoteData(d)
}

// ISO → MM/DD/YYYY
function isoToDisplay(iso: string): string {
  const p = (iso || '').split('-')
  if (p.length === 3) return p[1] + '/' + p[2] + '/' + p[0]
  return ''
}

// MM/DD/YYYY → ISO
function displayToIso(display: string): string | null {
  const m = display.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  return m[3] + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0')
}

function notePreview(note: Note): string {
  if (note.body) {
    const l = note.body.split('\n').find(s => s.trim())
    if (l) return l.length > 120 ? l.slice(0, 120) + '…' : l
  }
  return ''
}

function getTeamNames(bg?: Background): string[] {
  if (!bg) return []
  const names: string[] = []
  if (bg.account_director) names.push(bg.account_director)
  if (bg.account_manager) names.push(bg.account_manager)
  if (bg.account_team) bg.account_team.split(';').forEach(n => { const t = n.trim(); if (t) names.push(t) })
  return [...new Set(names)]
}

const NOTES_SORT_OPTS: [string, string][] = [['desc', 'Newest first'], ['asc', 'Oldest first']]
const NOTES_PAGE_SIZE = 6

function fmtDateMd(iso: string): string {
  if (!iso) return ''
  const dt = new Date(iso + 'T00:00:00')
  if (isNaN(dt.getTime())) return iso
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function noteToMarkdown(note: Note): string {
  let md = '# ' + (note.title || 'Note') + '\n\n'
  md += '*Date: ' + fmtDateMd(note.date) + '*  \n'
  md += '\n'
  let nd: { sections?: Array<{ heading: string; bullets?: Array<{ text?: string; indent?: number }> }> }
  try { nd = JSON.parse(note.template_data) } catch { nd = { sections: [] } }
  ;(nd.sections || []).forEach(sec => {
    md += '## ' + sec.heading + '\n\n'
    ;(sec.bullets || []).forEach(b => { md += (b.indent ? '  ' : '') + '- ' + (b.text || '') + '\n' })
    md += '\n'
  })
  if (note.transcript_link) md += '[View Transcript](' + note.transcript_link + ')\n'
  return md
}

interface Props {
  accountId: string
  data: AppState
  setData: React.Dispatch<React.SetStateAction<AppState>>
  filterDateFrom: string
  onFilterDateFromChange: (v: string) => void
  filterDateTo: string
  onFilterDateToChange: (v: string) => void
}

export default function NotesSection({ accountId, data, setData, filterDateFrom, onFilterDateFromChange, filterDateTo, onFilterDateToChange }: Props) {
  const bg = data.background.find(b => b.account_id === accountId && !b.engagement_id)
  const teamNames = getTeamNames(bg)
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [page, setPage] = useState(0)
  const { modal, showModal } = useAppModal()
  const { softDelete, toastEl } = useSoftDelete<Note>()
  const reportSync = useSyncReport()

  const notes = data.notes
    .filter(n => n.account_id === accountId)
    .filter(n => {
      if (filterDateFrom && n.date < filterDateFrom) return false
      if (filterDateTo && n.date > filterDateTo) return false
      if (!search) return true
      const q = search.toLowerCase()
      if ((n.title || '').toLowerCase().includes(q)) return true
      if ((n.body || '').toLowerCase().includes(q)) return true
      try {
        const nd = parseNoteData(n.template_data)
        const attn = nd.sections.find(s => s.heading === 'Attendees')
        if ((attn?.bullets || []).some(b => b.text.toLowerCase().includes(q))) return true
      } catch {}
      return false
    })
    .sort((a, b) => {
      const cmp = b.date.localeCompare(a.date) || b.created_date.localeCompare(a.created_date)
      return sortDir === 'desc' ? cmp : -cmp
    })

  const totalPages = Math.ceil(notes.length / NOTES_PAGE_SIZE)
  const safePage = Math.min(page, Math.max(0, totalPages - 1))
  const pagedNotes = notes.slice(safePage * NOTES_PAGE_SIZE, (safePage + 1) * NOTES_PAGE_SIZE)

  const save = async (n: Note) => {
    setData(prev => ({ ...prev, notes: prev.notes.map(x => x.note_id === n.note_id ? n : x) }))
    reportSync('syncing')
    try { await upsertNote(n); reportSync('ok') } catch { reportSync('error') }
  }

  const remove = (n: Note) => {
    softDelete(n, {
      displayName: n.title || 'Note',
      onLocalRemove: () => { setData(prev => ({ ...prev, notes: prev.notes.filter(x => x.note_id !== n.note_id) })); setPage(0) },
      onLocalRestore: () => setData(prev => ({ ...prev, notes: [...prev.notes, n] })),
      onDeleteRecord: async () => { reportSync('syncing'); try { await deleteRecord('notes', 'note_id', n.note_id); reportSync('ok') } catch { reportSync('error') } },
    })
  }

  const addPersonToTeam = async (name: string) => {
    if (!bg) return
    const cur = (bg.account_team || '').split(/[;\n,]/).map(s => s.trim()).filter(Boolean)
    if (cur.includes(name)) return
    cur.push(name)
    const updated = { ...bg, account_team: cur.join('; ') }
    setData(prev => ({ ...prev, background: prev.background.map(b => b.account_id === accountId && !b.engagement_id ? updated : b) }))
    reportSync('syncing')
    try { await upsertBackground(updated); reportSync('ok') } catch { reportSync('error') }
  }

  const createNote = async () => {
    const cadenceTitle = bg?.meeting_title?.trim() || ''
    let title = cadenceTitle
    if (!title) {
      const { buttonValue, inputValue } = await showModal({ title: 'Meeting title', inputPlaceholder: 'Title', confirmLabel: 'Create' })
      if (buttonValue !== 'confirm' || !inputValue.trim()) return
      title = inputValue.trim()
    }
    const cadenceNames = (bg?.meeting_attendees || '').split(';').map(s => s.trim()).filter(Boolean)
    const teamRaw = (bg?.account_team || '').split(/[;\n,]/).map(s => s.trim()).filter(Boolean)
    const seen = new Set<string>()
    const allAttendees: string[] = []
    ;[...cadenceNames, ...teamRaw].forEach(n => { if (n && !seen.has(n.toLowerCase())) { seen.add(n.toLowerCase()); allAttendees.push(n) } })
    const dateStr = today()
    const rec: Note = {
      note_id: newId('NOTE'), account_id: accountId, engagement_id: '',
      date: dateStr, type: 'Meeting', title,
      template_data: serializeNoteData({ sections: [{ heading: 'Attendees', bullets: allAttendees.map(t => ({ text: t, indent: 0 })) }] }),
      body: '', transcript_link: '', created_date: dateStr, last_updated: dateStr,
    }
    setData(prev => ({ ...prev, notes: [rec, ...prev.notes] }))
    reportSync('syncing')
    try { await upsertNote(rec); reportSync('ok') } catch { reportSync('error') }
  }

  return (
    <div>
      {modal}
      {toastEl}
      <div className="app-section-header">
        <div className="app-section-title">Notes</div>
        <div className="section-header-row2">
          <div className="section-header-left">
            <button className="btn-link" id="btn-add-note" onClick={createNote}>+ Add note</button>
          </div>
          <div className="section-actions">
            <input
              type="text"
              id="notes-search"
              className="notes-search"
              placeholder="Search notes..."
              aria-label="Search notes"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <input type="date" className="filter-date" id="filter-date-from" aria-label="Notes from date" value={filterDateFrom} onChange={e => onFilterDateFromChange(e.target.value)} />
            <input type="date" className="filter-date" id="filter-date-to" aria-label="Notes to date" value={filterDateTo} onChange={e => onFilterDateToChange(e.target.value)} />
            <Picker
              value={NOTES_SORT_OPTS.find(([v]) => v === sortDir)?.[1] ?? NOTES_SORT_OPTS[0][1]}
              options={NOTES_SORT_OPTS.map(([, l]) => l)}
              triggerClass="sort-select"
              showUnassigned={false}
              onChange={val => setSortDir((NOTES_SORT_OPTS.find(([, l]) => l === val)?.[0] ?? 'desc') as 'desc' | 'asc')}
            />
          </div>
        </div>
      </div>

      <div id="notes-body">
        {notes.length === 0 && <div className="empty-state">No results</div>}
        {pagedNotes.map(n => (
          <NoteCard
            key={n.note_id}
            note={n}
            teamNames={teamNames}
            onSave={save}
            onDelete={remove}
            onAddPersonToTeam={addPersonToTeam}
          />
        ))}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '16px' }}>
            <button className="btn btn--compact" disabled={safePage === 0} onClick={() => setPage(0)}>{'\u27e8'}</button>
            <button className="btn btn--compact" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>{'\u2190'}</button>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray)', margin: '0 8px' }}>Page {safePage + 1} of {totalPages}</span>
            <button className="btn btn--compact" disabled={safePage === totalPages - 1} onClick={() => setPage(safePage + 1)}>{'\u2192'}</button>
            <button className="btn btn--compact" disabled={safePage === totalPages - 1} onClick={() => setPage(totalPages - 1)}>{'\u27e9'}</button>
          </div>
        )}
      </div>
    </div>
  )
}

function NoteCard({ note, teamNames, onSave, onDelete, onAddPersonToTeam }: {
  note: Note
  teamNames: string[]
  onSave: (n: Note) => Promise<void>
  onDelete: (n: Note) => void
  onAddPersonToTeam?: (name: string) => Promise<void>
}) {
  const { modal: noteModal, showModal: noteShowModal } = useAppModal()
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dateRef = useRef<HTMLSpanElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [attendees, setAttendeesState] = useState<string[]>(() => getAttendees(note.template_data))

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(noteToMarkdown(note))
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
      setCopied(true)
      copiedTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch { /* no clipboard access */ }
  }

  const saveAttendees = async (newList: string[]) => {
    setAttendeesState(newList)
    const updated = { ...note, template_data: setAttendees(note.template_data, newList), last_updated: today() }
    await onSave(updated)
  }

  const removeAttendee = (idx: number) => {
    const next = attendees.filter((_, i) => i !== idx)
    saveAttendees(next)
  }

  const addAttendee = async (name: string) => {
    const n = name.trim()
    if (!n) return
    await saveAttendees([...attendees, n])
  }

  return (
    <>
    {noteModal}
    <div
      className={'note-card' + (expanded ? ' expanded' : '')}
      style={{ position: 'relative' }}
      role="button"
      tabIndex={0}
      title={'Last updated: ' + (note.last_updated || '')}
      onClick={e => {
        if ((e.target as Element).closest('[contenteditable],[role="textbox"],button,input,a,.app-chip')) return
        setExpanded(x => !x)
      }}
      onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ' ') && !(e.target as Element).closest('[contenteditable],.app-chip')) {
          e.preventDefault(); setExpanded(x => !x)
        }
      }}
    >
      {/* Top-right button row */}
      <div className="note-card-btns">
        {copied && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--gray)', alignSelf: 'center' }}>Copied to clipboard</span>}
        <button
          className="note-copy-btn"
          title="Copy to clipboard"
          aria-label="Copy to clipboard"
          onClick={e => { e.stopPropagation(); copyToClipboard() }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
        <button
          className="project-delete note-delete-btn"
          title="Delete note"
          aria-label="Delete note"
          onClick={e => { e.stopPropagation(); onDelete(note) }}
        >×</button>
      </div>

      {/* Meta row: date */}
      <div className="note-meta">
        <span
          ref={dateRef}
          className="note-date"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Date (MM/DD/YYYY)"
          title="Click to edit date"
          style={{ outline: 'none', borderRadius: 3, cursor: 'text', padding: '1px 3px' }}
          onClick={e => e.stopPropagation()}
          onBlur={() => {
            const v = dateRef.current?.textContent?.trim() || ''
            const iso = displayToIso(v)
            if (iso && iso !== note.date) {
              onSave({ ...note, date: iso, last_updated: today() })
              if (dateRef.current) dateRef.current.textContent = isoToDisplay(iso)
            } else {
              if (dateRef.current) dateRef.current.textContent = isoToDisplay(note.date)
            }
          }}
        >
          {isoToDisplay(note.date)}
        </span>
      </div>

      {/* Title */}
      <div
        ref={titleRef}
        className="note-title note-title-el"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Note title"
        onClick={e => e.stopPropagation()}
        onBlur={() => {
          const v = titleRef.current?.textContent?.trim() || ''
          if (titleTimer.current) clearTimeout(titleTimer.current)
          titleTimer.current = setTimeout(() => {
            if (v !== note.title) onSave({ ...note, title: v, last_updated: today() })
          }, 500)
        }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); titleRef.current?.blur() } }}
      >
        {note.title}
      </div>

      {/* Preview (collapsed) */}
      {!expanded && <div className="note-preview">{notePreview(note)}</div>}

      {/* Expanded body */}
      {expanded && (
        <div className="note-body" onClick={e => e.stopPropagation()}>
          {/* Attendees */}
          <div className="bullet-section">
            <div className="bullet-heading">Attendees</div>
            <div className="note-attendees-row">
              {attendees.map((a, i) => (
                <span key={i} className="app-chip">
                  {a}
                  <button
                    className="app-chip-remove"
                    title="Remove"
                    aria-label="Remove attendee"
                    onClick={e => { e.stopPropagation(); removeAttendee(i) }}
                  >×</button>
                </span>
              ))}
              <AttendeeAddBtn
                teamNames={teamNames.filter(n => !attendees.includes(n))}
                onSelect={name => addAttendee(name)}
                onAddNew={async () => {
                  const r1 = await noteShowModal({ title: 'Add attendee', inputPlaceholder: 'Name', confirmLabel: 'Next \u2192' })
                  if (r1.buttonValue !== 'confirm' || !r1.inputValue.trim()) return
                  const nm = r1.inputValue.trim()
                  if (!teamNames.includes(nm) && onAddPersonToTeam) {
                    const r2 = await noteShowModal({ title: 'Also add to team?', message: 'Add ' + nm + ' to the account team as well?', confirmLabel: 'Add to team too', cancelLabel: 'Attendee only' })
                    if (r2.buttonValue === 'confirm') await onAddPersonToTeam(nm)
                  }
                  await addAttendee(nm)
                }}
              />
            </div>
          </div>

          {/* Notes body */}
          <div className="bullet-heading">NOTES</div>
          <div
            ref={bodyRef}
            className="note-body-text"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="Note body"
            onClick={e => e.stopPropagation()}
            onBlur={() => {
              const v = bodyRef.current?.innerText || ''
              if (v !== note.body) onSave({ ...note, body: v, last_updated: today() })
            }}
          >
            {note.body}
          </div>
        </div>
      )}
    </div>
    </>
  )
}

function AttendeeAddBtn({ teamNames, onSelect, onAddNew }: {
  teamNames: string[]
  onSelect: (name: string) => void
  onAddNew: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery('') } }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = query ? teamNames.filter(n => n.toLowerCase().includes(query.toLowerCase())) : teamNames

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation(); setOpen(o => !o); setQuery('')
    setTimeout(() => searchRef.current?.focus(), 0)
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button className="btn-link" aria-haspopup="listbox" onClick={handleOpen}>
        + Add attendee
      </button>
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
              <div
                key={n}
                className="app-popover-item"
                onMouseDown={e => { e.preventDefault(); onSelect(n); setOpen(false); setQuery('') }}
              >
                {n}
              </div>
            ))}
            {filtered.length === 0 && <div className="app-popover-empty">No matches</div>}
            <div
              className="app-popover-item"
              onMouseDown={e => { e.preventDefault(); setOpen(false); setQuery(''); void onAddNew() }}
            >
              + Add new…
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
