'use client'
import { useState, useCallback, useEffect, useRef, useId } from 'react'

interface ModalOpts {
  title: string
  message?: string
  inputPlaceholder?: string
  confirmLabel?: string
  cancelLabel?: string
  dangerConfirm?: boolean
}

interface ModalResult {
  buttonValue: 'confirm' | 'cancel'
  inputValue: string
}

interface ActiveModal extends ModalOpts {
  resolve: (r: ModalResult) => void
}

function AppModalUI({
  title, message, inputPlaceholder,
  confirmLabel = 'OK', cancelLabel = 'Cancel', dangerConfirm = false,
  onConfirm, onCancel,
}: ModalOpts & { onConfirm: (inputValue: string) => void; onCancel: () => void }) {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    ;(inputRef.current ?? confirmRef.current)?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onCancel() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  const submit = () => onConfirm(inputRef.current?.value ?? '')

  return (
    <div
      className="app-modal-overlay"
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="app-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 className="app-modal-title" id={titleId}>{title}</h2>
        <div className="app-modal-body">
          {message && <p>{message}</p>}
          {inputPlaceholder !== undefined && (
            <input
              ref={inputRef}
              className="app-modal-input"
              type="text"
              placeholder={inputPlaceholder}
              aria-label={title}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
            />
          )}
        </div>
        <div className="app-modal-actions">
          <button className="btn btn-ghost" type="button" onClick={onCancel}>{cancelLabel}</button>
          <button
            ref={confirmRef}
            className={'btn ' + (dangerConfirm ? 'btn-danger' : 'btn-primary')}
            type="button"
            onClick={submit}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function useAppModal() {
  const [active, setActive] = useState<ActiveModal | null>(null)

  const showModal = useCallback((opts: ModalOpts): Promise<ModalResult> => {
    return new Promise(resolve => setActive({ ...opts, resolve }))
  }, [])

  const handleConfirm = (inputValue: string) => {
    active?.resolve({ buttonValue: 'confirm', inputValue })
    setActive(null)
  }

  const handleCancel = () => {
    active?.resolve({ buttonValue: 'cancel', inputValue: '' })
    setActive(null)
  }

  const modal = active ? (
    <AppModalUI {...active} onConfirm={handleConfirm} onCancel={handleCancel} />
  ) : null

  return { modal, showModal }
}
