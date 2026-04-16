'use client'
import { useState, useEffect, useCallback } from 'react'
import { loadAllData, upsertAccount, upsertBackground, today } from '@/lib/db'
import type { AppState, Account, Background } from '@/types'

const EMPTY: AppState = {
  accounts: [], engagements: [], stakeholders: [], actions: [],
  notes: [], opportunities: [], projects: [], background: [],
}

export function useAccountsData() {
  const [data, setData] = useState<AppState>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle')

  useEffect(() => {
    loadAllData()
      .then(d => { setData(d); setLoading(false); setSyncState('ok') })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const saveAccount = useCallback(async (account: Account) => {
    setSyncState('syncing')
    setData(prev => ({ ...prev, accounts: prev.accounts.map(a => a.account_id === account.account_id ? account : a) }))
    try {
      await upsertAccount(account)
      setSyncState('ok')
    } catch (e: unknown) {
      setSyncState('error')
      throw e
    }
  }, [])

  const saveBackground = useCallback(async (bg: Background) => {
    setSyncState('syncing')
    setData(prev => ({ ...prev, background: prev.background.map(b => b.background_id === bg.background_id ? bg : b) }))
    try {
      await upsertBackground(bg)
      setSyncState('ok')
    } catch (e: unknown) {
      setSyncState('error')
      throw e
    }
  }, [])

  const addAccount = useCallback(async (name: string) => {
    const rec: Account = {
      account_id: 'ACCT-' + Date.now().toString(36),
      account_name: name,
      client_company: '',
      status: 'Active',
      created_date: today(),
      last_updated: today(),
    }
    setSyncState('syncing')
    setData(prev => ({ ...prev, accounts: [...prev.accounts, rec] }))
    try {
      await upsertAccount(rec)
      setSyncState('ok')
      return rec
    } catch (e: unknown) {
      setSyncState('error')
      setData(prev => ({ ...prev, accounts: prev.accounts.filter(a => a.account_id !== rec.account_id) }))
      throw e
    }
  }, [])

  return { data, setData, loading, error, syncState, saveAccount, saveBackground, addAccount }
}
