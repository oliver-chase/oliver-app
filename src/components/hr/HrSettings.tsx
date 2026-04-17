'use client'
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppModal } from '@/components/shared/AppModal'
import { useSoftDelete } from '@/hooks/useSoftDelete'
import type { HrDB, HrList } from './types'
import { getList } from './types'

interface Props {
  db: HrDB
  setDb: React.Dispatch<React.SetStateAction<HrDB>>
  setSyncState: (s: 'ok' | 'syncing' | 'error') => void
}

const LIST_KEYS = [
  { key: 'candStatus', label: 'Candidate Status' },
  { key: 'empType',    label: 'Employment Type' },
  { key: 'source',     label: 'Source' },
  { key: 'seniority',  label: 'Seniority' },
  { key: 'dept',       label: 'Department' },
  { key: 'deviceType', label: 'Device Type' },
  { key: 'interviewScore', label: 'Interview Score' },
]

export default function HrSettings({ db, setDb, setSyncState }: Props) {
  const [tab, setTab]           = useState<'dropdowns' | 'data'>('dropdowns')
  const [newVals, setNewVals]   = useState<Record<string, string>>({})
  const { modal, showModal }    = useAppModal()
  const { softDelete, toastEl } = useSoftDelete<HrList>()

  const dbMulti = useCallback(async (ops: Array<() => PromiseLike<unknown>>) => {
    setSyncState('syncing')
    try { await Promise.all(ops.map(fn => fn())); setSyncState('ok') } catch { setSyncState('error') }
  }, [setSyncState])

  async function addItem(listKey: string) {
    const val = (newVals[listKey] || '').trim()
    if (!val) return
    if (db.lists.find(l => l.listKey === listKey && l.value === val)) return
    const maxOrder = db.lists.filter(l => l.listKey === listKey).reduce((m, l) => Math.max(m, parseInt(l.order) || 0), 0)
    const ts = new Date().toISOString()
    const nl: HrList = { id: crypto.randomUUID(), listKey, value: val, order: String(maxOrder + 1), created_at: ts, updated_at: ts }
    setDb(prev => ({ ...prev, lists: [...prev.lists, nl] }))
    setNewVals(v => ({ ...v, [listKey]: '' }))
    await dbMulti([() => supabase.from('lists').insert(nl)])
  }

  function removeItem(listKey: string, val: string) {
    const item = db.lists.find(l => l.listKey === listKey && l.value === val)
    if (!item) return
    softDelete(item, {
      displayName: val,
      onLocalRemove: () => setDb(prev => ({ ...prev, lists: prev.lists.filter(l => l.id !== item.id) })),
      onLocalRestore: restored => setDb(prev => ({ ...prev, lists: [...prev.lists, restored] })),
      onDeleteRecord: async () => {
        setSyncState('syncing')
        try { await supabase.from('lists').delete().eq('id', item.id); setSyncState('ok') } catch { setSyncState('error') }
      },
    })
  }

  async function renameItem(listKey: string, oldVal: string) {
    const { buttonValue, inputValue } = await showModal({ title: `Rename "${oldVal}"`, inputPlaceholder: oldVal, confirmLabel: 'Save' })
    if (buttonValue !== 'confirm' || !inputValue.trim() || inputValue.trim() === oldVal) return
    const newVal = inputValue.trim()
    const ts = new Date().toISOString()
    const item = db.lists.find(l => l.listKey === listKey && l.value === oldVal)
    setDb(prev => ({
      ...prev,
      lists: prev.lists.map(l => l.listKey === listKey && l.value === oldVal ? { ...l, value: newVal, updated_at: ts } : l),
      candidates: listKey === 'candStatus' ? prev.candidates.map(c => c.candStatus === oldVal ? { ...c, candStatus: newVal } : c)
        : listKey === 'source' ? prev.candidates.map(c => c.source === oldVal ? { ...c, source: newVal } : c)
        : listKey === 'seniority' ? prev.candidates.map(c => c.seniority === oldVal ? { ...c, seniority: newVal } : c)
        : listKey === 'empType' ? prev.candidates.map(c => c.empType === oldVal ? { ...c, empType: newVal } : c)
        : prev.candidates,
      employees: listKey === 'dept' ? prev.employees.map(e => e.dept === oldVal ? { ...e, dept: newVal } : e) : prev.employees,
      devices: listKey === 'deviceType' ? prev.devices.map(d => d.type === oldVal ? { ...d, type: newVal } : d) : prev.devices,
    }))
    if (!item) return
    const saves: Array<() => PromiseLike<unknown>> = [() => supabase.from('lists').upsert({ ...item, value: newVal, updated_at: ts })]
    await dbMulti(saves)
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `hr-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  return (
    <div className="page">
      {modal}
      {toastEl}

      <div className="page-header">
        <div><div className="page-title">Settings</div></div>
      </div>

      <div className="tabs">
        <div className={'tab' + (tab === 'dropdowns' ? ' active' : '')} onClick={() => setTab('dropdowns')}>Dropdowns</div>
        <div className={'tab' + (tab === 'data' ? ' active' : '')} onClick={() => setTab('data')}>Data &amp; Export</div>
      </div>

      {tab === 'dropdowns' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {LIST_KEYS.map(({ key, label }) => {
            const vals = getList(db.lists, key)
            return (
              <div key={key} className="card">
                <div className="settings-label">{label}</div>
                <div className="tag-list" id={'tags-' + key}>
                  {vals.map((v, i) => (
                    <span key={i} className="tag">
                      {v}
                      <button onClick={() => renameItem(key, v)} title="Rename" className="tag-rename-btn">
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 2l4 4-6 6H4v-4l6-6z"/></svg>
                      </button>
                      <button onClick={() => removeItem(key, v)}>&times;</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <input
                    className="form-input settings-input-sm"
                    placeholder="Add value..."
                    style={{ flex: 1, padding: '6px 10px' }}
                    value={newVals[key] || ''}
                    onChange={e => setNewVals(v => ({ ...v, [key]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') addItem(key) }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => addItem(key)}>Add</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'data' && (
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="settings-label" style={{ marginBottom: 6 }}>Database</div>
          <p className="modal-body-p" style={{ marginBottom: 24 }}>All data is stored in Supabase. Use the Export JSON button below to create a local backup.</p>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <div className="settings-label" style={{ marginBottom: 6 }}>Export JSON Backup</div>
            <p className="modal-body-p" style={{ marginBottom: 12 }}>Download a full backup of all your data.</p>
            <button className="btn btn-secondary" onClick={exportData}>Export JSON</button>
          </div>
        </div>
      )}
    </div>
  )
}
