'use client'
import { useState, useRef, useEffect } from 'react'
import type { AppState } from '@/types'

interface Props {
  accountId: string
  data: AppState
  onClose: () => void
}

function fmtDate(d: string) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ExportPanel({ accountId, data, onClose }: Props) {
  const [inclActions, setInclActions] = useState(true)
  const [inclNotes, setInclNotes] = useState(true)
  const [inclOverview, setInclOverview] = useState(false)
  const [inclProjects, setInclProjects] = useState(false)
  const [inclOpps, setInclOpps] = useState(false)
  const [inclPeople, setInclPeople] = useState(false)
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(() => {
    const acctNotes = data.notes.filter(n => n.account_id === accountId).sort((a, b) => b.date.localeCompare(a.date))
    return acctNotes.length ? new Set([acctNotes[0].note_id]) : new Set()
  })

  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = 'export-panel-title'

  const acctNotes = data.notes
    .filter(n => n.account_id === accountId)
    .sort((a, b) => b.date.localeCompare(a.date))

  useEffect(() => {
    const first = panelRef.current?.querySelector<HTMLElement>('button,input,[tabindex]:not([tabindex="-1"])')
    first?.focus()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(el => !(el as HTMLButtonElement).disabled)
      if (!focusable.length) return
      const first = focusable[0]; const last = focusable[focusable.length - 1]
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus() } }
      else { if (document.activeElement === last) { e.preventDefault(); first.focus() } }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const toggleNote = (id: string) => {
    setSelectedNotes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const generate = () => {
    // TODO: implement PDF generation matching source buildAndPrintPDF()
    // Inputs: includeActions, includeNotes, selectedNoteIds, includeOverview, includeProjects, includeOpps, includePeople
    console.log('Export PDF — TODO', { inclActions, inclNotes, selectedNotes: [...selectedNotes], inclOverview, inclProjects, inclOpps, inclPeople })
    onClose()
  }

  return (
    <div className="export-panel-overlay" id="export-plan-panel-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={panelRef} className="export-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button className="export-panel-close" title="Close" aria-label="Close" onClick={onClose}>&times;</button>
        <div className="export-panel-title" id={titleId}>Export Account Plan</div>

        <div className="export-section">
          <div className="export-row">
            <input type="checkbox" id="exp-cb-actions" checked={inclActions} onChange={e => setInclActions(e.target.checked)} />
            <label htmlFor="exp-cb-actions">Open actions (grouped by person)</label>
          </div>
        </div>

        <div className="export-section">
          <div className="export-row">
            <input type="checkbox" id="exp-cb-notes" checked={inclNotes} onChange={e => setInclNotes(e.target.checked)} />
            <label htmlFor="exp-cb-notes">Most recent meeting notes</label>
          </div>
          {inclNotes && acctNotes.length > 0 && (
            <div className="export-notes-list">
              {acctNotes.map(note => (
                <div
                  key={note.note_id}
                  className="export-note-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleNote(note.note_id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleNote(note.note_id) } }}
                >
                  <input
                    type="checkbox"
                    checked={selectedNotes.has(note.note_id)}
                    onChange={() => toggleNote(note.note_id)}
                    onClick={e => e.stopPropagation()}
                  />
                  <span className="export-note-date">{fmtDate(note.date)}</span>
                  <span style={{ flex: 1 }}>{note.title || '(untitled)'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="export-section">
          <div className="export-row">
            <input type="checkbox" id="exp-cb-overview" checked={inclOverview} onChange={e => setInclOverview(e.target.checked)} />
            <label htmlFor="exp-cb-overview">Account overview &amp; revenue</label>
          </div>
        </div>

        <div className="export-section">
          <div className="export-row">
            <input type="checkbox" id="exp-cb-projects" checked={inclProjects} onChange={e => setInclProjects(e.target.checked)} />
            <label htmlFor="exp-cb-projects">Active projects</label>
          </div>
        </div>

        <div className="export-section">
          <div className="export-row">
            <input type="checkbox" id="exp-cb-opps" checked={inclOpps} onChange={e => setInclOpps(e.target.checked)} />
            <label htmlFor="exp-cb-opps">Opportunities</label>
          </div>
        </div>

        <div className="export-section">
          <div className="export-row">
            <input type="checkbox" id="exp-cb-people" checked={inclPeople} onChange={e => setInclPeople(e.target.checked)} />
            <label htmlFor="exp-cb-people">People &amp; org chart</label>
          </div>
        </div>

        <button className="export-generate-btn" onClick={generate}>Generate PDF</button>
      </div>
    </div>
  )
}
