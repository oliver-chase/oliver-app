'use client'
import { useState, useRef } from 'react'
import { upsertNote, deleteRecord, newId, today } from '@/lib/db'
import type { Note, AppState } from '@/types'

interface Props {
  accountId: string
  data: AppState
  setData: React.Dispatch<React.SetStateAction<AppState>>
}

export default function NotesSection({ accountId, data, setData }: Props) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState(today())
  const [newBody, setNewBody] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  const notes = data.notes
    .filter(n => n.account_id === accountId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_date.localeCompare(a.created_date))

  const save = async (n: Note) => {
    setData(prev => ({ ...prev, notes: prev.notes.map(x => x.note_id === n.note_id ? n : x) }))
    await upsertNote(n)
  }

  const add = async () => {
    const title = newTitle.trim()
    if (!title) { titleInputRef.current?.focus(); return }
    const n: Note = {
      note_id: newId('NOTE'), account_id: accountId, engagement_id: '',
      date: newDate, type: 'Meeting', title,
      template_data: '', body: newBody.trim(),
      transcript_link: '', created_date: today(), last_updated: today(),
    }
    setData(prev => ({ ...prev, notes: [n, ...prev.notes] }))
    await upsertNote(n)
    setNewTitle(''); setNewDate(today()); setNewBody(''); setAdding(false)
  }

  const remove = async (n: Note) => {
    if (!window.confirm('Delete this note?')) return
    setData(prev => ({ ...prev, notes: prev.notes.filter(x => x.note_id !== n.note_id) }))
    await deleteRecord('notes', 'note_id', n.note_id)
  }

  return (
    <div>
      <div className="section-header-row2" style={{ marginBottom: 10 }}>
        <div />
        <button className="btn-acct-action" onClick={() => { setAdding(true); setTimeout(() => titleInputRef.current?.focus(), 50) }}>
          + Add Note
        </button>
      </div>

      {adding && (
        <div className="inline-form" style={{ marginBottom: 12 }}>
          <div className="inline-form-title">New Note</div>
          <div className="inline-form-row">
            <div className="form-field">
              <label className="form-label">Title</label>
              <input
                ref={titleInputRef}
                className="form-input field-required-highlight"
                placeholder="Note title"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') setAdding(false) }}
              />
            </div>
            <div className="form-field" style={{ flex: '0 0 140px' }}>
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
              />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Body</label>
            <textarea
              className="form-textarea"
              placeholder="Notes…"
              value={newBody}
              onChange={e => setNewBody(e.target.value)}
            />
          </div>
          <div className="inline-form-actions">
            <button className="btn-acct-action" onClick={add}>Save</button>
            <button className="btn-acct-action" onClick={() => { setAdding(false); setNewTitle(''); setNewBody('') }}>Cancel</button>
          </div>
        </div>
      )}

      {notes.length === 0 && !adding && <div className="empty-state">No notes yet</div>}

      {notes.map(n => (
        <NoteCard key={n.note_id} note={n} onSave={save} onDelete={remove} />
      ))}
    </div>
  )
}

function NoteCard({ note, onSave, onDelete }: {
  note: Note
  onSave: (n: Note) => Promise<void>
  onDelete: (n: Note) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const titleRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const copyToClipboard = () => {
    const text = (note.title ? note.title + '\n\n' : '') + (note.body || '')
    navigator.clipboard?.writeText(text).catch(() => {})
  }

  return (
    <div className={'note-card' + (expanded ? ' expanded' : '')} onClick={() => setExpanded(e => !e)}>
      <div className="note-meta">
        <span className="note-date">{note.date}</span>
        {note.type && <span className="app-badge">{note.type}</span>}
      </div>
      <div
        ref={titleRef}
        className="note-title"
        contentEditable
        suppressContentEditableWarning
        onClick={e => e.stopPropagation()}
        onBlur={() => {
          const v = titleRef.current?.textContent?.trim() || ''
          if (v !== note.title) onSave({ ...note, title: v || note.title, last_updated: today() })
        }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); titleRef.current?.blur() } }}
      >
        {note.title}
      </div>
      {!expanded && note.body && <div className="note-preview">{note.body}</div>}
      {expanded && (
        <div className="note-body" onClick={e => e.stopPropagation()}>
          <div
            ref={bodyRef}
            contentEditable
            suppressContentEditableWarning
            style={{ outline: 'none', fontSize: 'var(--font-size-sm)', lineHeight: 1.6, whiteSpace: 'pre-wrap', minHeight: 60 }}
            onBlur={() => {
              const v = bodyRef.current?.textContent?.trim() || ''
              if (v !== note.body) onSave({ ...note, body: v, last_updated: today() })
            }}
          >
            {note.body}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn-acct-action" onClick={copyToClipboard}>Copy</button>
            <button className="btn-acct-action danger" onClick={() => onDelete(note)}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
