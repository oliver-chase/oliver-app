import { today } from '@/lib/db'
import type { AppState, Note } from '@/types'

type AccountExportData = Pick<AppState, 'accounts' | 'background' | 'actions' | 'notes' | 'projects' | 'opportunities' | 'stakeholders'>

export type AccountExportNoteMode = 'latest' | 'all' | 'selected'

export interface AccountExportOptions {
  includeActions: boolean
  includeNotes: boolean
  noteMode: AccountExportNoteMode
  selectedNoteIds?: string[]
  includeOverview: boolean
  includeProjects: boolean
  includeOpportunities: boolean
  includePeople: boolean
  useCaseLabel?: string
}

function fmtDate(d: string) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function esc(s: string | null | undefined) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function slugify(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function selectedNotesForMode(notes: Note[], options: AccountExportOptions) {
  if (!options.includeNotes) return []
  if (options.noteMode === 'selected') {
    const selected = new Set(options.selectedNoteIds ?? [])
    return notes.filter(note => selected.has(note.note_id))
  }
  if (options.noteMode === 'all') return notes
  return notes.length > 0 ? [notes[0]] : []
}

function noteModeLabel(mode: AccountExportNoteMode) {
  if (mode === 'all') return 'all meeting notes'
  if (mode === 'selected') return 'selected notes'
  return 'latest meeting note'
}

export function describeAccountExportUseCase(options: AccountExportOptions) {
  const sections: string[] = []
  if (options.includeActions) sections.push('actions')
  if (options.includeNotes) sections.push(noteModeLabel(options.noteMode))
  if (options.includeOverview) sections.push('overview')
  if (options.includeProjects) sections.push('projects')
  if (options.includeOpportunities) sections.push('opportunities')
  if (options.includePeople) sections.push('people')
  const sectionText = sections.length > 0 ? sections.join(', ') : 'no account sections'
  const prefix = options.useCaseLabel ? options.useCaseLabel + ': ' : ''
  return prefix + 'print-ready account export with ' + sectionText
}

export function buildAccountExportDocument(
  data: AccountExportData,
  accountId: string,
  options: AccountExportOptions,
) {
  const acct = data.accounts.find(a => a.account_id === accountId)
  if (!acct) throw new Error('Account not found for export.')

  const bg = data.background.find(b => b.account_id === accountId && !b.engagement_id)
  const curYr = new Date().getFullYear()
  const fileDate = today()
  const fileName = `${slugify(acct.account_name || 'account-plan') || 'account-plan'}-${fileDate}.html`

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
    '.meta{color:#4a4a4e;font-size:11px;margin-bottom:24px}',
    '.export-note{border:1px solid #ddd;border-radius:10px;padding:12px 14px;margin-bottom:12px}',
    '.export-helper{background:#f7f4ff;border:1px solid #ddd;border-radius:10px;padding:12px 14px;margin:18px 0 24px 0;color:#4a4a4e;font-size:11px}',
    '@media print{body{padding:0}.export-helper{break-inside:avoid}}',
  ].join('\n')

  const parts: string[] = []
  parts.push('<h1>' + esc(acct.account_name) + '</h1>')
  parts.push('<p class="meta">' + esc(fmtDate(fileDate)) + '&nbsp;&nbsp;&bull;&nbsp;&nbsp;<span style="color:#4a4a4e">Confidential</span></p>')
  parts.push('<div class="export-helper"><strong>Use case:</strong> ' + esc(describeAccountExportUseCase(options)) + '<br><strong>Output:</strong> Downloadable print-ready HTML. Open in a browser and use Print &rarr; Save as PDF if you need a PDF file.</div>')

  if (options.includeActions) {
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
      if (groups.__unassigned__) ownerKeys.push('__unassigned__')
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

  const acctNotes = data.notes
    .filter(n => n.account_id === accountId)
    .sort((a, b) => b.date.localeCompare(a.date))
  const selectedNotes = selectedNotesForMode(acctNotes, options)
  if (options.includeNotes && selectedNotes.length) {
    parts.push('<h2>Notes</h2>')
    selectedNotes.forEach(note => {
      parts.push('<div class="export-note">')
      parts.push('<h3>' + esc(fmtDate(note.date)) + '</h3>')
      parts.push('<p><strong>' + esc(note.title || '') + '</strong></p>')
      let td: { sections?: Array<{ heading: string; bullets?: Array<{ text?: string; indent?: boolean | number }> }> } = { sections: [] }
      try { td = JSON.parse(note.template_data) } catch {}
      if (td.sections?.length) {
        td.sections.forEach(sec => {
          const nonEmpty = (sec.bullets || []).filter(b => (b.text || '').trim())
          if (!nonEmpty.length) return
          if (sec.heading === 'Attendees') {
            parts.push('<p><strong>Attendees:</strong> ' + nonEmpty.map(b => esc(b.text)).join(', ') + '</p>')
            return
          }
          parts.push('<p><strong>' + esc(sec.heading) + '</strong></p><ul>')
          nonEmpty.forEach(b => parts.push('<li' + (b.indent ? ' style="margin-left:16px"' : '') + '>' + esc(b.text) + '</li>'))
          parts.push('</ul>')
        })
      } else if (note.body) {
        parts.push('<p>' + esc(note.body) + '</p>')
      }
      parts.push('</div>')
    })
  }

  if (options.includeOverview && bg) {
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
        parts.push('<tr><td style="padding:5px 10px 5px 0;color:#4a4a4e;font-weight:bold;width:200px;vertical-align:top">' + esc(label) + '</td><td style="padding:5px 0;vertical-align:top">' + esc(val) + '</td></tr>')
      })
      parts.push('</table>')
    }
  }

  if (options.includeProjects) {
    const projs = data.projects.filter(p => p.account_id === accountId && p.status === 'Active')
    if (projs.length) {
      parts.push('<h2>Active Projects</h2>')
      projs.forEach(proj => {
        parts.push('<h3>' + esc(proj.project_name || '') + '</h3>')
        if (proj.year) parts.push('<p style="color:#4a4a4e;font-size:11px">Year: ' + esc(proj.year) + '</p>')
        if (proj.notes) parts.push('<p>' + esc(proj.notes) + '</p>')
        const csIds = Array.isArray(proj.client_stakeholder_ids) ? proj.client_stakeholder_ids : []
        const csNames = csIds.map(id => data.stakeholders.find(s => s.stakeholder_id === id)?.name || '').filter(Boolean)
        if (csNames.length) parts.push('<p style="color:#4a4a4e;font-size:11px">Client: ' + esc(csNames.join(', ')) + '</p>')
      })
    }
  }

  if (options.includeOpportunities) {
    const opps = data.opportunities.filter(o => o.account_id === accountId)
    if (opps.length) {
      parts.push('<h2>Opportunities</h2><ul>')
      opps.forEach(opp => {
        parts.push('<li><strong>' + esc(opp.description || '') + '</strong>')
        const oppParts: string[] = []
        if (opp.status) oppParts.push(opp.status)
        const owners = Array.isArray(opp.owners) ? opp.owners : []
        if (owners.length) oppParts.push('Owner(s): ' + owners.join(', '))
        if (oppParts.length) parts.push(' <span style="color:#4a4a4e;font-size:11px">(' + esc(oppParts.join(' · ')) + ')</span>')
        if (opp.notes) parts.push('<br><span style="color:#4a4a4e;font-size:11px">' + esc(opp.notes) + '</span>')
        parts.push('</li>')
      })
      parts.push('</ul>')
    }
  }

  if (options.includePeople) {
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
      people.sort((a, b) => {
        const ra = rank(a.title)
        const rb = rank(b.title)
        return ra !== rb ? ra - rb : (a.name || '').localeCompare(b.name || '')
      })
      parts.push('<h2>People</h2><table style="width:100%;border-collapse:collapse;font-size:11px">')
      people.forEach(s => {
        const titleDept = [s.title, s.department].filter(Boolean).join(' · ')
        parts.push('<tr style="border-bottom:1px solid #f0f0f1"><td style="padding:7px 8px 7px 0;vertical-align:top;width:55%"><strong>' + esc(s.name || '') + '</strong>')
        if (titleDept) parts.push('<br><span style="color:#4a4a4e;font-size:10px">' + esc(titleDept) + '</span>')
        parts.push('</td><td style="padding:7px 0;vertical-align:top;font-size:10px;color:#4a4a4e">')
        if (s.primary_owner) parts.push('Primary: <strong style="color:#1a1a1a">' + esc(s.primary_owner) + '</strong><br>')
        if (s.secondary_owner) parts.push('Secondary: <strong style="color:#1a1a1a">' + esc(s.secondary_owner) + '</strong>')
        parts.push('</td></tr>')
      })
      parts.push('</table>')
    }
  }

  const html =
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' +
    esc(acct.account_name) +
    ' Account Plan</title><style>' +
    style +
    '</style></head><body>' +
    parts.join('') +
    '</body></html>'

  return { title: acct.account_name + ' Account Plan', fileName, html }
}

export function downloadAccountExport(
  data: AccountExportData,
  accountId: string,
  options: AccountExportOptions,
) {
  const doc = buildAccountExportDocument(data, accountId, options)
  const blob = new Blob([doc.html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = doc.fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return doc
}
