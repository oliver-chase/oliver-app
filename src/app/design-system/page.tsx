'use client'

import { useState } from 'react'
import Link from 'next/link'
import AppChip from '@/components/shared/AppChip'
import AppBadge from '@/components/shared/AppBadge'
import SyncDot from '@/components/shared/SyncDot'
import CustomPicker from '@/components/shared/CustomPicker'
import ConfirmModal from '@/components/shared/ConfirmModal'
import { useAppModal } from '@/components/shared/AppModal'
import './ds.css'

// ── Color token groups ──────────────────────────────────────────────────────

const COLOR_GROUPS = [
  {
    group: 'Brand',
    tokens: [
      { name: '--color-brand-purple',       value: '#532976' },
      { name: '--color-brand-purple-light', value: '#6b3895' },
      { name: '--color-brand-purple-dark',  value: '#3d1f5c' },
      { name: '--color-brand-pink',         value: '#E60075' },
      { name: '--color-brand-pink-light',   value: '#fce4f0' },
    ],
  },
  {
    group: 'Text',
    tokens: [
      { name: '--color-text-primary',     value: '#1a1a1a' },
      { name: '--color-text-secondary',   value: '#6c6c6f' },
      { name: '--color-text-placeholder', value: '#767679' },
      { name: '--color-text-inverse',     value: '#FEFFFF' },
    ],
  },
  {
    group: 'Backgrounds',
    tokens: [
      { name: '--color-bg-page',  value: '#f5f5f6' },
      { name: '--color-bg-card',  value: '#FEFFFF' },
      { name: '--color-bg-input', value: '#FEFFFF' },
      { name: '--color-bg-hover', value: '#f0f0f1' },
    ],
  },
  {
    group: 'Borders',
    tokens: [
      { name: '--color-border',        value: '#e0e0e2' },
      { name: '--color-border-focus',  value: '#E60075' },
      { name: '--color-border-dashed', value: '#E60075' },
    ],
  },
  {
    group: 'Sentiment',
    tokens: [
      { name: '--color-sentiment-champion',     value: '#532976' },
      { name: '--color-sentiment-champion-bg',  value: '#efe7f5' },
      { name: '--color-sentiment-supporter',    value: '#532976' },
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
      { name: '--color-status-active',        value: '#532976' },
      { name: '--color-status-active-bg',     value: '#ece3f3' },
      { name: '--color-status-complete',      value: '#5a5a5d' },
      { name: '--color-status-complete-bg',   value: '#f5f5f6' },
      { name: '--color-status-open',          value: '#532976' },
      { name: '--color-status-open-bg',       value: '#ebe3f2' },
      { name: '--color-status-lost',          value: '#5a5a5d' },
      { name: '--color-status-lost-bg',       value: '#f5f5f6' },
      { name: '--color-status-pursuing',      value: '#532976' },
      { name: '--color-status-pursuing-bg',   value: '#fce4f0' },
      { name: '--color-status-won',           value: '#FEFFFF' },
      { name: '--color-status-won-bg',        value: '#532976' },
      { name: '--color-status-success',       value: '#065f46' },
      { name: '--color-status-success-bg',    value: '#d1fae5' },
    ],
  },
  {
    group: 'Tier',
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
      { name: '--color-nav-bg',       value: '#532976' },
      { name: '--color-nav-bg-deep',  value: '#3d1f5c' },
      { name: '--color-nav-text',     value: '#FEFFFF' },
      { name: '--color-nav-accent',   value: '#E60075' },
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
    ],
  },
]

// ── Typography ──────────────────────────────────────────────────────────────

const FONT_SIZES = [
  { token: '--font-size-xs',      value: '13px', label: 'XS' },
  { token: '--font-size-sm',      value: '14px', label: 'SM' },
  { token: '--font-size-base',    value: '15px', label: 'Base' },
  { token: '--font-size-lg',      value: '17px', label: 'LG' },
  { token: '--font-size-xl',      value: '20px', label: 'XL' },
  { token: '--font-size-2xl',     value: '24px', label: '2XL' },
  { token: '--font-size-display', value: '26px', label: 'Display' },
]

const FONT_WEIGHTS = [
  { token: '--font-weight-normal',   value: '400', label: 'Normal' },
  { token: '--font-weight-medium',   value: '500', label: 'Medium' },
  { token: '--font-weight-semibold', value: '600', label: 'Semibold' },
  { token: '--font-weight-bold',     value: '700', label: 'Bold' },
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
  { token: '--spacing-lg',  value: '24px' },
  { token: '--spacing-xl',  value: '32px' },
  { token: '--spacing-2xl', value: '48px' },
]

