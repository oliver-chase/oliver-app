'use client'
import { useState, useCallback, useEffect, useRef, useId } from 'react'

interface ModalOpts {
  title: string
  message?: string
  inputPlaceholder?: string
  inputLabel?: string
  secondInputPlaceholder?: string
  secondInputLabel?: string
  confirmLabel?: string
  cancelLabel?: string
  dangerConfirm?: boolean
}

interface ModalResult {
  buttonValue: 'confirm' | 'cancel'
  inputValue: string
  secondInputValue: string
}

interface ActiveModal extends ModalOpts {
  resolve: (r: ModalResult) => void
}

function AppModalUI({
  title, message, inputPlaceholder, inputLabel, secondInputPlaceholder, secondInputLabel,
  confirmLabel = 'OK', cancelLabel = 'Cancel', dangerConfirm = false,
  onConfirm, onCancel,
}: ModalOpts & { onConfirm: (inputValue: string, secondInputValue: string) => void; onCancel: () => void }) {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const secondInputRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const hasTwoInputs = inputPlaceholder !== undefined && secondInputPlaceholder !== undefined
  const [confirmEnabled, setConfirmEnabled] = useState(!hasTwoInputs)

  useEffect(() => {
    ;(inputRef.current ?? confirmRef.current)?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onCancel() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  const checkEnabled = () => {
    if (!hasTwoInputs) return
    const v1 = inputRef.current?.value.trim() || ''
    const v2 = secondInputRef.current?.value.trim() || ''
    setConfirmEnabled(v1.length > 0 && v2.length > 0)
  }

  const submit = () => {
    if (hasTwoInputs && !confirmEnabled) return
    onConfirm(inputRef.current?.value ?? '', secondInputRef.current?.value ?? '')
  }

  return (
    <div
      className="app-modal-overlay"
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="app-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className="app-modal-close" aria-label="Close" onClick={onCancel}>&times;</button>
        <h2 className="app-modal-title" id={titleId}>{title}</h2>
        <div className="app-modal-body">
          {message && <p>{message}</p>}
          {inputPlaceholder !== undefined && (
            <>
              {inputLabel && <label className="app-modal-label">{inputLabel}</label>}
              <input
                ref={inputRef}
                className="app-modal-input"
                type="text"
                placeholder={inputPlaceholder}
                aria-label={inputLabel ?? title}
                onChange={checkEnabled}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); secondInputRef.current ? secondInputRef.current.focus() : submit() } }}
              />
            </>
          )}
          {secondInputPlaceholder !== undefined && (
            <>
              {secondInputLabel && <label className="app-modal-label app-modal-label--spaced">{secondInputLabel}</label>}
              <input
                ref={secondInputRef}
                className="app-modal-input"
                type="text"
                placeholder={secondInputPlaceholder}
                aria-label={secondInputLabel ?? 'Second input'}
                onChange={checkEnabled}
                onKeyDown={e => { if (e.key === 'Enter') submit() }}
              />
            </>
          )}
        </div>
        <div className="app-modal-actions">
          <button className="btn btn-ghost" type="button" onClick={onCancel}>{cancelLabel}</button>
          <button
            ref={confirmRef}
            className={'btn ' + (dangerConfirm ? 'btn-danger' : 'btn-primary')}
            type="button"
            disabled={hasTwoInputs ? !confirmEnabled : false}
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

  const handleConfirm = (inputValue: string, secondInputValue: string) => {
    active?.resolve({ buttonValue: 'confirm', inputValue, secondInputValue })
    setActive(null)
  }

  const handleCancel = () => {
    active?.resolve({ buttonValue: 'cancel', inputValue: '', secondInputValue: '' })
    setActive(null)
  }

  const modal = active ? (
    <AppModalUI {...active} onConfirm={handleConfirm} onCancel={handleCancel} />
  ) : null

  return { modal, showModal }
}
