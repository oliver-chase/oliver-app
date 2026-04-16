'use client'
import { useState, useRef, useEffect } from 'react'

interface PickerProps {
  value: string
  options: string[]
  placeholder?: string
  triggerClass?: string
  onChange: (v: string) => void
}

export function Picker({ value, options, placeholder = '—', triggerClass = 'picker-btn', onChange }: PickerProps) {
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

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button className={triggerClass} onClick={() => setOpen(o => !o)}>
        {value || <span className="picker-placeholder">{placeholder}</span>}
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
  onChange: (v: string[]) => void
}

export function MultiPicker({ values, options, placeholder = 'None', onChange }: MultiPickerProps) {
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

  const toggle = (opt: string) => {
    if (values.includes(opt)) onChange(values.filter(v => v !== opt))
    else onChange([...values, opt])
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button className="picker-btn" onClick={() => setOpen(o => !o)}>
        {values.length ? values.join(', ') : <span className="picker-placeholder">{placeholder}</span>}
      </button>
      {open && (
        <div className="app-popover" style={{ minWidth: 180 }}>
          <div className="app-popover-list">
            {options.map(opt => (
              <div
                key={opt}
                className={'app-popover-item' + (values.includes(opt) ? ' selected' : '')}
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
