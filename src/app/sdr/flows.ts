/**
 * SDR module — chat-driven flows.
 *
 * Covers: edit-prospect (change status/track/notes), approve-draft,
 * reject-draft, log-call (note on prospect).
 *
 * Prospects and drafts come from the already-loaded SdrPage state; writes
 * go through the existing Supabase tables (sdr_prospects, sdr_approval_items)
 * and the /api/sdr-approve endpoint for draft approval.
 */
import type { OliverFlow } from '@/components/shared/OliverContext'
import type { SdrProspect, SdrApprovalItem } from '@/components/sdr/types'
import { supabase } from '@/lib/supabase'

type Ctx = {
  prospects: SdrProspect[]
  approvalItems: SdrApprovalItem[]
  refetch: () => Promise<void> | void
}

const now = () => new Date().toISOString()

export function buildSdrFlows(ctx: Ctx): OliverFlow[] {
  const { prospects, approvalItems, refetch } = ctx

  return [
    {
      id: 'edit-prospect',
      label: 'Edit Prospect',
      aliases: ['update prospect', 'change prospect', 'edit lead'],
      steps: [
        {
          id: 'prospect_id', prompt: 'Which prospect?', kind: 'entity',
          options: () => prospects.map(p => ({ label: `${p.fn || p.nm} — ${p.co}`, value: p.id })),
        },
        {
          id: 'field', prompt: 'Which field?', kind: 'choice',
          choices: [
            { label: 'Status', value: 'st' },
            { label: 'Track', value: 'tr' },
            { label: 'Signal', value: 'sig' },
            { label: 'Industry', value: 'ind' },
            { label: 'Size', value: 'sz' },
            { label: 'Last comment', value: 'lc' },
            { label: 'Next follow-up', value: 'nfu' },
          ],
        },
        { id: 'value', prompt: 'New value?', kind: 'text', placeholder: 'New value' },
      ],
      run: async (answers) => {
        const id = String(answers.prospect_id)
        const field = String(answers.field)
        const value = String(answers.value)
        const { error } = await supabase
          .from('sdr_prospects')
          .update({ [field]: value, lu: now() })
          .eq('id', id)
        if (error) return 'Update failed: ' + error.message
        await refetch()
        return `Updated ${field} on that prospect.`
      },
    },
    {
      id: 'log-prospect-call',
      label: 'Log Prospect Call',
      aliases: ['log call', 'record call', 'prospect note'],
      steps: [
        {
          id: 'prospect_id', prompt: 'Which prospect?', kind: 'entity',
          options: () => prospects.map(p => ({ label: `${p.fn || p.nm} — ${p.co}`, value: p.id })),
        },
        { id: 'note', prompt: 'What happened on the call?', kind: 'text', placeholder: 'Summary' },
      ],
      run: async (answers) => {
        const id = String(answers.prospect_id)
        const note = String(answers.note)
        const p = prospects.find(x => x.id === id)
        const prev = p?.lc ?? ''
        const merged = prev ? `${prev}\n---\n${new Date().toLocaleDateString()} — ${note}` : note
        const { error } = await supabase
          .from('sdr_prospects')
          .update({ lc: merged, lu: now() })
          .eq('id', id)
        if (error) return 'Update failed: ' + error.message
        await refetch()
        return 'Call logged.'
      },
    },
    {
      id: 'approve-draft',
      label: 'Approve Draft',
      aliases: ['approve email', 'ship draft'],
      steps: [
        {
          id: 'draft_id', prompt: 'Which draft?', kind: 'entity',
          options: () => approvalItems
            .filter(d => d.status !== 'approved' && d.status !== 'rejected')
            .map(d => ({ label: `${d.fn || d.nm} — ${d.subject?.slice(0, 48) ?? 'no subject'}`, value: d.id })),
        },
      ],
      run: async (answers) => {
        const id = String(answers.draft_id)
        const res = await fetch('/api/sdr-approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action: 'approve' }),
        })
        if (!res.ok) return 'Approval failed.'
        await refetch()
        return 'Draft approved — will send on the next batch.'
      },
    },
    {
      id: 'reject-draft',
      label: 'Reject Draft',
      aliases: ['decline draft', 'reject email'],
      steps: [
        {
          id: 'draft_id', prompt: 'Which draft?', kind: 'entity',
          options: () => approvalItems
            .filter(d => d.status !== 'approved' && d.status !== 'rejected')
            .map(d => ({ label: `${d.fn || d.nm} — ${d.subject?.slice(0, 48) ?? 'no subject'}`, value: d.id })),
        },
        { id: 'reason', prompt: 'Reason? (optional)', kind: 'text', placeholder: 'Tone, relevance, …', optional: true },
      ],
      run: async (answers) => {
        const id = String(answers.draft_id)
        const { error } = await supabase
          .from('sdr_approval_items')
          .update({ status: 'rejected' })
          .eq('id', id)
        if (error) return 'Update failed: ' + error.message
        await refetch()
        return 'Draft rejected.'
      },
    },
  ]
}
