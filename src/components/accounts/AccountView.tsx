'use client'
import { useRef } from 'react'
import { today, newId, upsertBackground } from '@/lib/db'
import type { AppState, Account, Background } from '@/types'
import ActionsSection from './ActionsSection'
import OpportunitiesSection from './OpportunitiesSection'
import ProjectsSection from './ProjectsSection'
import PeopleSection from './PeopleSection'
import NotesSection from './NotesSection'

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
    <div>
      <div className="account-header-row">
        <div>
          <ContentEditable
            className="account-name-heading"
            value={acct.account_name}
            ariaLabel="Account name"
            onSave={v => onUpdateAccount({ ...acct, account_name: v, last_updated: today() })}
          />
          <div className="page-last-updated" id="page-last-updated" />
        </div>
        <div className="account-header-actions">
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

function ContentEditable({ className, value, ariaLabel, onSave }: {
  className?: string
  value: string
  ariaLabel?: string
  onSave: (v: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={ref}
      className={className}
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

function OverviewSection({ accountId, data, setData }: { accountId: string; data: AppState; setData: React.Dispatch<React.SetStateAction<AppState>> }) {
  let bg = data.background.find(b => b.account_id === accountId && !b.engagement_id)

  const ensureBg = (): Background => {
    if (!bg) {
      bg = {
        background_id: newId('BG'), account_id: accountId, engagement_id: '',
        overview: '', strategic_context: '', delivery_model: '', key_dates: '',
        account_director: '', account_manager: '', account_team: '',
        next_meeting: '', account_tier: '', meeting_title: '', meeting_frequency: '',
        meeting_day: '', meeting_attendees: '', meeting_interval: '', next_meeting_override: '',
        revenue: {}, created_date: today(), last_updated: today(),
      }
    }
    return bg
  }

  const saveBgField = async (field: keyof Background, value: string) => {
    const b = { ...ensureBg(), [field]: value, last_updated: today() }
    setData(prev => {
      const exists = prev.background.some(x => x.background_id === b.background_id)
      return {
        ...prev,
        background: exists
          ? prev.background.map(x => x.background_id === b.background_id ? b : x)
          : [...prev.background, b],
      }
    })
    await upsertBackground(b)
  }

  const b = ensureBg()

  return (
    <div>
      <div className="overview-stats">
        <OverviewStat label="Account Tier" value={b.account_tier} placeholder="Growth" onSave={v => saveBgField('account_tier', v)} />
        <OverviewStat label="Account Director" value={b.account_director} placeholder="Name" onSave={v => saveBgField('account_director', v)} />
        <OverviewStat label="Account Manager" value={b.account_manager} placeholder="Name" onSave={v => saveBgField('account_manager', v)} />
        <OverviewStat label="Account Team" value={b.account_team} placeholder="Names (semicolon separated)" onSave={v => saveBgField('account_team', v)} />
        <OverviewStat label="Next Meeting" value={b.next_meeting} placeholder="Date or description" onSave={v => saveBgField('next_meeting', v)} />
      </div>
      <div className="overview-grid">
        <OverviewTextArea label="Overview" value={b.overview} placeholder="Account overview..." onSave={v => saveBgField('overview', v)} />
        <OverviewTextArea label="Strategic Context" value={b.strategic_context} placeholder="Strategic context..." onSave={v => saveBgField('strategic_context', v)} />
        <OverviewTextArea label="Key Dates" value={b.key_dates} placeholder="Key dates..." onSave={v => saveBgField('key_dates', v)} />
        <OverviewTextArea label="Delivery Model" value={b.delivery_model} placeholder="Delivery model..." onSave={v => saveBgField('delivery_model', v)} />
      </div>
    </div>
  )
}

function OverviewStat({ label, value, placeholder, onSave }: {
  label: string; value: string; placeholder: string; onSave: (v: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div className="overview-stat">
      <div className="overview-stat-label">{label}</div>
      <div
        ref={ref}
        className={'overview-stat-val' + (!value ? ' faded' : '')}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        aria-label={label}
        role="textbox"
        onFocus={() => { if (!value && ref.current) { ref.current.textContent = ''; ref.current.classList.remove('faded') } }}
        onBlur={() => {
          const v = ref.current?.textContent?.trim() || ''
          if (!v) { if (ref.current) { ref.current.textContent = placeholder; ref.current.classList.add('faded') } onSave('') }
          else { if (ref.current) ref.current.classList.remove('faded'); onSave(v) }
        }}
      >
        {value || placeholder}
      </div>
    </div>
  )
}

function OverviewTextArea({ label, value, placeholder, onSave }: {
  label: string; value: string; placeholder: string; onSave: (v: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div className="overview-text-card">
      <div className="overview-stat-label">{label}</div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={'overview-text-body' + (!value ? ' faded' : '')}
        onFocus={() => { if (!value && ref.current) { ref.current.textContent = ''; ref.current.classList.remove('faded') } }}
        onBlur={() => {
          const v = ref.current?.textContent?.trim() || ''
          if (!v && ref.current) { ref.current.textContent = placeholder; ref.current.classList.add('faded') }
          onSave(v)
        }}
      >
        {value || placeholder}
      </div>
    </div>
  )
}
