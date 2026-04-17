'use client'
import { useState, useCallback } from 'react'
import UndoToast from '@/components/shared/UndoToast'

interface SoftDeleteOpts<T> {
  displayName: string
  onLocalRemove: (item: T) => void
  onLocalRestore: (item: T) => void
  onDeleteRecord: (item: T) => Promise<void>
}

interface PendingDelete<T> {
  item: T
  message: string
  opts: SoftDeleteOpts<T>
}

export function useSoftDelete<T>() {
  const [pending, setPending] = useState<PendingDelete<T> | null>(null)

  const softDelete = useCallback((item: T, opts: SoftDeleteOpts<T>) => {
    opts.onLocalRemove(item)
    setPending({ item, message: `Deleted "${opts.displayName}"`, opts })
  }, [])

  const handleUndo = () => {
    if (!pending) return
    pending.opts.onLocalRestore(pending.item)
    setPending(null)
  }

  const handleExpire = async () => {
    if (!pending) return
    const { item, opts } = pending
    setPending(null)
    try { await opts.onDeleteRecord(item) } catch (e) { console.error('[softDelete] failed:', e) }
  }

  const toastEl = pending ? (
    <UndoToast message={pending.message} onUndo={handleUndo} onExpire={handleExpire} />
  ) : null

  return { softDelete, toastEl }
}
