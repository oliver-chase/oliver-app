'use client'
import { createContext, useContext } from 'react'

type SyncFn = (state: 'syncing' | 'ok' | 'error') => void

export const SyncContext = createContext<SyncFn>(() => {})
export const useSyncReport = () => useContext(SyncContext)
