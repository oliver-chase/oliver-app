'use client'
import { useState, useRef, useEffect } from 'react'
import { upsertNote, deleteRecord, newId, today } from '@/lib/db'
import type { Note, Background, AppState } from '@/types'

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

interface Props {
  accountId: string
  data: AppState
  setData: React.Dispatch<React.SetStateAction<AppState>>
}

export default function NotesSection({ accountId, data, setData }: Props) {
  const bg = data.background.find(b => b.account_id === accountId && !b.engagement_id)
  const teamNames = getTeamNames(bg)

  const notes = data.notes
    .filter(n => n.account_id === accountId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_date.localeCompare(a.created_date))

  const save = async (n: Note) => {
    setData(prev => ({ ...prev, notes: prev.notes.map(x => x.note_id === n.note_id ? n : x) }))
    await upsertNote(n)
  }

  const remove = async (n: Note) => {
    if (!window.confirm('Delete this note?')) return
    setData(prev => ({ ...prev, notes: prev.notes.filter(x => x.note_id !== n.note_id) }))
    await deleteRecord('notes', 'note_id', n.note_id)
  }

  const createNote = async () => {
    const cadenceTitle = bg?.meeting_title?.trim() || ''
    let title = cadenceTitle
    if (!title) {
      const t = window.prompt('Meeting title')?.trim()
      if (!t) return
      title = t
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
    await upsertNote(rec)
  }

  return (
    <div>
      <div className="section-header-row2" style={{ marginBottom: 10 }}>
        <div />
        <button className="btn-acct-action" onClick={createNote}>+ New Note</button>
      </div>

      {notes.length === 0 && <div className="empty-state">No results</div>}

      {notes.map(n => (
        <NoteCard
          key={n.note_id}
          note={n}
          teamNames={teamNames}
          onSave={save}
          onDelete={remove}
        />
      ))}
    </div>
  )
}

function NoteCard({ note, teamNames, onSave, onDelete }: {
  note: Note
  teamNames: string[]
  onSave: (n: Note) => Promise<void>
  onDelete: (n: Note) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const titleRef = useRef<HTMLDivElement>(null)
  const dateRef = useRef<HTMLSpanElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [attendees, setAttendeesState] = useState<string[]>(() => getAttendees(note.template_data))
  const [addingAttendee, setAddingAttendee] = useState(false)
  const [newAttendee, setNewAttendee] = useState('')
  const attInputRef = useRef<HTMLInputElement>(null)

  const copyToClipboard = async () => {
    const md = (note.title ? note.title + '\n\n' : '') + (note.body || '')
    try { await navigator.clipboard.writeText(md) } catch { /* no clipboard access */ }
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
    setNewAttendee('')
    setAddingAttendee(false)
  }

  return (
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
          if (v !== note.title) onSave({ ...note, title: v, last_updated: today() })
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
              {addingAttendee ? (
                <input
                  ref={attInputRef}
                  className="form-input"
                  style={{ width: 140, margin: 0, padding: '2px 6px', fontSize: 'var(--font-size-xs)' }}
                  placeholder="Name"
                  value={newAttendee}
                  onChange={e => setNewAttendee(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); addAttendee(newAttendee) }
                    if (e.key === 'Escape') { setAddingAttendee(false); setNewAttendee('') }
                  }}
                  onBlur={() => { if (newAttendee.trim()) addAttendee(newAttendee); else { setAddingAttendee(false); setNewAttendee('') } }}
                />
              ) : (
                <AttendeeAddBtn
                  teamNames={teamNames.filter(n => !attendees.includes(n))}
                  onSelect={name => addAttendee(name)}
                  onAddNew={() => { setAddingAttendee(true); setTimeout(() => attInputRef.current?.focus(), 50) }}
                />
              )}
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
  )
}

function AttendeeAddBtn({ teamNames, onSelect, onAddNew }: {
  teamNames: string[]
  onSelect: (name: string) => void
  onAddNew: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn-link"
        aria-haspopup="listbox"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
      >
        + Add attendee
      </button>
      {open && (
        <div className="app-popover" style={{ minWidth: 180 }}>
          <div className="app-popover-list">
            {teamNames.map(n => (
              <div
                key={n}
                className="app-popover-item"
                onMouseDown={e => { e.preventDefault(); onSelect(n); setOpen(false) }}
              >
                {n}
              </div>
            ))}
            <div
              className="app-popover-item"
              onMouseDown={e => { e.preventDefault(); setOpen(false); onAddNew() }}
            >
              + Add new…
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
