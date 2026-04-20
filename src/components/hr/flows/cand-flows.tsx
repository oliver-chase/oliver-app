'use client'
import { supabase } from '@/lib/supabase'
import type { Flow, FlowCtx } from '../step-flow-types'
import type { Interview } from '../types'
import { STAGES, getList } from '../types'
import { PickStep } from './pickFlow'

interface PickDraft { id: string }
interface StatusDraft extends PickDraft { status: string }
interface StageDraft extends PickDraft { stage: string }
interface IvDraft extends PickDraft { date: string; score: string; interviewers: string; notes: string }

function candItems(ctx: FlowCtx) {
  return ctx.db.candidates
    .slice()
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .map(c => ({ id: c.id, name: c.name, sub: c.role + (c.dept ? ' \u00b7 ' + c.dept : '') + (c.candStatus ? ' \u00b7 ' + c.candStatus : '') }))
}

export const editCandidateFlow: Flow<PickDraft> = {
  id: 'edit-candidate',
  title: 'Edit candidate',
  initialDraft: () => ({ id: '' }),
  steps: [
    {
      title: 'Pick a candidate',
      validate: d => d.id ? null : 'Select a candidate to continue',
      render: ({ draft, setDraft, ctx }) => (
        <PickStep
          items={candItems(ctx)}
          selectedId={draft.id}
          onSelect={id => setDraft({ id })}
          emptyMessage="No candidates"
        />
      ),
    },
    {
      title: 'Open editor',
      isFinal: true,
      render: ({ draft, ctx }) => {
        const c = ctx.db.candidates.find(x => x.id === draft.id)
        return <div className="step-flow-confirm-summary">Open the full edit form for <strong>{c?.name}</strong>. Confirm to navigate to Hiring with this candidate selected.</div>
      },
    },
  ],
  finalize: async (draft, ctx) => {
    if (!draft.id) return
    ctx.requestEdit('candidate', draft.id)
  },
}

export const deleteCandidateFlow: Flow<PickDraft> = {
  id: 'delete-candidate',
  title: 'Delete candidate',
  initialDraft: () => ({ id: '' }),
  steps: [
    {
      title: 'Pick a candidate',
      validate: d => d.id ? null : 'Select a candidate to continue',
      render: ({ draft, setDraft, ctx }) => (
        <PickStep
          items={candItems(ctx)}
          selectedId={draft.id}
          onSelect={id => setDraft({ id })}
          emptyMessage="No candidates"
        />
      ),
    },
    {
      title: 'Confirm delete',
      isFinal: true,
      render: ({ draft, ctx }) => {
        const c = ctx.db.candidates.find(x => x.id === draft.id)
        return <div className="step-flow-confirm-summary">Permanently delete <strong>{c?.name}</strong> and all their interviews? This cannot be undone.</div>
      },
    },
  ],
  finalize: async (draft, ctx) => {
    if (!draft.id) return
    const deletedCand = ctx.db.candidates.find(x => x.id === draft.id)
    const deletedIvs  = ctx.db.interviews.filter(iv => iv.candidateId === draft.id)
    ctx.setSyncState('syncing')
    ctx.setDb(prev => ({
      ...prev,
      candidates: prev.candidates.filter(x => x.id !== draft.id),
      interviews: prev.interviews.filter(iv => iv.candidateId !== draft.id),
    }))
    try {
      const ivRes = await supabase.from('interviews').delete().eq('candidateId', draft.id)
      if (ivRes.error) throw ivRes.error
      const candRes = await supabase.from('candidates').delete().eq('id', draft.id)
      if (candRes.error) throw candRes.error
      ctx.setSyncState('ok')
    } catch {
      ctx.setDb(prev => ({
        ...prev,
        candidates: deletedCand && !prev.candidates.some(c => c.id === deletedCand.id) ? [...prev.candidates, deletedCand] : prev.candidates,
        interviews: [...prev.interviews, ...deletedIvs.filter(iv => !prev.interviews.some(x => x.id === iv.id))],
      }))
      ctx.setSyncState('error')
      ctx.refresh().catch(() => {})
    }
  },
}

