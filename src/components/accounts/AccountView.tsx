'use client'
import { useRef } from 'react'
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
}

export default function AccountView({ accountId, data, setData, onUpdateAccount, onArchive, onDelete }: Props) {
  const acct = data.accounts.find(a => a.account_id === accountId)
  if (!acct) return null

  const isArchived = acct.status === 'Archived'

  return (
    <div id="account-content">
      <div className="account-header-row">
        <div>
          <ContentEditable
            id="account-name-heading"
            className="account-name-heading"
            title="Click to edit account name"
            value={acct.account_name}
            ariaLabel="Account name"
            onSave={v => onUpdateAccount({ ...acct, account_name: v, last_updated: today() })}
          />
          <div className="page-last-updated" id="page-last-updated" />
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
        <PeopleSection accountId={accountId} data={data} setData={setData} />
      </div>

      <div id="actions" className="section">
        <ActionsSection accountId={accountId} data={data} setData={setData} />
      </div>

      <div id="opportunities" className="section">
        <OpportunitiesSection accountId={accountId} data={data} setData={setData} />
      </div>

      <div id="projects" className="section">
        <ProjectsSection accountId={accountId} data={data} setData={setData} />
      </div>

      <div id="notes" className="section">
        <NotesSection accountId={accountId} data={data} setData={setData} />
      </div>
    </div>
  )
}

function ContentEditable({ id, className, title, value, ariaLabel, onSave }: {
  id?: string
  className?: string
  title?: string
  value: string
  ariaLabel?: string
  onSave: (v: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={ref}
      id={id}
      className={className}
      title={title}
      contentEditable
      suppressContentEditableWarning
      aria-label={ariaLabel}
      onBlur={() => {
        const v = ref.current?.textContent?.trim() || ''
        if (v) onSave(v)
        else if (ref.current) ref.current.textContent = value
      }}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ref.current?.blur() } }}
    >
      {value}
    </div>
  )
}
