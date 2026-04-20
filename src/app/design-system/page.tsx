'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import AppChip from '@/components/shared/AppChip'
import AppBadge from '@/components/shared/AppBadge'
import SyncDot from '@/components/shared/SyncDot'
import CustomPicker from '@/components/shared/CustomPicker'
import ConfirmModal from '@/components/shared/ConfirmModal'
import { useAppModal } from '@/components/shared/AppModal'
import './ds.css'

// ── Copy helper ─────────────────────────────────────────────────────────────

function ResolvedValue({ token, fallback }: { token: string; fallback: string }) {
  const [v, setV] = useState(fallback)
  useEffect(() => {
    const computed = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
    if (computed) setV(computed)
  }, [token])
  return <>{v}</>
}

function DeadTokenAudit() {
  const colorTokens = COLOR_GROUPS.flatMap(g => g.tokens.map(t => t.name))
  const deadColors = colorTokens.filter(n => !(n in COLOR_USAGES) || COLOR_USAGES[n].length === 0)
  const deadSpacing = SPACING.filter(s => s.usages.length === 0).map(s => s.token)
  const deadLayout = LAYOUT_BARS.filter(l => l.usages.length === 0).map(l => l.token)
  const total = deadColors.length + deadSpacing.length + deadLayout.length
  const [open, setOpen] = useState(false)

  if (total === 0) {
    return (
      <div className="deadAudit deadAudit--clean">
        <span className="deadAuditCount">✓</span>
        <span>Dead-token audit clean — every tracked token has at least one recorded consumer.</span>
      </div>
    )
  }

  return (
    <div className={'deadAudit' + (open ? ' deadAudit--open' : '')}>
      <button
        type="button"
        className="deadAuditToggle"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span className="deadAuditCount">{total}</span>
        <span>tokens with no tracked usage</span>
        <span className="deadAuditChevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="deadAuditBody">
          <p className="sectionNote">
            Missing usage data usually means the token is unused — or that this page
            hasn&rsquo;t catalogued it yet. Grep the codebase before deleting.
          </p>
          {deadColors.length > 0 && (
            <div className="deadAuditGroup">
              <div className="typeUsagesLabel">Colors ({deadColors.length})</div>
              {deadColors.map(n => <div key={n} className="deadAuditItem">{n}</div>)}
            </div>
          )}
          {deadSpacing.length > 0 && (
            <div className="deadAuditGroup">
              <div className="typeUsagesLabel">Spacing ({deadSpacing.length})</div>
              {deadSpacing.map(n => <div key={n} className="deadAuditItem">{n}</div>)}
            </div>
          )}
          {deadLayout.length > 0 && (
            <div className="deadAuditGroup">
              <div className="typeUsagesLabel">Layout ({deadLayout.length})</div>
              {deadLayout.map(n => <div key={n} className="deadAuditItem">{n}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CopyToken({ name }: { name: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    navigator.clipboard.writeText(name).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }, [name])
  return (
    <button className={'swatchName copyToken' + (copied ? ' copied' : '')} onClick={copy} title="Click to copy">
      {copied ? 'Copied!' : name}
    </button>
  )
}

// ── Color token groups ──────────────────────────────────────────────────────

const COLOR_GROUPS = [
  {
    group: 'Brand',
    tokens: [
      { name: '--color-white',            value: '#FEFFFF' },
      { name: '--color-brand-purple',     value: '#171433' },
      { name: '--color-brand-pink',       value: '#dc0170' },
      { name: '--color-brand-pink-light', value: '#fce4f0' },
    ],
  },
  {
    group: 'Text',
    tokens: [
      { name: '--color-text-primary',     value: '#1a1a1a' },
      { name: '--color-text-secondary',   value: '#4a4a4e' },
      { name: '--color-text-placeholder', value: '#4a4a4e' },
      { name: '--color-text-inverse',     value: 'var(--color-white)' },
    ],
  },
  {
    group: 'Backgrounds',
    tokens: [
      { name: '--color-bg-page',     value: '#f5f5f6' },
      { name: '--color-bg-card',     value: 'var(--color-white)' },
      { name: '--color-bg-input',    value: 'var(--color-white)' },
      { name: '--color-bg-hover',    value: '#f0f0f1' },
      { name: '--color-bg-overdue',  value: 'rgba(220,1,112,.06)' },
      { name: '--color-bg-required', value: 'rgba(220,1,112,.08)' },
    ],
  },
  {
    group: 'Borders',
    tokens: [
      { name: '--color-border',        value: '#e0e0e2' },
      { name: '--color-border-focus',  value: '#dc0170' },
      { name: '--color-border-dashed', value: '#dc0170' },
    ],
  },
  {
    group: 'Sentiment',
    tokens: [
      { name: '--color-sentiment-champion',     value: '#562aa7' },
      { name: '--color-sentiment-champion-bg',  value: '#efe7f5' },
      { name: '--color-sentiment-supporter',    value: '#562aa7' },
      { name: '--color-sentiment-supporter-bg', value: '#fce4f0' },
      { name: '--color-sentiment-neutral',      value: '#5a5a5d' },
      { name: '--color-sentiment-neutral-bg',   value: '#f5f5f6' },
      { name: '--color-sentiment-detractor',    value: '#a12e22' },
      { name: '--color-sentiment-detractor-bg', value: '#fdecea' },
      { name: '--color-sentiment-unknown',      value: '#5a5a5d' },
      { name: '--color-sentiment-unknown-bg',   value: '#f5f5f6' },
    ],
  },
  {
    group: 'Status',
    tokens: [
      { name: '--color-status-active',          value: '#562aa7' },
      { name: '--color-status-active-bg',       value: '#ece3f3' },
      { name: '--color-status-complete',        value: '#5a5a5d' },
      { name: '--color-status-complete-bg',     value: '#f5f5f6' },
      { name: '--color-status-open',            value: '#562aa7' },
      { name: '--color-status-open-bg',         value: '#ebe3f2' },
      { name: '--color-status-lost',            value: '#5a5a5d' },
      { name: '--color-status-lost-bg',         value: '#f5f5f6' },
      { name: '--color-status-identified',      value: '#5a5a5d' },
      { name: '--color-status-identified-bg',   value: '#f5f5f6' },
      { name: '--color-status-pursuing',        value: '#562aa7' },
      { name: '--color-status-pursuing-bg',     value: '#fce4f0' },
      { name: '--color-status-won',             value: 'var(--color-white)' },
      { name: '--color-status-won-bg',          value: '#562aa7' },
      { name: '--color-status-success',         value: '#065f46' },
      { name: '--color-status-success-bg',      value: '#d1fae5' },
    ],
  },
  {
    group: 'Account Tier',
    tokens: [
      { name: '--color-tier-strategic',   value: '#1a9c6e' },
      { name: '--color-tier-growth',      value: '#4c2594' },
      { name: '--color-tier-maintenance', value: '#B0B1B5' },
      { name: '--color-tier-at-risk',     value: '#c0392b' },
    ],
  },
  {
    group: 'Navigation',
    tokens: [
      { name: '--color-nav-bg',           value: '#562aa7' },
      { name: '--color-nav-bg-deep',      value: '#562aa7' },
      { name: '--color-nav-text',         value: 'var(--color-white)' },
      { name: '--color-nav-text-muted',   value: 'rgba(254,255,255,.7)' },
      { name: '--color-nav-text-faint',   value: 'rgba(254,255,255,.4)' },
      { name: '--color-nav-accent',       value: '#dc0170' },
    ],
  },
  {
    group: 'Utility',
    tokens: [
      { name: '--color-green',       value: '#1a9c6e' },
      { name: '--color-green-light', value: '#e6f7f1' },
      { name: '--color-amber',       value: '#b86c0a' },
      { name: '--color-amber-light', value: '#fef3e2' },
      { name: '--color-red',         value: '#c0392b' },
      { name: '--color-red-light',   value: '#fdecea' },
      { name: '--color-blue',        value: '#4c2594' },
      { name: '--color-blue-light',  value: '#e8f2fc' },
      { name: '--color-chart-bar',   value: 'rgba(86,42,167,.25)' },
    ],
  },
]

// ── Color token usages (hand-curated; missing entries render "No tracked usage")
// Keep expanded as new modules adopt tokens.

const COLOR_USAGES: Record<string, string[]> = {
  '--color-brand-pink':        ['Hub/HR/SDR focus rings', 'OliverDock chatbot trigger', 'Accounts pink accent', 'btn-primary background'],
  '--color-brand-pink-light':  ['accent-light pills', 'status-pursuing-bg', 'sentiment-supporter-bg'],
  '--color-brand-purple':      ['app-sidebar background', 'tier-growth / status-active / sentiment-champion'],
  '--color-white':             ['btn-primary label', 'nav-text', 'status-won foreground'],
  '--color-text-primary':      ['Body copy, page titles, table cells'],
  '--color-text-secondary':    ['Subtitles, meta text, form labels'],
  '--color-text-placeholder':  ['Empty state text, placeholder input, sort arrows'],
  '--color-border':            ['card + input + table borders across all modules'],
  '--color-border-focus':      ['Input focus outline (Accounts + HR + SDR)'],
  '--color-border-dashed':     ['btn-dashed border (Accounts actions, HR intake buttons)'],
  '--color-bg-page':           ['html/body surface when page chrome is light'],
  '--color-bg-card':           ['Card background across modules'],
  '--color-bg-hover':          ['Row hover (tables, dash-row), design-system expandable rows'],
  '--color-tier-strategic':    ['AccountCard tier-strategic left border'],
  '--color-tier-growth':       ['AccountCard tier-growth left border'],
  '--color-tier-maintenance':  ['AccountCard tier-maintenance left border'],
  '--color-tier-at-risk':      ['AccountCard tier-at-risk left border'],
  '--color-green':             ['sync-dot (ok), stat-value-green, status-success'],
  '--color-amber':             ['sync-dot (syncing), overdue-badge, pill-amber'],
  '--color-red':               ['sync-dot (error), delete danger, badge-overdue'],
  '--color-blue':              ['pill-blue, dash-row-date--blue, iv-date-upcoming'],
  '--color-modal-overlay':     ['App modal overlays (HR + Accounts + SDR)'],
  '--color-backdrop-overlay':  ['SDR detail panel backdrop'],
}

// ── Typography ──────────────────────────────────────────────────────────────

interface FontSize {
  token: string
  value: string
  label: string
  specimen: string
  usages: Array<{ surface: string; example: string }>
}

const FONT_SIZES: FontSize[] = [
  { token: '--font-size-3xs',     value: '9px',  label: '3XS',
    specimen: 'PENDING · QUEUED',
    usages: [
      { surface: 'HR',        example: 'pill, overdue-badge (2026-04-20: shrunk from xs→3xs)' },
      { surface: 'Accounts',  example: 'badge-archived, portfolio-archived-sep, dash-row-sub' },
      { surface: 'SDR',       example: 'sdr-status-badge, sdr-batch-stat, sdr-track-chip pills' },
    ],
  },
  { token: '--font-size-2xs',     value: '11px', label: '2XS',
    specimen: 'SECTION LABEL',
    usages: [
      { surface: 'Design-system', example: 'typeUsagesLabel small uppercase caption' },
      { surface: 'HR', example: 'historical — pills migrated to 3xs on 2026-04-20' },
    ],
  },
  { token: '--font-size-xs',      value: '13px', label: 'XS',
    specimen: 'The bulk of dense HR + Accounts text',
    usages: [
      { surface: 'HR', example: 'Table td, pill, kanban-name, .btn, form-label, form-input' },
      { surface: 'Accounts', example: 'portfolio stat, notes meta, btn-acct-action' },
      { surface: 'SDR', example: 'prospect meta, pagination page-info, draft-gen' },
    ],
  },
  { token: '--font-size-sm',      value: '14px', label: 'SM',
    specimen: 'Section body and draft bodies',
    usages: [
      { surface: 'SDR', example: 'sdr-search-input, sdr-draft-body, sdr-draft-subject' },
      { surface: 'HR', example: 'page-subtitle, sync-status spans' },
      { surface: 'Accounts', example: 'notes-search, account-client-company' },
    ],
  },
  { token: '--font-size-md',      value: '16px', label: 'MD',
    specimen: 'Occasional emphasis',
    usages: [
      { surface: 'Accounts', example: 'account-client-company (base size for edit field)' },
    ],
  },
  { token: '--font-size-base',    value: '15px', label: 'Base',
    specimen: 'Default body (rare — UI prefers XS/SM)',
    usages: [
      { surface: 'HR', example: 'app-modal-title, empty-title' },
    ],
  },
  { token: '--font-size-lg',      value: '17px', label: 'LG',
    specimen: 'Detail panel titles',
    usages: [
      { surface: 'SDR', example: 'sdr-detail-name (prospect title in side panel)' },
    ],
  },
  { token: '--font-size-xl',      value: '20px', label: 'XL',
    specimen: 'Page Title',
    usages: [
      { surface: 'HR', example: '.page-title on all HR routes' },
      { surface: 'Accounts', example: 'Reports spec count' },
      { surface: 'SDR', example: 'sdr-section-header h2' },
    ],
  },
  { token: '--font-size-2xl',     value: '24px', label: '2XL',
    specimen: 'Account Hero',
    usages: [
      { surface: 'Accounts', example: 'account-name-heading on AccountView' },
      { surface: 'Design-system', example: 'pageTitle on this page' },
    ],
  },
  { token: '--font-size-display', value: '26px', label: 'Display',
    specimen: '123',
    usages: [
      { surface: 'HR', example: 'stat-value on Dashboard + Reports stat cards' },
    ],
  },
  { token: '--font-size-hero-sm', value: '36px', label: 'Hero SM',
    specimen: 'V.Two Ops',
    usages: [
      { surface: 'Hub', example: 'Brand wordmark on hub index (mobile)' },
    ],
  },
  { token: '--font-size-hero',    value: '48px', label: 'Hero',
    specimen: 'V.Two Ops',
    usages: [
      { surface: 'Hub', example: 'Brand wordmark on hub index (desktop)' },
    ],
  },
]

const FONT_WEIGHTS = [
  { token: '--font-weight-normal',   value: '400', label: 'Normal' },
  { token: '--font-weight-medium',   value: '500', label: 'Medium' },
  { token: '--font-weight-semibold', value: '600', label: 'Semibold' },
  { token: '--font-weight-bold',     value: '700', label: 'Bold' },
]

const LINE_HEIGHTS = [
  { token: '--line-height-tight',   value: '1.25', label: 'Tight — headings, display text' },
  { token: '--line-height-base',    value: '1.5',  label: 'Base — body copy, labels' },
  { token: '--line-height-relaxed', value: '1.75', label: 'Relaxed — long-form text, notes' },
]

const LETTER_SPACINGS = [
  { token: '--letter-spacing-caps',  value: '0.08em', label: 'Caps — section labels, table headers' },
  { token: '--letter-spacing-mid',   value: '0.1em',  label: 'Mid — badge labels, mono labels' },
  { token: '--letter-spacing-wide',  value: '0.12em', label: 'Wide — footer text, footer mono' },
  { token: '--letter-spacing-xwide', value: '0.28em', label: 'XWide — hero subtitle, hub subtitle' },
]

// ── Spacing ─────────────────────────────────────────────────────────────────

interface SpacingToken {
  token: string
  value: string
  usages: string[]
}

const SPACING: SpacingToken[] = [
  { token: '--spacing-2xs', value: '2px',  usages: ['Meta lines, dash-row-sub gap, detail-row padding, badge-overdue pill'] },
  { token: '--spacing-3',   value: '3px',  usages: ['Accounts: tier-pill/exec-pill/eng-tag/bullet-heading/form-label/org-zoom/org-node-owner/proj-meta padding-y', 'components-layout: app-sidebar-item-label border-radius'] },
  { token: '--spacing-xs',  value: '4px',  usages: ['Inline captions, pill padding-y, gs-item-sub, stat-sub'] },
  { token: '--spacing-6',   value: '6px',  usages: ['Filter-bar gap, btn-ghost padding-x, .sync-dot height'] },
  { token: '--spacing-7',   value: '7px',  usages: ['sdr-search-input padding-y'] },
  { token: '--spacing-sm',  value: '8px',  usages: ['Tight micro gap in margin-scale (hr-row-pad), chip padding-x, pill padding-x'] },
  { token: '--spacing-10',  value: '10px', usages: ['Topbar gap, filter-select padding-x, table td padding-x'] },
  { token: '--spacing-12',  value: '12px', usages: ['Filter-bar padding-y, form-row gap, sdr-pagination gap'] },
  { token: '--spacing-14',  value: '14px', usages: ['stat-grid gap, table-toolbar padding-y, sdr-prospect-card padding-y'] },
  { token: '--spacing-md',  value: '16px', usages: ['Sub-header gap (hr-sub), card padding, form-group margin-bottom, section-header padding-y'] },
  { token: '--spacing-20',  value: '20px', usages: ['Topbar padding-x, account-header-row top, split-list padding, detail-header padding'] },
  { token: '--spacing-lg',  value: '24px', usages: ['Card group gap (hr-card-group), page padding-x, typeRow gap, anchorNav items wrap'] },
  { token: '--spacing-xl',  value: '32px', usages: ['Section margin-bottom (accounts .section, hr-section), empty-state padding, topbar hamburger size'] },
  { token: '--spacing-2xl', value: '48px', usages: ['Empty-state large padding, design-system page padding-y'] },
  { token: '--spacing-56',  value: '56px', usages: ['Swatch block height on design-system page'] },
]

// ── Radius ──────────────────────────────────────────────────────────────────

const RADII = [
  { token: '--radius-sm',   value: '4px' },
  { token: '--radius-md',   value: '8px' },
  { token: '--radius-lg',   value: '12px' },
  { token: '--radius-xl',   value: '16px' },
  { token: '--radius-full', value: '9999px' },
]

// ── Shadows ─────────────────────────────────────────────────────────────────

const SHADOWS = [
  { token: '--shadow-card',       value: '0 2px 8px rgba(0,0,0,.06)',   label: 'Card' },
  { token: '--shadow-card-hover', value: '0 4px 16px rgba(0,0,0,.10)', label: 'Card Hover' },
  { token: '--shadow-popover',    value: '0 4px 12px rgba(0,0,0,.12)', label: 'Popover' },
  { token: '--shadow-modal',      value: '0 4px 20px rgba(0,0,0,.15)', label: 'Modal' },
]

// ── Z-index ─────────────────────────────────────────────────────────────────

const Z_TOKENS = [
  { token: '--z-org-svg',   value: '0',   note: 'SVG connector layer' },
  { token: '--z-base',      value: '1',   note: 'Default stacking' },
  { token: '--z-dropdown',  value: '20',  note: 'Card-level dropdowns' },
  { token: '--z-topbar',    value: '40',  note: 'calc(sidebar - 10)' },
  { token: '--z-sidebar',   value: '50',  note: 'Nav sidebar' },
  { token: '--z-popover',   value: '100', note: 'Pickers, popovers' },
  { token: '--z-modal',     value: '200', note: 'Modal overlays' },
  { token: '--z-toast',     value: '300', note: 'Toast notifications' },
]

// ── Transitions ─────────────────────────────────────────────────────────────

const TRANSITIONS = [
  { token: '--transition-quick', value: '180ms ease', note: 'Card hover lift' },
  { token: '--transition-fast',  value: '150ms ease', note: 'Micro-interactions' },
  { token: '--transition-base',  value: '250ms ease', note: 'Standard UI' },
  { token: '--transition-slow',  value: '300ms ease', note: 'Deliberate reveals' },
]

// ── Badge variants ──────────────────────────────────────────────────────────

const BADGE_VARIANTS: Array<'active' | 'complete' | 'pursuing' | 'won' | 'lost' | 'identified' | 'open' | 'on-hold'> = [
  'active', 'complete', 'pursuing', 'won', 'lost', 'identified', 'open', 'on-hold',
]

// ── Picker options ──────────────────────────────────────────────────────────

const PICKER_OPTIONS = [
  { value: 'purple', label: 'Purple' },
  { value: 'pink',   label: 'Pink' },
  { value: 'green',  label: 'Green' },
  { value: 'blue',   label: 'Blue' },
  { value: 'amber',  label: 'Amber' },
]

// ── Layout tokens ───────────────────────────────────────────────────────────

const LAYOUT_BARS = [
  { token: '--sidebar-w',          value: '220px',  label: 'Sidebar width',       color: 'var(--color-brand-purple)',      dir: 'h' as const,
    usages: ['app-sidebar width', 'topbar + main left offset on Accounts/HR/SDR/CRM'] },
  { token: '--chatbot-drawer-w',   value: '360px',  label: 'Chatbot panel width', color: 'var(--color-status-active-bg)',  dir: 'h' as const,
    usages: ['OliverDock .chatbot-panel width'] },
  { token: '--hub-card-max-w',     value: '420px',  label: 'Hub card max-width',  color: 'var(--color-purple-overlay)',    dir: 'h' as const,
    usages: ['ModuleCard max-width on hub page'] },
  { token: '--topbar-h',           value: '50px',   label: 'Topbar height',       color: 'var(--color-brand-pink)',       dir: 'v' as const,
    usages: ['Fixed topbar height across all modules', 'page-top math: topbar-h + spacing-md + spacing-20'] },
  { token: '--filterbar-h',        value: '52px',   label: 'Filterbar height',    color: 'var(--color-brand-pink-light)', dir: 'v' as const,
    usages: ['Accounts main-with-filterbar padding-top calc'] },
  { token: '--touch-target',       value: '44px',   label: 'Touch target (WCAG)', color: 'var(--color-green)',             dir: 'v' as const,
    usages: ['Mobile min-height on btn/input/detail-close', 'topbar-hamburger mobile'] },
  { token: '--chatbot-trigger-size', value: '48px', label: 'Chatbot trigger',     color: 'var(--color-amber)',             dir: 'sq' as const,
    usages: ['OliverDock trigger button size'] },
  { token: '--org-node-w',         value: '220px',  label: 'Org node width',      color: 'var(--color-tier-strategic)',   dir: 'h' as const,
    usages: ['Accounts org-chart node width'] },
  { token: '--sync-dot-size',      value: '7px',    label: 'Sync dot',            color: 'var(--color-green)',             dir: 'sq' as const,
    usages: ['Accounts SyncDot (sync-dot width/height)'] },
]

// ── Component token table ───────────────────────────────────────────────────

const COMPONENT_TOKENS = [
  { token: '--notes-clamp-height',  value: '36px',  note: '~2 lines at 14px/1.4' },
  { token: '--notes-popup-min-h',   value: '60px',  note: 'Card-level notes popup' },
  { token: '--badge-min-height',    value: '18px',  note: 'Picker badge trigger' },
  { token: '--cadence-row-min-h',   value: '28px',  note: 'Cadence summary row' },
  { token: '--day-btn-size',        value: '32px',  note: 'Day-of-week picker button' },
  { token: '--rev-legend-size',     value: '10px',  note: 'Revenue chart legend dot' },
  { token: '--interval-input-w',    value: '50px',  note: 'Interval number input' },
  { token: '--rev-input-w',         value: '110px', note: 'Revenue value input' },
  { token: '--hub-top-offset',      value: '22vh',  note: 'Hub page top padding' },
  { token: '--hub-top-offset-sm',   value: '16vh',  note: 'Hub mobile top padding' },
  { token: '--transform-lift',      value: 'translateY(-1px)', note: 'Card hover lift' },
  { token: '--inline-form-padding', value: '14px 16px', note: 'Inline form inner padding' },
  { token: '--editable-padding',    value: '1px 3px',   note: 'contentEditable cell padding' },
  { token: '--chip-padding-y',      value: '2px',        note: 'App chip vertical padding' },
]

// ────────────────────────────────────────────────────────────────────────────

const DESIGN_SECTIONS = [
  { id: 'sec-colors',     label: 'Colors' },
  { id: 'sec-typography', label: 'Typography' },
  { id: 'sec-spacing',    label: 'Spacing' },
  { id: 'sec-effects',    label: 'Radius / Shadows / Z / Transitions' },
  { id: 'sec-components', label: 'Components' },
  { id: 'sec-layout',     label: 'Layout Tokens' },
]

export default function DesignSystemPage() {
  const { modal, showModal } = useAppModal()
  const [pickerVal, setPickerVal] = useState('')
  const [multiVal, setMultiVal] = useState<string[]>([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [expandedType, setExpandedType] = useState<string | null>(null)
  const [expandedColor, setExpandedColor] = useState<string | null>(null)
  const [expandedSpacing, setExpandedSpacing] = useState<string | null>(null)

  return (
    <div className="page">
      {modal}
      {showConfirm && (
        <ConfirmModal
          title="Delete item?"
          message="This action cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={() => setShowConfirm(false)}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div className="topbar">
        <Link href="/" className="back">&larr; Hub</Link>
        <div className="pageTitle">Design System</div>
      </div>

      <nav className="anchorNav" aria-label="Design system sections">
        {DESIGN_SECTIONS.map(s => (
          <a key={s.id} href={'#' + s.id} className="anchorLink">{s.label}</a>
        ))}
      </nav>

      <DeadTokenAudit />

      {/* ── SECTION 1 — COLOR TOKENS ── */}
      <div className="section" id="sec-colors">
        <div className="sectionTitle">1 — Color Tokens</div>
        <p className="sectionNote">Click the swatch to see where the token is used. Click the token name to copy.</p>
        {COLOR_GROUPS.map(({ group, tokens }) => (
          <div key={group}>
            <div className="groupTitle">{group}</div>
            <div className="swatchGrid">
              {tokens.map(({ name, value }) => {
                const isOpen = expandedColor === name
                const usages = COLOR_USAGES[name] ?? []
                return (
                  <div key={name} className={'swatchCard' + (isOpen ? ' swatchCard--open' : '')}>
                    <button
                      type="button"
                      className="swatchBlock"
                      aria-expanded={isOpen}
                      aria-label={'Show usages for ' + name}
                      onClick={() => setExpandedColor(isOpen ? null : name)}
                      style={{
                        background: `var(${name})`,
                        border: (name.includes('inverse') || name.includes('won') && !name.includes('bg') || name.includes('nav-text') || value === '#FEFFFF')
                          ? '1px solid var(--color-border)'
                          : undefined,
                      }}
                    />
                    <div className="swatchMeta">
                      <CopyToken name={name} />
                      <div className="swatchValue"><ResolvedValue token={name} fallback={value} /></div>
                    </div>
                    {isOpen && (
                      <div className="swatchUsages">
                        <div className="typeUsagesLabel">
                          {usages.length > 0 ? 'Used by (' + usages.length + ')' : 'No tracked usage'}
                        </div>
                        {usages.map((u, i) => (
                          <div key={i} className="swatchUsageItem">{u}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── SECTION 2 — TYPOGRAPHY ── */}
      <div className="section" id="sec-typography">
        <div className="sectionTitle">2 — Typography</div>

        <div className="groupTitle">Font Sizes · click a row to see where it&rsquo;s used</div>
        {FONT_SIZES.map(({ token, value, label, specimen, usages }) => {
          const isOpen = expandedType === token
          return (
            <div key={token}>
              <div
                className="typeRow typeRowExpandable"
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => setExpandedType(isOpen ? null : token)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedType(isOpen ? null : token) } }}
              >
                <div className="typeMeta">
                  <div className="typeToken">{token}</div>
                  <div className="typeValue">{value} · {label}</div>
                </div>
                <div className="typeSample" style={{ fontSize: `var(${token})` }}>
                  {specimen}
                </div>
                <span className="typeExpandIcon" aria-hidden="true">{isOpen ? '−' : '+'}</span>
              </div>
              {isOpen && (
                <div className="typeUsages">
                  <div className="typeUsagesLabel">Used by ({usages.length})</div>
                  {usages.map((u, i) => (
                    <div key={i} className="typeUsageItem">
                      <span className="typeUsageSurface">{u.surface}</span>
                      <span className="typeUsageExample">{u.example}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        <div className="groupTitle" style={{ marginTop: 'var(--spacing-xl)' }}>Font Weights</div>
        {FONT_WEIGHTS.map(({ token, value, label }) => (
          <div key={token} className="typeRow">
            <div className="typeMeta">
              <div className="typeToken">{token}</div>
              <div className="typeValue">{value}</div>
            </div>
            <div className="typeSample" style={{ fontWeight: `var(${token})` }}>
              {label} — The quick brown fox jumps over the lazy dog
            </div>
          </div>
        ))}

        <div className="groupTitle" style={{ marginTop: 'var(--spacing-xl)' }}>Line Heights</div>
        {LINE_HEIGHTS.map(({ token, value, label }) => (
          <div key={token} className="typeRow" style={{ alignItems: 'flex-start' }}>
            <div className="typeMeta">
              <div className="typeToken">{token}</div>
              <div className="typeValue">{value}</div>
            </div>
            <div className="typeSample" style={{ lineHeight: `var(${token})`, maxWidth: '400px' }}>
              <strong>{label}</strong><br />
              The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.
            </div>
          </div>
        ))}

        <div className="groupTitle" style={{ marginTop: 'var(--spacing-xl)' }}>Letter Spacing</div>
        {LETTER_SPACINGS.map(({ token, value, label }) => (
          <div key={token} className="typeRow">
            <div className="typeMeta">
              <div className="typeToken">{token}</div>
              <div className="typeValue">{value}</div>
            </div>
            <div className="typeSample" style={{ letterSpacing: `var(${token})`, textTransform: 'uppercase', fontSize: 'var(--font-size-xs)' }}>
              {label}
            </div>
          </div>
        ))}

        <div className="groupTitle" style={{ marginTop: 'var(--spacing-xl)' }}>Font Families</div>
        <div className="typeRow">
          <div className="typeMeta">
            <div className="typeToken">--font-family-base</div>
            <div className="typeValue">Aptos, system-ui</div>
          </div>
          <div className="typeSample" style={{ fontFamily: 'var(--font-family-base)' }}>
            Aptos — ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
          </div>
        </div>
        <div className="typeRow">
          <div className="typeMeta">
            <div className="typeToken">--font-family-mono</div>
            <div className="typeValue">DM Mono, ui-monospace</div>
          </div>
          <div className="typeSample" style={{ fontFamily: 'var(--font-family-mono)' }}>
            DM Mono — ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
          </div>
        </div>
      </div>

      {/* ── SECTION 3 — SPACING ── */}
      <div className="section" id="sec-spacing">
        <div className="sectionTitle">3 — Spacing</div>
        <p className="sectionNote">Click a row to see where the token is used. Empty usage = candidate for removal.</p>
        {SPACING.map(({ token, value, usages }) => {
          const isOpen = expandedSpacing === token
          return (
            <div key={token}>
              <div
                className="spacingRow typeRowExpandable"
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => setExpandedSpacing(isOpen ? null : token)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedSpacing(isOpen ? null : token) } }}
              >
                <div className="spacingMeta">
                  <div className="spacingToken">{token}</div>
                  <div className="spacingValue">{value}</div>
                </div>
                <div className="spacingBar" style={{ width: `var(${token})` }} />
                <span className="typeExpandIcon" aria-hidden="true">{isOpen ? '−' : '+'}</span>
              </div>
              {isOpen && (
                <div className="typeUsages">
                  <div className="typeUsagesLabel">
                    {usages.length > 0 ? 'Used by (' + usages.length + ')' : 'No tracked usage — candidate for removal'}
                  </div>
                  {usages.map((u, i) => (
                    <div key={i} className="typeUsageItem">
                      <span className="typeUsageExample">{u}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── SECTION 4 — RADIUS, SHADOWS, Z-INDEX, TRANSITIONS ── */}
      <div className="section" id="sec-effects">
        <div className="sectionTitle">4 — Radius, Shadows, Z-Index, Transitions</div>

        <div className="groupTitle">Border Radius</div>
        <div className="radiusGrid">
          {RADII.map(({ token, value }) => (
            <div key={token} className="radiusItem">
              <div className="radiusBox" style={{ borderRadius: `var(${token})` }} />
              <div className="radiusToken">{token}</div>
              <div className="radiusToken" style={{ color: 'var(--color-text-placeholder)' }}>{value}</div>
            </div>
          ))}
        </div>

        <div className="groupTitle">Shadows</div>
        <div className="shadowGrid">
          {SHADOWS.map(({ token, value, label }) => (
            <div key={token} className="shadowCard" style={{ boxShadow: `var(${token})` }}>
              <div className="shadowToken" style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>{label}</div>
              <div className="shadowToken" style={{ marginTop: 'var(--spacing-xs)' }}>{token}</div>
              <div className="shadowToken" style={{ marginTop: 'var(--spacing-2xs)', color: 'var(--color-text-placeholder)' }}>{value}</div>
            </div>
          ))}
        </div>

        <div className="groupTitle">Z-Index Scale</div>
        <table className="tokenTable">
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Usage</th>
            </tr>
          </thead>
          <tbody>
            {Z_TOKENS.map(({ token, value, note }) => (
              <tr key={token}>
                <td>{token}</td>
                <td>{value}</td>
                <td style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-base)' }}>{note}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="groupTitle">Transitions</div>
        <table className="tokenTable">
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Usage</th>
              <th>Demo</th>
            </tr>
          </thead>
          <tbody>
            {TRANSITIONS.map(({ token, value, note }) => (
              <tr key={token}>
                <td>{token}</td>
                <td>{value}</td>
                <td style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-base)' }}>{note}</td>
                <td>
                  <div
                    className="transitionDemo"
                    style={{ transition: `opacity var(${token}), transform var(${token})` }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.5'; (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                  >
                    Hover me
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── SECTION 5 — COMPONENTS ── */}
      <div className="section" id="sec-components">
        <div className="sectionTitle">5 — Components</div>

        <div className="groupTitle">AppChip</div>
        <div className="componentRow">
          <div className="componentLabel">Static and removable</div>
          <div className="componentDemo">
            <AppChip label="Engineering" />
            <AppChip label="Sales" onRemove={() => {}} />
            <AppChip label="Marketing" onRemove={() => {}} />
            <AppChip label="Product" />
          </div>
        </div>

        <div className="groupTitle">AppBadge</div>
        <div className="componentRow">
          <div className="componentLabel">All variants — static</div>
          <div className="componentDemo">
            {BADGE_VARIANTS.map(v => (
              <AppBadge
                key={v}
                label={v.charAt(0).toUpperCase() + v.slice(1).replace('-', ' ')}
                variant={v}
              />
            ))}
          </div>
        </div>
        <div className="componentRow">
          <div className="componentLabel">All variants — clickable</div>
          <div className="componentDemo">
            {BADGE_VARIANTS.map(v => (
              <AppBadge
                key={v}
                label={v.charAt(0).toUpperCase() + v.slice(1).replace('-', ' ')}
                variant={v}
                clickable
                onClick={() => {}}
              />
            ))}
          </div>
        </div>

        <div className="groupTitle">SyncDot</div>
        <div className="componentRow">
          <div className="componentLabel">All three states</div>
          <div className="componentDemo">
            {(['syncing', 'ok', 'err'] as const).map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <SyncDot status={s} />
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  {s === 'err' ? 'Error' : s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="groupTitle">CustomPicker</div>
        <div className="componentRow">
          <div className="componentLabel">Single select, searchable</div>
          <div className="componentDemo">
            <CustomPicker
              options={PICKER_OPTIONS}
              selected={pickerVal}
              onChange={v => setPickerVal(Array.isArray(v) ? (v[0] ?? '') : v)}
              searchable
              placeholder="Select color…"
            />
            {pickerVal && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                Selected: {pickerVal}
              </span>
            )}
          </div>
        </div>
        <div className="componentRow">
          <div className="componentLabel">Multi-select, searchable</div>
          <div className="componentDemo">
            <CustomPicker
              options={PICKER_OPTIONS}
              selected={multiVal}
              onChange={v => setMultiVal(Array.isArray(v) ? v : [v])}
              multiSelect
              searchable
              placeholder="Select colors…"
            />
            {multiVal.length > 0 && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                Selected: {multiVal.join(', ')}
              </span>
            )}
          </div>
        </div>

        <div className="groupTitle">AppModal</div>
        <div className="componentRow">
          <div className="componentLabel">ConfirmModal — danger variant</div>
          <div className="componentDemo">
            <button className="btn btn-primary btn--compact" onClick={() => setShowConfirm(true)}>
              Open ConfirmModal
            </button>
          </div>
        </div>
        <div className="componentRow">
          <div className="componentLabel">useAppModal — input prompt / danger</div>
          <div className="componentDemo">
            <button
              className="btn btn-secondary btn--compact"
              onClick={async () => {
                await showModal({ title: 'Add Item', inputPlaceholder: 'Item name', confirmLabel: 'Add', cancelLabel: 'Cancel' })
              }}
            >
              Input prompt
            </button>
            <button
              className="btn btn-secondary btn--compact"
              onClick={async () => {
                await showModal({ title: 'Delete?', message: 'This cannot be undone.', confirmLabel: 'Delete', cancelLabel: 'Cancel', dangerConfirm: true })
              }}
            >
              Danger confirm
            </button>
          </div>
        </div>

        <div className="groupTitle">Buttons</div>
        <div className="componentRow">
          <div className="componentLabel">Standard sizes</div>
          <div className="componentDemo">
            <button className="btn btn-primary">Primary</button>
            <button className="btn btn-secondary">Secondary</button>
            <button className="btn btn-ghost">Ghost</button>
            <button className="btn btn-danger">Danger</button>
          </div>
        </div>
        <div className="componentRow">
          <div className="componentLabel">Compact modifier</div>
          <div className="componentDemo">
            <button className="btn btn-primary btn--compact">Primary</button>
            <button className="btn btn-secondary btn--compact">Secondary</button>
            <button className="btn btn-ghost btn--compact">Ghost</button>
            <button className="btn btn-danger btn--compact">Danger</button>
          </div>
        </div>
        <div className="componentRow">
          <div className="componentLabel">Inline variants</div>
          <div className="componentDemo">
            <button className="btn-link">btn-link</button>
            <button className="btn-dashed btn--compact">btn-dashed</button>
          </div>
        </div>
        <div className="componentRow">
          <div className="componentLabel">Disabled state</div>
          <div className="componentDemo">
            <button className="btn btn-primary" disabled>Primary</button>
            <button className="btn btn-secondary" disabled>Secondary</button>
            <button className="btn btn-ghost" disabled>Ghost</button>
            <button className="btn btn-danger" disabled>Danger</button>
          </div>
        </div>
        <div className="componentRow">
          <div className="componentLabel">Hover &amp; focus</div>
          <div className="componentDemo componentStatesNote">
            Hover and focus-visible are CSS pseudo-states — trigger them live by
            mousing over or tabbing to the default buttons above. Focus ring =
            2px outline in <code>--color-border-focus</code>, offset 1px.
          </div>
        </div>
      </div>

      {/* ── SECTION 6 — LAYOUT TOKENS ── */}
      <div className="section" id="sec-layout">
        <div className="sectionTitle">6 — Layout Tokens</div>
        <p className="sectionNote">Dimension diagrams use actual token values. Horizontal bars = widths, vertical bars = heights, squares = square dimensions.</p>

        <div className="groupTitle">Dimension Tokens</div>
        <div className="layoutDiagrams">
          {LAYOUT_BARS.map(({ token, value, label, color, dir, usages }) => (
            <div key={token} className={'layoutItem layoutItem--' + dir}>
              <div
                className={'layoutBar layoutBar--' + dir}
                style={{
                  ...(dir === 'h' ? { width: `var(${token})`, height: 'var(--spacing-md)' } :
                     dir === 'v' ? { height: `var(${token})`, width: 'var(--spacing-xl)' } :
                     { width: `var(${token})`, height: `var(${token})` }),
                  background: color,
                  borderRadius: 'var(--radius-sm)',
                }}
              />
              <div className="layoutMeta">
                <div className="layoutToken">{token}</div>
                <div className="layoutValue">{value}</div>
                <div className="layoutLabel">{label}</div>
                {usages.map((u, i) => (
                  <div key={i} className="layoutUsage">{u}</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="groupTitle">Component Tokens</div>
        <table className="tokenTable">
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Component</th>
            </tr>
          </thead>
          <tbody>
            {COMPONENT_TOKENS.map(({ token, value, note }) => (
              <tr key={token}>
                <td>{token}</td>
                <td>{value}</td>
                <td style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-base)' }}>{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