export const setCandStatusFlow: Flow<StatusDraft> = {
  id: 'set-cand-status',
  title: 'Set candidate status',
  initialDraft: () => ({ id: '', status: '' }),
  steps: [
    {
      title: 'Pick a candidate',
      validate: d => d.id ? null : 'Select a candidate to continue',
      render: ({ draft, setDraft, ctx }) => (
        <PickStep items={candItems(ctx)} selectedId={draft.id} onSelect={id => setDraft({ ...draft, id })} />
      ),
    },
    {
      title: 'Pick new status',
      isFinal: true,
      validate: d => d.status ? null : 'Choose a status',
      render: ({ draft, setDraft, ctx }) => {
        const opts = getList(ctx.db.lists, 'candStatus')
        return (
          <div className="cand-edit-group">
            <label className="app-modal-label">Status</label>
            <select className="app-modal-input" value={draft.status} onChange={e => setDraft({ ...draft, status: e.currentTarget.value })}>
              <option value="">{'\u2014 Choose \u2014'}</option>
              {opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        )
      },
    },
  ],
  finalize: async (draft, ctx) => {
    if (!draft.id || !draft.status) return
    const now = new Date().toISOString()
    ctx.setSyncState('syncing')
    ctx.setDb(prev => ({ ...prev, candidates: prev.candidates.map(c => c.id === draft.id ? { ...c, candStatus: draft.status, updatedAt: now } : c) }))
    try { await supabase.from('candidates').update({ candStatus: draft.status, updatedAt: now }).eq('id', draft.id); ctx.setSyncState('ok') } catch { ctx.setSyncState('error') }
  },
}

export const setCandStageFlow: Flow<StageDraft> = {
  id: 'set-cand-stage',
  title: 'Move candidate stage',
  initialDraft: () => ({ id: '', stage: '' }),
  steps: [
    {
      title: 'Pick a candidate',
      validate: d => d.id ? null : 'Select a candidate to continue',
      render: ({ draft, setDraft, ctx }) => (
        <PickStep items={candItems(ctx)} selectedId={draft.id} onSelect={id => setDraft({ ...draft, id })} />
      ),
    },
    {
      title: 'Pick new stage',
      isFinal: true,
      validate: d => d.stage ? null : 'Choose a stage',
      render: ({ draft, setDraft }) => (
        <div className="cand-edit-group">
          <label className="app-modal-label">Stage</label>
          <select className="app-modal-input" value={draft.stage} onChange={e => setDraft({ ...draft, stage: e.currentTarget.value })}>
            <option value="">{'\u2014 Choose \u2014'}</option>
            {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      ),
    },
  ],
  finalize: async (draft, ctx) => {
    if (!draft.id || !draft.stage) return
    const now = new Date().toISOString()
    ctx.setSyncState('syncing')
    ctx.setDb(prev => ({ ...prev, candidates: prev.candidates.map(c => c.id === draft.id ? { ...c, stage: draft.stage, updatedAt: now } : c) }))
    try { await supabase.from('candidates').update({ stage: draft.stage, updatedAt: now }).eq('id', draft.id); ctx.setSyncState('ok') } catch { ctx.setSyncState('error') }
  },
}

export const logInterviewFlow: Flow<IvDraft> = {
  id: 'log-interview',
  title: 'Log interview',
  initialDraft: () => ({ id: '', date: new Date().toISOString().split('T')[0], score: '', interviewers: '', notes: '' }),
  steps: [
    {
      title: 'Pick a candidate',
      validate: d => d.id ? null : 'Select a candidate to continue',
      render: ({ draft, setDraft, ctx }) => (
        <PickStep items={candItems(ctx)} selectedId={draft.id} onSelect={id => setDraft({ ...draft, id })} />
      ),
    },
    {
      title: 'Interview details',
      isFinal: true,
      validate: d => d.date ? null : 'Date is required',
      render: ({ draft, setDraft, ctx }) => {
        const scores = getList(ctx.db.lists, 'interviewScore')
        return (
          <>
            <div className="cand-edit-group">
              <label className="app-modal-label">Date</label>
              <input className="app-modal-input" type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.currentTarget.value })} />
            </div>
            <div className="cand-edit-group">
              <label className="app-modal-label app-modal-label--spaced">Score</label>
              <select className="app-modal-input" value={draft.score} onChange={e => setDraft({ ...draft, score: e.currentTarget.value })}>
                <option value="">{'\u2014 No score \u2014'}</option>
                {scores.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="cand-edit-group">
              <label className="app-modal-label app-modal-label--spaced">Interviewer(s)</label>
              <input className="app-modal-input" type="text" placeholder="Jordan Lee, Nina Patel" value={draft.interviewers} onChange={e => setDraft({ ...draft, interviewers: e.currentTarget.value })} />
            </div>
            <div className="cand-edit-group">
              <label className="app-modal-label app-modal-label--spaced">Notes</label>
              <textarea className="app-modal-input" rows={3} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.currentTarget.value })} />
            </div>
          </>
        )
      },
    },
  ],
  finalize: async (draft, ctx) => {
    if (!draft.id) return
    const now = new Date().toISOString()
    const iv: Interview = {
      id: 'IV-' + crypto.randomUUID(),
      candidateId: draft.id,
      date: draft.date,
      interviewers: draft.interviewers,
      notes: draft.notes,
      score: draft.score,
      created_at: now,
      updated_at: now,
    }
    ctx.setSyncState('syncing')
    ctx.setDb(prev => ({
      ...prev,
      interviews: [...prev.interviews, iv],
      candidates: prev.candidates.map(c => c.id === draft.id ? { ...c, updatedAt: now } : c),
    }))
    try {
      await supabase.from('interviews').insert(iv)
      await supabase.from('candidates').update({ updatedAt: now }).eq('id', draft.id)
      ctx.setSyncState('ok')
    } catch { ctx.setSyncState('error') }
  },
}

