'use client'
import { useEffect, useRef, useId } from 'react'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmModal({
  title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', onConfirm, onCancel,
}: Props) {
  const titleId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { cancelRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onCancel() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="app-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="app-modal" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 className="app-modal-title" id={titleId}>{title}</h2>
        <div className="app-modal-body">
          <p>{message}</p>
        </div>
        <div className="app-modal-actions">
          <button ref={cancelRef} className="btn btn-ghost" type="button" onClick={onCancel}>{cancelLabel}</button>
          <button className="btn btn-danger" type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
