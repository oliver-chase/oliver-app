'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import AppChip from '@/components/shared/AppChip'
import AppBadge from '@/components/shared/AppBadge'
import SyncDot from '@/components/shared/SyncDot'
import CustomPicker from '@/components/shared/CustomPicker'
import ConfirmModal from '@/components/shared/ConfirmModal'
import { useAppModal } from '@/components/shared/AppModal'
import './ds.css'

// ── Copy helper ─────────────────────────────────────────────────────────────

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
      { name: '--color-tier-growth',      value: '#1a6fb5' },
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
      { name: '--color-blue',        value: '#1a6fb5' },
      { name: '--color-blue-light',  value: '#e8f2fc' },
      { name: '--color-chart-bar',   value: 'rgba(86,42,167,.25)' },
    ],
  },
]

// ── Typography ──────────────────────────────────────────────────────────────

const FONT_SIZES = [
  { token: '--font-size-3xs',     value: '9px',  label: '3XS' },
  { token: '--font-size-2xs',     value: '11px', label: '2XS' },
  { token: '--font-size-xs',      value: '13px', label: 'XS' },
  { token: '--font-size-sm',      value: '14px', label: 'SM' },
  { token: '--font-size-md',      value: '16px', label: 'MD' },
  { token: '--font-size-base',    value: '15px', label: 'Base' },
  { token: '--font-size-lg',      value: '17px', label: 'LG' },
  { token: '--font-size-xl',      value: '20px', label: 'XL' },
  { token: '--font-size-2xl',     value: '24px', label: '2XL' },
  { token: '--font-size-display', value: '26px', label: 'Display' },
  { token: '--font-size-hero',    value: '48px', label: 'Hero' },
  { token: '--font-size-hero-sm', value: '36px', label: 'Hero SM' },
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

const SPACING = [
  { token: '--spacing-2xs', value: '2px' },
  { token: '--spacing-3',   value: '3px' },
  { token: '--spacing-xs',  value: '4px' },
  { token: '--spacing-6',   value: '6px' },
  { token: '--spacing-7',   value: '7px' },
  { token: '--spacing-sm',  value: '8px' },
  { token: '--spacing-10',  value: '10px' },
  { token: '--spacing-12',  value: '12px' },
  { token: '--spacing-14',  value: '14px' },
  { token: '--spacing-md',  value: '16px' },
  { token: '--spacing-20',  value: '20px' },
  { token: '--spacing-lg',  value: '24px' },
  { token: '--spacing-xl',  value: '32px' },
  { token: '--spacing-2xl', value: '48px' },
  { token: '--spacing-56',  value: '56px' },
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
  { token: '--sidebar-w',          value: '220px',  label: 'Sidebar width',       color: 'var(--color-brand-purple)',      dir: 'h' as const },
  { token: '--chatbot-drawer-w',   value: '360px',  label: 'Chatbot panel width', color: 'var(--color-status-active-bg)',  dir: 'h' as const },
  { token: '--hub-card-max-w',     value: '420px',  label: 'Hub card max-width',  color: 'var(--color-purple-overlay)',    dir: 'h' as const },
  { token: '--topbar-h',           value: '50px',   label: 'Topbar height',       color: 'var(--color-brand-pink)',       dir: 'v' as const },
  { token: '--filterbar-h',        value: '52px',   label: 'Filterbar height',    color: 'var(--color-brand-pink-light)', dir: 'v' as const },
  { token: '--touch-target',       value: '44px',   label: 'Touch target (WCAG)', color: 'var(--color-green)',             dir: 'v' as const },
  { token: '--avatar-size',        value: '34px',   label: 'Avatar size',         color: 'var(--color-blue)',              dir: 'sq' as const },
  { token: '--chatbot-trigger-size', value: '48px', label: 'Chatbot trigger',     color: 'var(--color-amber)',             dir: 'sq' as const },
  { token: '--org-node-w',         value: '220px',  label: 'Org node width',      color: 'var(--color-tier-strategic)',   dir: 'h' as const },
  { token: '--sync-dot-size',      value: '7px',    label: 'Sync dot',            color: 'var(--color-green)',             dir: 'sq' as const },
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

export default function DesignSystemPage() {
  const { modal, showModal } = useAppModal()
  const [pickerVal, setPickerVal] = useState('')
  const [multiVal, setMultiVal] = useState<string[]>([])
  const [showConfirm, setShowConfirm] = useState(false)

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

      {/* ── SECTION 1 — COLOR TOKENS ── */}
      <div className="section">
        <div className="sectionTitle">1 — Color Tokens</div>
        <p className="sectionNote">Click a token name to copy it to clipboard.</p>
        {COLOR_GROUPS.map(({ group, tokens }) => (
          <div key={group}>
            <div className="groupTitle">{group}</div>
            <div className="swatchGrid">
              {tokens.map(({ name, value }) => (
                <div key={name} className="swatchCard">
                  <div
                    className="swatchBlock"
                    style={{
                      background: `var(${name})`,
                      border: (name.includes('inverse') || name.includes('won') && !name.includes('bg') || name.includes('nav-text') || value === '#FEFFFF')
                        ? '1px solid var(--color-border)'
                        : undefined,
                    }}
                  />
                  <div className="swatchMeta">
                    <CopyToken name={name} />
                    <div className="swatchValue">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── SECTION 2 — TYPOGRAPHY ── */}
      <div className="section">
        <div className="sectionTitle">2 — Typography</div>

        <div className="groupTitle">Font Sizes</div>
        {FONT_SIZES.map(({ token, value, label }) => (
          <div key={token} className="typeRow">
            <div className="typeMeta">
              <div className="typeToken">{token}</div>
              <div className="typeValue">{value}</div>
            </div>
            <div className="typeSample" style={{ fontSize: `var(${token})` }}>
              {label} — The quick brown fox
            </div>
          </div>
        ))}

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
      <div className="section">
        <div className="sectionTitle">3 — Spacing</div>
        {SPACING.map(({ token, value }) => (
          <div key={token} className="spacingRow">
            <div className="spacingMeta">
              <div className="spacingToken">{token}</div>
              <div className="spacingValue">{value}</div>
            </div>
            <div className="spacingBar" style={{ width: `var(${token})` }} />
          </div>
        ))}
      </div>

      {/* ── SECTION 4 — RADIUS, SHADOWS, Z-INDEX, TRANSITIONS ── */}
      <div className="section">
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
      <div className="section">
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
      </div>

      {/* ── SECTION 6 — LAYOUT TOKENS ── */}
      <div className="section">
        <div className="sectionTitle">6 — Layout Tokens</div>
        <p className="sectionNote">Dimension diagrams use actual token values. Horizontal bars = widths, vertical bars = heights, squares = square dimensions.</p>

        <div className="groupTitle">Dimension Tokens</div>
        <div className="layoutDiagrams">
          {LAYOUT_BARS.map(({ token, value, label, color, dir }) => (
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