// ── Shadows ─────────────────────────────────────────────────────────────────

const SHADOWS = [
  { token: '--shadow-card',       value: '0 2px 8px rgba(0,0,0,.06)',   label: 'Card' },
  { token: '--shadow-card-hover', value: '0 4px 16px rgba(0,0,0,.10)', label: 'Card Hover' },
  { token: '--shadow-popover',    value: '0 4px 12px rgba(0,0,0,.12)', label: 'Popover' },
  { token: '--shadow-modal',      value: '0 4px 20px rgba(0,0,0,.15)', label: 'Modal' },
]

// ── Radius ──────────────────────────────────────────────────────────────────

const RADII = [
  { token: '--radius-sm',   value: '4px' },
  { token: '--radius-md',   value: '8px' },
  { token: '--radius-lg',   value: '12px' },
  { token: '--radius-xl',   value: '16px' },
  { token: '--radius-full', value: '9999px' },
]

// ── Z-index ─────────────────────────────────────────────────────────────────

const Z_TOKENS = [
  { token: '--z-org-svg', value: '0',   note: 'SVG connector layer' },
  { token: '--z-base',    value: '1',   note: 'Default stacking' },
  { token: '--z-topbar',  value: '40',  note: 'calc(sidebar - 10)' },
  { token: '--z-sidebar', value: '50',  note: 'Nav sidebar' },
  { token: '--z-popover', value: '100', note: 'Dropdowns, pickers' },
  { token: '--z-modal',   value: '200', note: 'Modal overlays' },
  { token: '--z-toast',   value: '300', note: 'Toast notifications' },
]

const TRANSITIONS = [
  { token: '--transition-fast', value: '150ms ease', note: 'Micro-interactions' },
  { token: '--transition-base', value: '250ms ease', note: 'Standard' },
  { token: '--transition-slow', value: '300ms ease', note: 'Deliberate reveals' },
]

// ── Badge variants ──────────────────────────────────────────────────────────

const BADGE_VARIANTS = [
  'active', 'complete', 'pursuing', 'won', 'lost', 'identified', 'open', 'on-hold',
] as const

// ── Picker options ──────────────────────────────────────────────────────────

