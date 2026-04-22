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

  const refetch = useCallback(async () => {
    setSyncState('syncing')
    try {
      const d = await loadAllData()
      setData(d)
      setSyncState('ok')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setSyncState('error')
    }
  }, [])

  useEffect(() => {
    loadAllData()
      .then(d => { setData(d); setLoading(false); setSyncState('ok') })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const saveAccount = useCallback(async (account: Account) => {
    let prevAccount: Account | undefined
    setSyncState('syncing')
    setData(prev => {
      prevAccount = prev.accounts.find(a => a.account_id === account.account_id)
      return { ...prev, accounts: prev.accounts.map(a => a.account_id === account.account_id ? account : a) }
    })
    try {
      await upsertAccount(account)
      setSyncState('ok')
    } catch (e: unknown) {
      setSyncState('error')
      if (prevAccount) {
        const reverted = prevAccount
        setData(prev => ({ ...prev, accounts: prev.accounts.map(a => a.account_id === reverted.account_id ? reverted : a) }))
      }
      throw e
    }
  }, [])

  const saveBackground = useCallback(async (bg: Background) => {
    let prevBg: Background | undefined
    setSyncState('syncing')
    setData(prev => {
      prevBg = prev.background.find(b => b.background_id === bg.background_id)
      return { ...prev, background: prev.background.map(b => b.background_id === bg.background_id ? bg : b) }
    })
    try {
      await upsertBackground(bg)
      setSyncState('ok')
    } catch (e: unknown) {
      setSyncState('error')
      if (prevBg) {
        const reverted = prevBg
        setData(prev => ({ ...prev, background: prev.background.map(b => b.background_id === reverted.background_id ? reverted : b) }))
      }
      throw e
    }
  }, [])

  const addAccount = useCallback(async (name: string, clientCompany = '') => {
    const rec: Account = {
      account_id: 'ACCT-' + crypto.randomUUID(),
      account_name: name,
      client_company: clientCompany,
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

  const reportSync = (s: 'syncing' | 'ok' | 'error') => setSyncState(s)

  return { data, setData, loading, error, syncState, reportSync, saveAccount, saveBackground, addAccount, refetch }
}
