'use client'
import { useRef, useEffect, useState } from 'react'
import { today } from '@/lib/db'
import type { AppState, Account } from '@/types'
import ActionsSection from './ActionsSection'
import OpportunitiesSection from './OpportunitiesSection'
import ProjectsSection from './ProjectsSection'
import PeopleSection from './PeopleSection'
import NotesSection from './NotesSection'
import OverviewSection from './OverviewSection'

interface Props {
  accountId: string
  data: AppState
  setData: React.Dispatch<React.SetStateAction<AppState>>
  onUpdateAccount: (account: Account) => void
  onArchive: () => void
  onDelete: () => void
  filterSearch: string
  filterActionStatus: string
  onFilterActionStatusChange: (v: string) => void
  filterDateFrom: string
  onFilterDateFromChange: (v: string) => void
  filterDateTo: string
  onFilterDateToChange: (v: string) => void
  filterExec: boolean
  onFilterExecChange: (v: boolean) => void
  filterIncomplete: boolean
  onFilterIncompleteChange: (v: boolean) => void
  filterVTwoOwner: string
  onFilterVTwoOwnerChange: (v: string) => void
}

function fmtDate(d: string) {
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AccountView({
  accountId, data, setData, onUpdateAccount, onArchive, onDelete,
  filterSearch, filterActionStatus, onFilterActionStatusChange,
  filterDateFrom, onFilterDateFromChange, filterDateTo, onFilterDateToChange,
  filterExec, onFilterExecChange, filterIncomplete, onFilterIncompleteChange,
  filterVTwoOwner, onFilterVTwoOwnerChange,
}: Props) {
  const acct = data.accounts.find(a => a.account_id === accountId)
  const acctRef = useRef(acct)
  acctRef.current = acct
  const [bttVisible, setBttVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setBttVisible(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!acct) return null

  const isArchived = acct.status === 'Archived'

  return (
    <div id="account-content">
      <div className="account-header-row">
        <div>
          <div
            id="account-name-heading"
            className="account-name-heading"
            aria-label="Account name"
          >
            {acct.account_name}
          </div>
          <ContentEditable
            id="account-client-company"
            className="account-client-company"
            title="Click to edit full client name"
            value={acct.client_company || ''}
            ariaLabel="Full client name"
            placeholder="Norwegian Cruise Line"
            onSave={v => { const cur = acctRef.current; if (cur) onUpdateAccount({ ...cur, client_company: v, last_updated: today() }) }}
          />
          <div className="page-last-updated" id="page-last-updated">
            {acct.last_updated ? 'Last updated ' + fmtDate(acct.last_updated) : ''}
          </div>
        </div>
        <div className="account-header-actions" id="account-header-actions">
          <button className="btn-acct-action" onClick={onArchive}>
            {isArchived ? 'Unarchive Account' : 'Archive Account'}
          </button>
          <button className="btn-acct-action danger" onClick={onDelete}>
            Delete Account
          </button>
        </div>
      </div>

      <div id="overview" className="section">
        <div className="app-section-header">
          <div className="app-section-title">Overview</div>
        </div>
        <OverviewSection accountId={accountId} data={data} setData={setData} />
      </div>

      <div id="people" className="section">
        <PeopleSection
          accountId={accountId} data={data} setData={setData}
          filterSearch={filterSearch}
          filterExec={filterExec} onFilterExecChange={onFilterExecChange}
          filterIncomplete={filterIncomplete} onFilterIncompleteChange={onFilterIncompleteChange}
          filterVTwoOwner={filterVTwoOwner} onFilterVTwoOwnerChange={onFilterVTwoOwnerChange}
        />
      </div>

      <div id="actions" className="section">
        <ActionsSection
          accountId={accountId} data={data} setData={setData}
          filterSearch={filterSearch}
          statusFilter={filterActionStatus} onStatusFilterChange={onFilterActionStatusChange}
        />
      </div>

      <div id="opportunities" className="section">
        <OpportunitiesSection accountId={accountId} data={data} setData={setData} />
      </div>

      <div id="projects" className="section">
        <ProjectsSection accountId={accountId} data={data} setData={setData} />
      </div>

      <div id="notes" className="section">
        <NotesSection
          accountId={accountId} data={data} setData={setData}
          filterDateFrom={filterDateFrom} onFilterDateFromChange={onFilterDateFromChange}
          filterDateTo={filterDateTo} onFilterDateToChange={onFilterDateToChange}
        />
      </div>

      <button
        id="btt"
        className={'btn btn-ghost' + (bttVisible ? '' : ' hidden')}
        aria-label="Back to top"
        title="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{ position: 'fixed', bottom: 'var(--spacing-20)', right: 'var(--spacing-20)', display: bttVisible ? 'inline-flex' : 'none' }}
      >
        {'\u2191'}
      </button>
    </div>
  )
}

function ContentEditable({ id, className, title, value, ariaLabel, placeholder, onSave }: {
  id?: string
  className?: string
  title?: string
  value: string
  ariaLabel?: string
  placeholder?: string
  onSave: (v: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  return (
    <div
      ref={ref}
      id={id}
      className={className}
      title={title}
      data-placeholder={placeholder}
      contentEditable
      suppressContentEditableWarning
      aria-label={ariaLabel}
      onBlur={() => {
        const v = ref.current?.textContent?.trim() || ''
        if (!v) { if (ref.current) ref.current.textContent = value; return }
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => onSave(v), 500)
      }}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ref.current?.blur() } }}
    >
      {value}
    </div>
  )
}
