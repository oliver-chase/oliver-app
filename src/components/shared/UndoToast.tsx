'use client'
import { useEffect, useRef } from 'react'

interface UndoToastProps {
  message: string
  duration?: number
  onUndo: () => void
  onExpire: () => void
}

export default function UndoToast({ message, duration = 5000, onUndo, onExpire }: UndoToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<HTMLDivElement>(null)
  const resolvedRef = useRef(false)

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (!resolvedRef.current) { resolvedRef.current = true; onExpire() }
    }, duration)
    requestAnimationFrame(() => {
      if (countdownRef.current) {
        countdownRef.current.style.transitionDuration = duration + 'ms'
        countdownRef.current.style.width = '0%'
      }
    })
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUndo = () => {
    if (resolvedRef.current) return
    resolvedRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    onUndo()
  }

  return (
    <div className="app-toast-container" role="status" aria-live="polite">
      <div className="app-toast">
        <span>{message}</span>
        <button type="button" className="app-toast-undo" onClick={handleUndo}>Undo</button>
        <div ref={countdownRef} className="app-toast-countdown" style={{ width: '100%' }} />
      </div>
    </div>
  )
}
