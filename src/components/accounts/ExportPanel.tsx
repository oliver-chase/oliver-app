'use client'
import { useState, useRef, useEffect } from 'react'
import { today } from '@/lib/db'
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
    const acct = data.accounts.find(a => a.account_id === accountId)
    if (!acct) return
    const bg = data.background.find(b => b.account_id === accountId && !b.engagement_id)
    const curYr = new Date().getFullYear()
    const esc = (s: string | null | undefined) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const style = [
      '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap");',
      'body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:12px;color:#1a1a1a;max-width:720px;margin:0 auto;padding:40px}',
      'h1{font-size:22px;margin-bottom:4px}',
      'h2{font-size:15px;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:28px}',
      'h3{font-size:13px;margin-bottom:4px;margin-top:16px}',
      '.owner-group{margin-bottom:14px}',
      '.owner-name{font-weight:bold;font-size:13px;margin-bottom:4px}',
      'ul{margin:0;padding-left:18px}',
      'li{margin-bottom:3px}',
      '.meta{color:#777;font-size:11px;margin-bottom:24px}',
      '@media print{body{padding:0}}',
    ].join('\n')

    const parts: string[] = []
    parts.push('<h1>' + esc(acct.account_name) + '</h1>')
    parts.push('<p class="meta">' + esc(fmtDate(today())) + '&nbsp;&nbsp;&bull;&nbsp;&nbsp;<span style="color:#aaa">Confidential</span></p>')

    if (inclActions) {
      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const cutoff = sevenDaysAgo.toISOString().slice(0, 10)
      const acts = data.actions.filter(a => a.account_id === accountId).filter(a => {
        if (a.status === 'Open' || a.status === 'In Progress') return true
        if (a.status === 'Done' && a.closed_date && a.closed_date >= cutoff) return true
        return false
      })
      if (acts.length) {
        parts.push('<h2>Actions</h2>')
        const groups: Record<string, typeof acts> = {}
        acts.forEach(a => {
          const owner = (a.owner || '').trim() || '__unassigned__'
          if (!groups[owner]) groups[owner] = []
          groups[owner].push(a)
        })
        const ownerKeys = Object.keys(groups).filter(k => k !== '__unassigned__').sort()
        if (groups['__unassigned__']) ownerKeys.push('__unassigned__')
        ownerKeys.forEach(owner => {
          parts.push('<div class="owner-group">')
          parts.push('<div class="owner-name">' + esc(owner === '__unassigned__' ? 'No owner' : owner) + '</div>')
          parts.push('<ul>')
          groups[owner].forEach(a => {
            const statusNote = a.status === 'Done' ? ' (Done)' : a.status === 'In Progress' ? ' (In Progress)' : ''
            parts.push('<li>' + esc(a.description || '') + esc(statusNote) + '</li>')
          })
          parts.push('</ul></div>')
        })
      }
    }

    if (inclNotes && selectedNotes.size) {
      const selNotes = data.notes.filter(n => n.account_id === accountId && selectedNotes.has(n.note_id)).sort((a, b) => b.date.localeCompare(a.date))
      if (selNotes.length) {
        parts.push('<h2>Notes</h2>')
        selNotes.forEach(note => {
          parts.push('<h3>' + esc(fmtDate(note.date)) + '</h3>')
          parts.push('<p><strong>' + esc(note.title || '') + '</strong></p>')
          let td: { sections?: Array<{ heading: string; bullets?: Array<{ text?: string; indent?: boolean }> }> } = { sections: [] }
          try { td = JSON.parse(note.template_data) } catch { /* use body fallback */ }
          if (td.sections?.length) {
            td.sections.forEach(sec => {
              if (!sec.bullets?.length) return
              const nonEmpty = sec.bullets.filter(b => b.text?.trim())
              if (!nonEmpty.length) return
              if (sec.heading === 'Attendees') {
                parts.push('<p><strong>Attendees:</strong> ' + nonEmpty.map(b => esc(b.text)).join(', ') + '</p>')
              } else {
                parts.push('<p><strong>' + esc(sec.heading) + '</strong></p><ul>')
                nonEmpty.forEach(b => { parts.push('<li' + (b.indent ? ' style="margin-left:16px"' : '') + '>' + esc(b.text) + '</li>') })
                parts.push('</ul>')
              }
            })
          } else if (note.body) {
            parts.push('<p>' + esc(note.body) + '</p>')
          }
        })
      }
    }

    if (inclOverview && bg) {
      parts.push('<h2>Overview</h2>')
      const rows: [string, string][] = []
      if (bg.account_tier) rows.push(['Account Tier', bg.account_tier])
      const lastNote = data.notes.filter(n => n.account_id === accountId && n.date).sort((a, b) => b.date.localeCompare(a.date))[0]
      if (lastNote) rows.push(['Last Activity', fmtDate(lastNote.date)])
      const projRev = bg.revenue?.[curYr]?.projected || ''
      const closedRev = bg.revenue?.[curYr - 1]?.closed || ''
      if (projRev) rows.push(['Projected Revenue ' + curYr, projRev])
      if (closedRev) rows.push(['Closed Revenue ' + (curYr - 1), closedRev])
      if (bg.strategic_context) rows.push(['Account Notes', bg.strategic_context])
      if (bg.account_team) rows.push(['Account Team', bg.account_team])
      if (bg.account_director) rows.push(['Account Director', bg.account_director])
      if (bg.account_manager) rows.push(['Account Manager', bg.account_manager])
      if (rows.length) {
        parts.push('<table style="width:100%;border-collapse:collapse;font-size:12px">')
        rows.forEach(([label, val]) => {
          parts.push('<tr><td style="padding:5px 10px 5px 0;color:#777;font-weight:bold;width:200px;vertical-align:top">' + esc(label) + '</td><td style="padding:5px 0;vertical-align:top">' + esc(val) + '</td></tr>')
        })
        parts.push('</table>')
      }
    }

    if (inclProjects) {
      const projs = data.projects.filter(p => p.account_id === accountId && p.status === 'Active')
      if (projs.length) {
        parts.push('<h2>Active Projects</h2>')
        projs.forEach(proj => {
          parts.push('<h3>' + esc(proj.project_name || '') + '</h3>')
          if (proj.year) parts.push('<p style="color:#777;font-size:11px">Year: ' + esc(proj.year) + '</p>')
          if (proj.notes) parts.push('<p>' + esc(proj.notes) + '</p>')
          const csIds = Array.isArray(proj.client_stakeholder_ids) ? proj.client_stakeholder_ids : []
          const csNames = csIds.map(id => data.stakeholders.find(s => s.stakeholder_id === id)?.name || '').filter(Boolean)
          if (csNames.length) parts.push('<p style="color:#777;font-size:11px">Client: ' + esc(csNames.join(', ')) + '</p>')
        })
      }
    }

    if (inclOpps) {
      const opps = data.opportunities.filter(o => o.account_id === accountId)
      if (opps.length) {
        parts.push('<h2>Opportunities</h2><ul>')
        opps.forEach(opp => {
          parts.push('<li><strong>' + esc(opp.description || '') + '</strong>')
          const oppParts: string[] = []
          if (opp.status) oppParts.push(opp.status)
          const owners = Array.isArray(opp.owners) ? opp.owners : []
          if (owners.length) oppParts.push('Owner(s): ' + owners.join(', '))
          if (oppParts.length) parts.push(' <span style="color:#777;font-size:11px">(' + esc(oppParts.join(' \u00b7 ')) + ')</span>')
          if (opp.notes) parts.push('<br><span style="color:#555;font-size:11px">' + esc(opp.notes) + '</span>')
          parts.push('</li>')
        })
        parts.push('</ul>')
      }
    }

    if (inclPeople) {
      const people = data.stakeholders.filter(s => s.account_id === accountId && (s.organization || '').toLowerCase() !== 'v.two')
      if (people.length) {
        const rank = (title: string) => {
          const t = (title || '').toLowerCase()
          if (/\b(ceo|cfo|cto|coo|ciso|cmo|cro|president|founder|owner|chief)\b/.test(t)) return 1
          if (/\b(evp|svp|executive vice president|senior vice president)\b/.test(t)) return 2
          if (/\bvp\b|vice president/.test(t)) return 3
          if (/\bdirector\b/.test(t)) return 4
          if (/\bmanager\b/.test(t)) return 5
          if (title) return 6
          return 7
        }
        people.sort((a, b) => { const ra = rank(a.title), rb = rank(b.title); return ra !== rb ? ra - rb : (a.name || '').localeCompare(b.name || '') })
        parts.push('<h2>People</h2>')
        parts.push('<table style="width:100%;border-collapse:collapse;font-size:11px">')
        people.forEach(s => {
          const titleDept = [s.title, s.department].filter(Boolean).join(' \u00b7 ')
          parts.push('<tr style="border-bottom:1px solid #f0f0f0"><td style="padding:7px 8px 7px 0;vertical-align:top;width:55%"><strong>' + esc(s.name || '') + '</strong>')
          if (titleDept) parts.push('<br><span style="color:#777;font-size:10px">' + esc(titleDept) + '</span>')
          parts.push('</td><td style="padding:7px 0;vertical-align:top;font-size:10px;color:#777">')
          if (s.primary_owner) parts.push('Primary: <strong style="color:#1a1a1a">' + esc(s.primary_owner) + '</strong><br>')
          if (s.secondary_owner) parts.push('Secondary: <strong style="color:#1a1a1a">' + esc(s.secondary_owner) + '</strong>')
          parts.push('</td></tr>')
        })
        parts.push('</table>')
      }
    }

    const bodyContent = parts.join('')
    const fullDoc = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + esc(acct.account_name) + ' Account Plan</title><style>' + style + '</style></head><body>' + bodyContent + '</body></html>'
    const blob = new Blob([fullDoc], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const w = window.open(url, '_blank')
    if (w) { w.addEventListener('load', () => { w.focus(); w.print(); URL.revokeObjectURL(url) }) }
    onClose()
  }

  return (
    <div className="export-panel-overlay" id="export-plan-panel-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={panelRef} className="export-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button className="export-panel-close" title="Close" aria-label="Close" onClick={onClose}>×</button>
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
