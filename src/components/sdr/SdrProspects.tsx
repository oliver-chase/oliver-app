'use client'
import type { SdrProspect, SdrFilters } from './types'
import { PROSPECT_STATUS_LABEL, TRACK_LABEL, FILTER_STATUSES } from './types'

const PAGE_SIZE = 20

interface Props {
  prospects: SdrProspect[]
  filters: SdrFilters
  onFiltersChange: (f: Partial<SdrFilters>) => void
  onSelectProspect: (p: SdrProspect) => void
}

function filteredProspects(prospects: SdrProspect[], filters: SdrFilters) {
  return prospects.filter(p => {
    if (filters.status && filters.status !== 'all' && p.st !== filters.status) return false
    if (filters.track && p.tr !== filters.track) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!((p.nm + ' ' + p.co + ' ' + p.em).toLowerCase().includes(q))) return false
    }
    return true
  })
}

export default function SdrProspects({ prospects, filters, onFiltersChange, onSelectProspect }: Props) {
  const counts: Record<string, number> = {}
  prospects.forEach(p => { counts[p.st] = (counts[p.st] || 0) + 1 })
  const total = prospects.length

  const trackCounts: Record<string, number> = {}
  prospects.forEach(p => { if (p.tr) trackCounts[p.tr] = (trackCounts[p.tr] || 0) + 1 })

  const list = filteredProspects(prospects, filters)
  const pageCount = Math.ceil(list.length / PAGE_SIZE)
  const page = Math.min(filters.page, Math.max(0, pageCount - 1))
  const paginated = list.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div id="sdr-section-prospects" className="sdr-section">
      <div className="sdr-section-header">
        <h2>Prospects</h2>
        <span className="sdr-section-count">
          {list.length}{list.length !== total ? ' of ' + total : ''}
        </span>
      </div>

      <div className="sdr-filter-bar">
        <button className={'sdr-pill' + (filters.status === 'all' ? ' active' : '')} onClick={() => onFiltersChange({ status: 'all', page: 0 })}>
          All <span className="sdr-pill-count">{total}</span>
        </button>
        {FILTER_STATUSES.filter(s => counts[s]).map(s => (
          <button key={s} className={'sdr-pill' + (filters.status === s ? ' active' : '')} onClick={() => onFiltersChange({ status: s, page: 0 })}>
            {PROSPECT_STATUS_LABEL[s] || s} <span className="sdr-pill-count">{counts[s]}</span>
          </button>
        ))}
      </div>

      {Object.keys(trackCounts).length > 0 && (
        <div className="sdr-filter-bar">
          <button className={'sdr-pill' + (filters.track === '' ? ' active' : '')} onClick={() => onFiltersChange({ track: '', page: 0 })}>All Tracks</button>
          {Object.keys(trackCounts).map(tr => (
            <button key={tr} className={'sdr-pill' + (filters.track === tr ? ' active' : '')} onClick={() => onFiltersChange({ track: tr, page: 0 })}>
              {TRACK_LABEL[tr] || tr} <span className="sdr-pill-count">{trackCounts[tr]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="sdr-search-bar">
        <input
          className="sdr-search-input"
          type="text"
          placeholder="Search name, company, email..."
          value={filters.search}
          onChange={e => onFiltersChange({ search: e.target.value, page: 0 })}
        />
      </div>

      {list.length === 0 ? (
        <div className="sdr-empty">No prospects match this filter.</div>
      ) : (
        <>
          <div className="sdr-prospect-grid">
            {paginated.map(p => {
              const stClass = 'sdr-status--' + (p.st || 'new').replace(/_/g, '-')
              const track = TRACK_LABEL[p.tr] || p.tr || ''
              return (
                <div key={p.id} className="sdr-prospect-card" style={{ cursor: 'pointer' }} onClick={() => onSelectProspect(p)}>
                  <div className="sdr-prospect-card-top">
                    <div className="sdr-prospect-name">{p.nm || p.fn || 'Unknown'}</div>
                    <div className={'sdr-status-badge ' + stClass}>{PROSPECT_STATUS_LABEL[p.st] || p.st || 'New'}</div>
                  </div>
                  {(p.ti || p.co) && <div className="sdr-prospect-meta">{[p.ti, p.co].filter(Boolean).join(' at ')}</div>}
                  {p.em && <div className="sdr-prospect-email">{p.em}</div>}
                  <div className="sdr-prospect-footer">
                    {track && <span className="sdr-track-chip">{track}</span>}
                    {parseInt(p.fuc) > 1 && <span className="sdr-touch-chip">Touch {parseInt(p.fuc)}</span>}
                    {p.nfu && <span className="sdr-date-chip">Next: {p.nfu}</span>}
                  </div>
                </div>
              )
            })}
          </div>
          {pageCount > 1 && (
            <div className="sdr-pagination">
              <button className="sdr-page-btn" disabled={page === 0} onClick={() => onFiltersChange({ page: page - 1 })}>&larr;</button>
              <span className="sdr-page-info">Page {page + 1} of {pageCount}</span>
              <button className="sdr-page-btn" disabled={page >= pageCount - 1} onClick={() => onFiltersChange({ page: page + 1 })}>&rarr;</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
