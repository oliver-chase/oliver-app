/**
 * HR module — chat-driven flows.
 *
 * Mirrors the Accounts flow registry shape: receives the live candidate list
 * + a refetch callback. Each flow is a pure description that OliverDock's
 * runtime walks through.
 *
 * Covered: add-candidate, move-stage, edit-candidate, reject-candidate.
 * Everything writes straight to the `candidates` Supabase table.
 */
import type { OliverFlow } from '@/components/shared/OliverContext'
import type { Candidate } from '@/components/hr/types'
import { supabase } from '@/lib/supabase'

type Ctx = {
  candidates: Candidate[]
  refetch: () => Promise<void> | void
}

const now = () => new Date().toISOString()
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
const STAGE_CHOICES = [
  { label: 'Sourced', value: 'sourced' },
  { label: 'Screening', value: 'screening' },
  { label: 'Interview', value: 'interview' },
  { label: 'Offer', value: 'offer' },
  { label: 'Hired', value: 'hired' },
  { label: 'Rejected', value: 'rejected' },
]

export function buildHrFlows(ctx: Ctx): OliverFlow[] {
  const { candidates, refetch } = ctx

  return [
    {
      id: 'add-candidate',
      label: 'Add Candidate',
      aliases: ['new candidate', 'add applicant', 'log candidate'],
      steps: [
        { id: 'name',   prompt: 'Candidate name?',  kind: 'text', placeholder: 'Full name' },
        { id: 'role',   prompt: "Role they're applying for?", kind: 'text', placeholder: 'e.g. Senior Engineer' },
        { id: 'stage',  prompt: 'Pipeline stage?', kind: 'choice', choices: STAGE_CHOICES.filter(c => c.value !== 'rejected') },
        { id: 'source', prompt: 'Source? (optional)', kind: 'text', placeholder: 'Referral, LinkedIn, …', optional: true },
        { id: 'email',  prompt: 'Email? (optional)', kind: 'text', placeholder: 'email@example.com', optional: true },
      ],
      run: async (answers) => {
        const c: Partial<Candidate> & { id: string; name: string } = {
          id: newId('cand'),
          name: String(answers.name ?? ''),
          role: String(answers.role ?? ''),
          seniority: '', dept: '', source: String(answers.source ?? ''),
          stage: String(answers.stage ?? 'sourced'),
          candStatus: 'Active',
          empType: '', compType: '', compAmount: '',
          city: '', state: '', country: '', client: '',
          email: String(answers.email ?? ''),
          resumeLink: '', skills: '',
          addedAt: now(), updatedAt: now(),
          notes: '', rejectionReason: '',
          offerAmount: '', offerDate: '',
        }
        const { error } = await supabase.from('candidates').insert(c)
        if (error) return 'Insert failed: ' + error.message
        await refetch()
        return `Added ${c.name} as a ${c.stage} candidate for ${c.role}.`
      },
    },
    {
      id: 'move-candidate-stage',
      label: 'Move Candidate Stage',
      aliases: ['change stage', 'advance candidate', 'move pipeline'],
      steps: [
        {
          id: 'candidate_id', prompt: 'Which candidate?', kind: 'entity',
          options: () => candidates.map(c => ({ label: `${c.name} (${c.stage})`, value: c.id })),
        },
        { id: 'stage', prompt: 'New stage?', kind: 'choice', choices: STAGE_CHOICES },
      ],
      run: async (answers) => {
        const id = String(answers.candidate_id)
        const stage = String(answers.stage)
        const patch: Partial<Candidate> = { stage, updatedAt: now() }
        if (stage === 'hired') patch.candStatus = 'Hired'
        if (stage === 'rejected') patch.candStatus = 'Rejected'
        const { error } = await supabase.from('candidates').update(patch).eq('id', id)
        if (error) return 'Update failed: ' + error.message
        await refetch()
        return `Moved to ${stage}.`
      },
    },
    {
      id: 'edit-candidate',
      label: 'Edit Candidate',
      aliases: ['update candidate', 'change candidate'],
      steps: [
        {
          id: 'candidate_id', prompt: 'Which candidate?', kind: 'entity',
          options: () => candidates.map(c => ({ label: c.name, value: c.id })),
        },
        {
          id: 'field', prompt: 'Which field?', kind: 'choice',
          choices: [
            { label: 'Name', value: 'name' },
            { label: 'Role', value: 'role' },
            { label: 'Email', value: 'email' },
            { label: 'Source', value: 'source' },
            { label: 'Notes', value: 'notes' },
            { label: 'Offer amount', value: 'offerAmount' },
          ],
        },
        { id: 'value', prompt: 'New value?', kind: 'text', placeholder: 'New value' },
      ],
      run: async (answers) => {
        const id = String(answers.candidate_id)
        const field = String(answers.field)
        const value = String(answers.value)
        const patch: Record<string, string> = { [field]: value, updatedAt: now() }
        const { error } = await supabase.from('candidates').update(patch).eq('id', id)
        if (error) return 'Update failed: ' + error.message
        await refetch()
        return `Updated ${field}.`
      },
    },
    {
      id: 'reject-candidate',
      label: 'Reject Candidate',
      aliases: ['decline candidate', 'pass on candidate'],
      steps: [
        {
          id: 'candidate_id', prompt: 'Which candidate to reject?', kind: 'entity',
          options: () => candidates.map(c => ({ label: `${c.name} (${c.stage})`, value: c.id })),
        },
        { id: 'reason', prompt: 'Reason? (optional)', kind: 'text', placeholder: 'Not a fit, …', optional: true },
      ],
      run: async (answers) => {
        const id = String(answers.candidate_id)
        const reason = String(answers.reason ?? '')
        const { error } = await supabase.from('candidates')
          .update({ stage: 'rejected', candStatus: 'Rejected', rejectionReason: reason, updatedAt: now() })
          .eq('id', id)
        if (error) return 'Update failed: ' + error.message
        await refetch()
        return 'Marked as rejected.'
      },
    },
  ]
}
