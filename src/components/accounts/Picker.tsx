'use client'
import { useState, useRef, useEffect, CSSProperties } from 'react'
import { toArray } from '@/lib/db'

interface PickerProps {
  value: string
  options: string[]
  placeholder?: string
  triggerClass?: string
  triggerStyle?: CSSProperties
  showUnassigned?: boolean
  unassignedLabel?: string
  onChange: (v: string) => void
}

export function Picker({
  value, options, placeholder = '—', triggerClass = 'picker-btn', triggerStyle,
  showUnassigned = true, unassignedLabel = 'Unassigned', onChange,
}: PickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    setOpen(o => !o)
    setQuery('')
    setActiveIndex(-1)
    setTimeout(() => searchRef.current?.focus(), 0)
  }

  const realOpts = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options

  const showUnassignedRow = showUnassigned && (
    !query || unassignedLabel.toLowerCase().includes(query.toLowerCase())
  )

  const totalItems = realOpts.length + (showUnassignedRow ? 1 : 0)
  const isEmpty = !value
  const cls = triggerClass + (isEmpty ? ' picker-placeholder' : '')

  return (
    <div ref={ref} className="picker-wrap">
      <button className={cls} style={triggerStyle} onClick={handleOpen}>
        {value || placeholder}
      </button>
      {open && (
        <div className="app-popover" style={{ minWidth: 160 }}>
          <input
            ref={searchRef}
            className="app-popover-search"
            placeholder="Search…"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(-1) }}
            onKeyDown={e => {
              if (e.key === 'Escape') { setOpen(false); setQuery('') }
              if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, totalItems - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
              if (e.key === 'Enter') {
                if (activeIndex >= 0 && activeIndex < realOpts.length) {
                  onChange(realOpts[activeIndex]); setOpen(false); setQuery(''); setActiveIndex(-1)
                } else if (activeIndex === realOpts.length && showUnassignedRow) {
                  onChange(''); setOpen(false); setQuery(''); setActiveIndex(-1)
                } else if (realOpts.length === 1) {
                  onChange(realOpts[0]); setOpen(false); setQuery('')
                }
              }
            }}
          />
          <div className="app-popover-list">
            {realOpts.map((opt, i) => (
              <div
                key={opt}
                className={'app-popover-item' + (opt === value ? ' selected' : '') + (i === activeIndex ? ' active' : '')}
                onMouseDown={e => { e.preventDefault(); onChange(opt); setOpen(false); setQuery('') }}
              >
                {opt}
              </div>
            ))}
            {realOpts.length === 0 && !showUnassignedRow && (
              <div className="app-popover-empty">No matches</div>
            )}
            {showUnassignedRow && (
              <div
                className={'app-popover-item app-popover-item--unassigned' + (!value ? ' selected' : '') + (activeIndex === realOpts.length ? ' active' : '')}
                onMouseDown={e => { e.preventDefault(); onChange(''); setOpen(false); setQuery('') }}
              >
                {unassignedLabel}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface MultiPickerProps {
  values: string[]
  options: string[]
  placeholder?: string
  triggerClass?: string
  triggerStyle?: CSSProperties
  onChange: (v: string[]) => void
}

export function MultiPicker({
  values, options, placeholder = '—', triggerClass = 'card-owner-btn', triggerStyle, onChange,
}: MultiPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const safeValues = toArray(values)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    setOpen(o => !o)
    setQuery('')
    setActiveIndex(-1)
    setTimeout(() => searchRef.current?.focus(), 0)
  }

  const toggle = (opt: string) => {
    onChange(safeValues.includes(opt) ? safeValues.filter(v => v !== opt) : [...safeValues, opt])
  }

  const filtered = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options

  const isEmpty = safeValues.length === 0
  const cls = triggerClass + (isEmpty ? ' picker-placeholder' : '')

  return (
    <div ref={ref} className="picker-wrap">
      <button className={cls} style={triggerStyle} onClick={handleOpen}>
        {safeValues.length ? safeValues.join(', ') : placeholder}
      </button>
      {open && (
        <div className="app-popover" style={{ minWidth: 180 }}>
          <input
            ref={searchRef}
            className="app-popover-search"
            placeholder="Search…"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(-1) }}
            onKeyDown={e => {
              if (e.key === 'Escape') { setOpen(false); setQuery('') }
              if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
              if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < filtered.length) {
                e.preventDefault(); toggle(filtered[activeIndex])
              }
            }}
          />
          <div className="app-popover-list">
            {filtered.map((opt, i) => (
              <div
                key={opt}
                className={'app-popover-item' + (safeValues.includes(opt) ? ' selected' : '') + (i === activeIndex ? ' active' : '')}
                onMouseDown={e => { e.preventDefault(); toggle(opt) }}
              >
                {opt}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="app-popover-empty">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