const PICKER_OPTIONS = [
  { value: 'purple', label: 'Purple' },
  { value: 'pink', label: 'Pink' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'amber', label: 'Amber' },
]

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

      {/* SECTION 1 — COLOR TOKENS */}
      <div className="section">
        <div className="sectionTitle">Color Tokens</div>
        {COLOR_GROUPS.map(({ group, tokens }) => (
          <div key={group}>
            <div className="groupTitle">{group}</div>
            <div className="swatchGrid">
              {tokens.map(({ name, value }) => (
                <div key={name} className="swatchCard">
                  <div
                    className="swatchBlock"
                    style={{ background: `var(${name})`, border: name.includes('inverse') || name.includes('nav-text') || name.includes('won') && !name.includes('bg') ? '1px solid var(--color-border)' : undefined }}
                  />
                  <div className="swatchMeta">
                    <div className="swatchName">{name}</div>
                    <div className="swatchValue">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* SECTION 2 — TYPOGRAPHY */}
      <div className="section">
        <div className="sectionTitle">Typography</div>

        <div className="groupTitle">Font Sizes</div>
        {FONT_SIZES.map(({ token, value, label }) => (
          <div key={token} className="typeRow">
            <div className="typeMeta">
              <div className="typeToken">{token}</div>
              <div className="typeValue">{value}</div>
            </div>
            <div className="typeSample" style={{ fontSize: `var(${token})` }}>
              {label} — The quick brown fox jumps over the lazy dog
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

      {/* SECTION 3 — SPACING */}
      <div className="section">
        <div className="sectionTitle">Spacing</div>
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

      {/* SECTION 4 — COMPONENTS */}
      <div className="section">
        <div className="sectionTitle">Components</div>

        <div className="groupTitle">AppChip</div>
        <div className="componentRow">
          <div className="componentLabel">AppChip — with and without remove</div>
          <div className="componentDemo">
            <AppChip label="Engineering" />
            <AppChip label="Sales" onRemove={() => {}} />
            <AppChip label="Marketing" onRemove={() => {}} />
            <AppChip label="Product" />
          </div>
        </div>

        <div className="groupTitle">AppBadge</div>
        <div className="componentRow">
          <div className="componentLabel">AppBadge — all variants</div>
          <div className="componentDemo">
            {BADGE_VARIANTS.map(v => (
              <AppBadge key={v} label={v.charAt(0).toUpperCase() + v.slice(1)} variant={v} />
            ))}
          </div>
        </div>
        <div className="componentRow">
          <div className="componentLabel">AppBadge — clickable</div>
          <div className="componentDemo">
            <AppBadge label="Active" variant="active" clickable onClick={() => {}} />
            <AppBadge label="Won" variant="won" clickable onClick={() => {}} />
            <AppBadge label="Open" variant="open" clickable onClick={() => {}} />
          </div>
        </div>

        <div className="groupTitle">SyncDot</div>
        <div className="componentRow">
          <div className="componentLabel">SyncDot — syncing / ok / err</div>
          <div className="componentDemo" style={{ gap: 'var(--spacing-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <SyncDot status="syncing" />
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Syncing</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <SyncDot status="ok" />
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>OK</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <SyncDot status="err" />
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Error</span>
            </div>
          </div>
        </div>

        <div className="groupTitle">CustomPicker</div>
        <div className="componentRow">
          <div className="componentLabel">CustomPicker — single select, searchable</div>
          <div className="componentDemo">
            <CustomPicker
              options={PICKER_OPTIONS}
              selected={pickerVal}
              onChange={v => setPickerVal(Array.isArray(v) ? v[0] ?? '' : v)}
              searchable
              placeholder="Select color…"
            />
          </div>
        </div>
        <div className="componentRow">
          <div className="componentLabel">CustomPicker — multi select</div>
          <div className="componentDemo">
            <CustomPicker
              options={PICKER_OPTIONS}
              selected={multiVal}
              onChange={v => setMultiVal(Array.isArray(v) ? v : [v])}
              multiSelect
              searchable
              placeholder="Select colors…"
            />
          </div>
        </div>

        <div className="groupTitle">Modals</div>
        <div className="componentRow">
          <div className="componentLabel">ConfirmModal — danger variant</div>
          <div className="componentDemo">
            <button className="btn btn-primary btn--compact" onClick={() => setShowConfirm(true)}>
              Open ConfirmModal
            </button>
          </div>
        </div>
        <div className="componentRow">
          <div className="componentLabel">AppModal — input prompt</div>
          <div className="componentDemo">
            <button
              className="btn btn-secondary btn--compact"
              onClick={async () => {
                await showModal({ title: 'Add Item', inputPlaceholder: 'Item name', confirmLabel: 'Add', cancelLabel: 'Cancel' })
              }}
            >
              Open Input Modal
            </button>
            <button
              className="btn btn-secondary btn--compact"
              onClick={async () => {
                await showModal({ title: 'Delete?', message: 'This cannot be undone.', confirmLabel: 'Delete', cancelLabel: 'Cancel', dangerConfirm: true })
              }}
            >
              Open Danger Modal
            </button>
          </div>
        </div>

        <div className="groupTitle">Buttons</div>
        <div className="componentRow">
          <div className="componentLabel">btn-primary / btn-secondary / btn-link / btn--compact</div>
          <div className="componentDemo">
            <button className="btn btn-primary">Primary</button>
            <button className="btn btn-secondary">Secondary</button>
            <button className="btn btn-primary btn--compact">Compact Primary</button>
            <button className="btn btn-secondary btn--compact">Compact Secondary</button>
            <button className="btn-link">Link button</button>
          </div>
        </div>
      </div>

      {/* SECTION 5 — SHADOWS AND RADIUS */}
      <div className="section">
        <div className="sectionTitle">Shadows &amp; Radius</div>

        <div className="groupTitle">Shadows</div>
        <div className="shadowGrid">
          {SHADOWS.map(({ token, value, label }) => (
            <div key={token} className="shadowCard" style={{ boxShadow: `var(${token})` }}>
              <div className="shadowToken">{label}</div>
              <div className="shadowToken" style={{ marginTop: 'var(--spacing-xs)', color: 'var(--color-text-placeholder)' }}>{token}</div>
              <div className="shadowToken" style={{ marginTop: 'var(--spacing-2xs)', color: 'var(--color-text-placeholder)' }}>{value}</div>
            </div>
          ))}
        </div>

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
      </div>

      {/* SECTION 6 — Z-INDEX AND TRANSITIONS */}
      <div className="section">
        <div className="sectionTitle">Z-Index &amp; Transitions</div>

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
    </div>
  )
}
