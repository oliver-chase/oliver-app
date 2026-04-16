'use client'
import { useState, useRef, useEffect, CSSProperties } from 'react'
import { toArray } from '@/lib/db'

interface PickerProps {
  value: string
  options: string[]
  placeholder?: string
  triggerClass?: string
  triggerStyle?: CSSProperties
  onChange: (v: string) => void
}

export function Picker({ value, options, placeholder = '—', triggerClass = 'picker-btn', triggerStyle, onChange }: PickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const isEmpty = !value
  const cls = triggerClass + (isEmpty ? ' picker-placeholder' : '')

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button className={cls} style={triggerStyle} onClick={() => setOpen(o => !o)}>
        {value || placeholder}
      </button>
      {open && (
        <div className="app-popover" style={{ minWidth: 160 }}>
          <div className="app-popover-list">
            {options.map(opt => (
              <div
                key={opt}
                className={'app-popover-item' + (opt === value ? ' selected' : '')}
                onMouseDown={e => { e.preventDefault(); onChange(opt); setOpen(false) }}
              >
                {opt}
              </div>
            ))}
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

export function MultiPicker({ values, options, placeholder = '—', triggerClass = 'card-owner-btn', triggerStyle, onChange }: MultiPickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const safeValues = toArray(values)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = (opt: string) => {
    onChange(safeValues.includes(opt) ? safeValues.filter(v => v !== opt) : [...safeValues, opt])
  }

  const isEmpty = safeValues.length === 0
  const cls = triggerClass + (isEmpty ? ' picker-placeholder' : '')

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button className={cls} style={triggerStyle} onClick={() => setOpen(o => !o)}>
        {safeValues.length ? safeValues.join(', ') : placeholder}
      </button>
      {open && (
        <div className="app-popover" style={{ minWidth: 180 }}>
          <div className="app-popover-list">
            {options.map(opt => (
              <div
                key={opt}
                className={'app-popover-item' + (safeValues.includes(opt) ? ' selected' : '')}
                onMouseDown={e => { e.preventDefault(); toggle(opt) }}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
