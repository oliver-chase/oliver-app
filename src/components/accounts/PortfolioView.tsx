'use client'
import { useRef } from 'react'
import { today } from '@/lib/db'
import type { Account, Background, Stakeholder, Action, Project } from '@/types'

interface Props {
  accounts: Account[]
  background: Background[]
  stakeholders: Stakeholder[]
  actions: Action[]
  projects: Project[]
  onSelectAccount: (id: string) => void
  onUpdateAccount: (account: Account) => void
}

const TIER_CLASS: Record<string, string> = {
  Strategic: 'tier-strategic',
  Growth: 'tier-growth',
  Maintenance: 'tier-maintenance',
  'At-Risk': 'tier-at-risk',
}

function fmtDate(d: string) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statDiv(count: number, label: string) {
  return (
    <div className="account-stat" key={label}>
      <strong>{count}</strong> {label}{count !== 1 ? 's' : ''}
    </div>
  )
}

interface CardProps {
  account: Account
  bg?: Background
  stakeholderCount: number
  actionCount: number
  projectCount: number
  isArchived: boolean
  onSelect: () => void
  onUpdateCompany: (v: string) => void
}

function AccountCard({ account, bg, stakeholderCount, actionCount, projectCount, isArchived, onSelect, onUpdateCompany }: CardProps) {
  const companyRef = useRef<HTMLDivElement>(null)
  const tier = bg?.account_tier || 'Growth'
  const tierClass = TIER_CLASS[tier] || 'tier-growth'
  const lastUpdate = bg?.last_updated ? fmtDate(bg.last_updated) : 'Never'
  const teamNames: string[] = []
  if (bg) {
    const keys = ['account_director', 'account_manager', 'account_team'] as const
    keys.forEach(k => {
      if (bg[k]) bg[k].split(';').map((s: string) => s.trim()).filter(Boolean).forEach((n: string) => {
        if (!teamNames.includes(n)) teamNames.push(n)
      })
    })
  }

  return (
    <div
      className={`account-card ${tierClass}`}
      role="button"
      tabIndex={0}
      style={isArchived ? { opacity: 0.5 } : undefined}
      onClick={onSelect}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          className="account-card-name"
          data-placeholder="Company"
        >
          {account.account_name || ''}
        </div>
        {isArchived && (
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: 'var(--surface2)', color: 'var(--gray)' }}>
            Archived
          </span>
        )}
      </div>
      <div
        ref={companyRef}
        className="account-card-company"
        data-placeholder="Full Company Name"
        contentEditable
        suppressContentEditableWarning
        aria-label="Client company name"
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        onBlur={() => {
          const v = companyRef.current?.textContent?.trim() || ''
          onUpdateCompany(v)
        }}
      >
        {account.client_company || ''}
      </div>
      <div className="account-card-stats">
        {statDiv(stakeholderCount, 'stakeholder')}
        {statDiv(actionCount, 'action')}
        {statDiv(projectCount, 'project')}
      </div>
      <div className="account-card-note">Last updated {lastUpdate}</div>
      {teamNames.length > 0 && (
        <div className="last-updated-tip">Team: {teamNames.join(', ')}</div>
      )}
    </div>
  )
}

export default function PortfolioView({ accounts, background, stakeholders, actions, projects, onSelectAccount, onUpdateAccount }: Props) {
  const bgFor = (id: string) => background.find(b => b.account_id === id && !b.engagement_id)

  const active = accounts.filter(a => a.status !== 'Archived')
  const archived = accounts.filter(a => a.status === 'Archived')

  const tiers: Record<string, Account[]> = { Strategic: [], Growth: [], Maintenance: [], 'At-Risk': [] }
  active.forEach(acct => {
    const bg = bgFor(acct.account_id)
    const tier = bg?.account_tier || 'Growth'
    if (tier in tiers) tiers[tier].push(acct)
    else tiers.Growth.push(acct)
  })

  const renderCard = (acct: Account, isArchived: boolean) => {
    const bg = bgFor(acct.account_id)
    return (
      <AccountCard
        key={acct.account_id}
        account={acct}
        bg={bg}
        stakeholderCount={stakeholders.filter(s => s.account_id === acct.account_id && (s.organization || '').toLowerCase() !== 'v.two').length}
        actionCount={actions.filter(a => a.account_id === acct.account_id).length}
        projectCount={projects.filter(p => p.account_id === acct.account_id).length}
        isArchived={isArchived}
        onSelect={() => onSelectAccount(acct.account_id)}
        onUpdateCompany={v => onUpdateAccount({ ...acct, client_company: v, last_updated: today() })}
      />
    )
  }

  if (!accounts.length) {
    return (
      <div style={{ paddingTop: 8 }}>
        <div className="portfolio-grid">
          <div className="empty-state">No accounts yet.</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <div className="portfolio-grid">
        {Object.values(tiers).flat().map(acct => renderCard(acct, false))}
        {archived.length > 0 && (
          <>
            <div style={{ width: '100%', gridColumn: '1 / -1', padding: '12px 0 4px', fontSize: 'var(--font-size-xs)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gray)' }}>
              Archived
            </div>
            {archived.map(acct => renderCard(acct, true))}
          </>
        )}
      </div>
    </div>
  )
}
