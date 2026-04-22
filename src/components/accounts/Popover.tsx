'use client'
import { useEffect, useState, RefObject, ReactNode, CSSProperties } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  anchorRef: RefObject<HTMLElement | null>
  open: boolean
  minWidth?: number
  style?: CSSProperties
  children: ReactNode
}

export function Popover({ anchorRef, open, minWidth = 180, style, children }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    if (!open || !anchorRef.current) { setPos(null); return }
    const update = () => {
      const el = anchorRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, anchorRef])

  if (!open || !pos || typeof document === 'undefined') return null
  return createPortal(
    <div
      className="app-popover"
      style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: Math.max(minWidth, pos.width), ...style }}
    >
      {children}
    </div>,
    document.body,
  )
}
