/**
 * HR module — chat-driven flows.
 *
 * Goal: cover all primary HR data-entry surfaces through OliverDock so users
 * can complete writes without leaving the chatbot.
 */
import type { OliverFlow } from '@/components/shared/OliverContext'
import type {
  Assignment,
  Candidate,
  Device,
  Employee,
  HrList,
  Interview,
  OnboardingRun,
  Track,
  TrackTask,
  RunTask,
} from '@/components/hr/types'
import { supabase } from '@/lib/supabase'
import { mergeDeviceReceiptsIntoNotes, parseDeviceReceiptsFromNotes } from '@/lib/hr-assets'

type Ctx = {
  candidates: Candidate[]
  employees: Employee[]
  devices: Device[]
  tracks: Track[]
  tasks: TrackTask[]
  onboardingRuns: OnboardingRun[]
  runTasks: RunTask[]
  lists: HrList[]
  refetch: () => Promise<void> | void
}

const nowIso = () => new Date().toISOString()
const today = () => new Date().toISOString().slice(0, 10)
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
const asString = (v: unknown) => (v == null ? '' : String(v).trim())

const FALLBACK_CAND_STATUS = ['Active', 'On Hold', 'Nurturing', 'Hired', 'Closed']
const FALLBACK_DEVICE_TYPES = ['laptop', 'monitor', 'phone', 'keyboard', 'mouse', 'headset', 'other']
const FALLBACK_INTERVIEW_SCORES = ['Strong Yes', 'Yes', 'Neutral', 'No', 'Strong No']

const STAGE_CHOICES = [
  { label: 'Sourced', value: 'sourced' },
  { label: 'Screening', value: 'screening' },
  { label: 'Interview', value: 'interview' },
  { label: 'Offer', value: 'offer' },
  { label: 'Hired', value: 'hired' },
  { label: 'Rejected', value: 'rejected' },
]

function listValues(lists: HrList[], key: string, fallback: string[]): string[] {
  const vals = lists
    .filter(l => l.listKey === key)
    .sort((a, b) => Number(a.order) - Number(b.order))
    .map(l => l.value)
    .filter(Boolean)
  return vals.length ? vals : fallback
}

function choiceValues(values: string[]) {
  return values.map(v => ({ label: v, value: v }))
}

function normalizeDateInput(value: unknown): string {
  const text = asString(value)
  if (!text) return today()
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : today()
}

export function buildHrFlows(ctx: Ctx): OliverFlow[] {
  const { candidates, employees, devices, tracks, tasks, onboardingRuns, runTasks, lists, refetch } = ctx

  const candStatusChoices = choiceValues(listValues(lists, 'candStatus', FALLBACK_CAND_STATUS))
  const deviceTypeChoices = choiceValues(listValues(lists, 'deviceType', FALLBACK_DEVICE_TYPES))
  const interviewScoreChoices = choiceValues(listValues(lists, 'interviewScore', FALLBACK_INTERVIEW_SCORES))
  const listKeyChoices = choiceValues(['candStatus', 'empType', 'source', 'seniority', 'dept', 'deviceType', 'interviewScore'])

  return [
    {
      id: 'add-candidate',
      label: 'Add Candidate',
      aliases: ['new candidate', 'add applicant', 'log candidate'],
      steps: [
        { id: 'name', prompt: 'Candidate name?', kind: 'text', placeholder: 'Full name' },
        { id: 'role', prompt: "Role they\'re applying for?", kind: 'text', placeholder: 'e.g. Senior Engineer' },
        { id: 'stage', prompt: 'Pipeline stage?', kind: 'choice', choices: STAGE_CHOICES.filter(c => c.value !== 'rejected') },
        { id: 'source', prompt: 'Source? (optional)', kind: 'text', placeholder: 'Referral, LinkedIn, ...', optional: true },
        { id: 'email', prompt: 'Email? (optional)', kind: 'text', placeholder: 'email@example.com', optional: true },
      ],
      run: async (answers) => {
        const c: Partial<Candidate> & { id: string; name: string } = {
          id: newId('cand'),
          name: asString(answers.name),
          role: asString(answers.role),
          seniority: '', dept: '', source: asString(answers.source),
          stage: asString(answers.stage) || 'sourced',
          candStatus: 'Active',
          empType: '', compType: '', compAmount: '',
          city: '', state: '', country: '', client: '',
          email: asString(answers.email),
          resumeLink: '', skills: '',
          addedAt: nowIso(), updatedAt: nowIso(),
          notes: '', rejectionReason: '',
          offerAmount: '', offerDate: '', offerStatus: '',
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
        const id = asString(answers.candidate_id)
        const stage = asString(answers.stage)
        const patch: Partial<Candidate> = { stage, updatedAt: nowIso() }
        if (stage === 'hired') patch.candStatus = 'Hired'
        if (stage === 'rejected') patch.candStatus = 'Rejected'
        const { error } = await supabase.from('candidates').update(patch).eq('id', id)
        if (error) return 'Update failed: ' + error.message
        await refetch()
        return `Moved to ${stage}.`
      },
    },
    {
      id: 'set-candidate-status',
      label: 'Set Candidate Status',
      aliases: ['candidate status', 'set status', 'mark candidate active', 'mark candidate closed'],
      steps: [
        {
          id: 'candidate_id', prompt: 'Which candidate?', kind: 'entity',
          options: () => candidates.map(c => ({ label: `${c.name} (${c.candStatus || 'Unknown'})`, value: c.id })),
        },
        { id: 'status', prompt: 'New candidate status?', kind: 'choice', choices: candStatusChoices },
      ],
      run: async (answers) => {
        const id = asString(answers.candidate_id)
        const status = asString(answers.status)
        const { error } = await supabase.from('candidates').update({ candStatus: status, updatedAt: nowIso() }).eq('id', id)
        if (error) return 'Update failed: ' + error.message
        await refetch()
        return `Candidate status set to ${status}.`
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
        const id = asString(answers.candidate_id)
        const field = asString(answers.field)
        const value = asString(answers.value)
        const patch: Record<string, string> = { [field]: value, updatedAt: nowIso() }
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
        { id: 'reason', prompt: 'Reason? (optional)', kind: 'text', placeholder: 'Not a fit, ...', optional: true },
      ],
      run: async (answers) => {
        const id = asString(answers.candidate_id)
        const reason = asString(answers.reason)
        const { error } = await supabase.from('candidates')
          .update({ stage: 'rejected', candStatus: 'Rejected', rejectionReason: reason, updatedAt: nowIso() })
          .eq('id', id)
        if (error) return 'Update failed: ' + error.message
        await refetch()
        return 'Marked as rejected.'
      },
    },
    {
      id: 'delete-candidate',
      label: 'Delete Candidate',
      aliases: ['remove candidate', 'delete applicant'],
      steps: [
        {
          id: 'candidate_id', prompt: 'Which candidate should be deleted?', kind: 'entity',
          options: () => candidates.map(c => ({ label: `${c.name} (${c.stage})`, value: c.id })),
        },
        {
          id: 'confirm', prompt: 'Confirm delete?', kind: 'choice',
          choices: [{ label: 'Yes, delete', value: 'yes' }, { label: 'No, cancel', value: 'no' }],
        },
      ],
      run: async (answers) => {
        if (asString(answers.confirm) !== 'yes') return 'Cancelled.'
        const id = asString(answers.candidate_id)
        const ivRes = await supabase.from('interviews').delete().eq('candidateId', id)
        if (ivRes.error) return 'Delete failed: ' + ivRes.error.message
        const candRes = await supabase.from('candidates').delete().eq('id', id)
        if (candRes.error) return 'Delete failed: ' + candRes.error.message
        await refetch()
        return 'Candidate deleted (including interviews).'
      },
    },
    {
      id: 'log-interview',
      label: 'Log Interview',
      aliases: ['track interview', 'i interviewed someone', 'interviewed candidate', 'record interview feedback'],
      steps: [
        {
          id: 'candidate_id', prompt: 'Which candidate?', kind: 'entity',
          options: () => candidates.map(c => ({ label: `${c.name} (${c.stage})`, value: c.id })),
        },
        { id: 'date', prompt: 'Interview date? (YYYY-MM-DD, default today)', kind: 'text', placeholder: today(), optional: true },
        { id: 'score', prompt: 'Score? (optional)', kind: 'choice', choices: interviewScoreChoices, optional: true },
        { id: 'interviewers', prompt: 'Interviewer(s)? (optional)', kind: 'text', placeholder: 'Jordan Lee, Nina Patel', optional: true },
        { id: 'notes', prompt: 'Feedback / notes? (optional)', kind: 'text', placeholder: 'Open notes', optional: true },
      ],
      run: async (answers) => {
        const candidateId = asString(answers.candidate_id)
        const now = nowIso()
        const interview: Interview = {
          id: 'IV-' + crypto.randomUUID(),
          candidateId,
          date: normalizeDateInput(answers.date),
          score: asString(answers.score),
          interviewers: asString(answers.interviewers),
          notes: asString(answers.notes),
          created_at: now,
          updated_at: now,
        }
        const ivRes = await supabase.from('interviews').insert(interview)
        if (ivRes.error) return 'Interview log failed: ' + ivRes.error.message
        const candRes = await supabase.from('candidates').update({ updatedAt: now }).eq('id', candidateId)
        if (candRes.error) return 'Interview logged, but candidate touch failed: ' + candRes.error.message
        await refetch()
        return 'Interview logged.'
      },
    },
    {
      id: 'add-employee',
      label: 'Add Employee',
      aliases: ['new employee', 'add team member', 'hire employee'],
      steps: [
        { id: 'name', prompt: 'Employee name?', kind: 'text', placeholder: 'Full name' },
        { id: 'role', prompt: 'Role? (optional)', kind: 'text', placeholder: 'e.g. Recruiter', optional: true },
        { id: 'dept', prompt: 'Department? (optional)', kind: 'text', placeholder: 'e.g. HR', optional: true },
        { id: 'email', prompt: 'Email? (optional)', kind: 'text', placeholder: 'email@example.com', optional: true },
      ],
      run: async (answers) => {
        const now = nowIso()
        const rec: Employee = {
          id: 'EMP-' + crypto.randomUUID(),
          name: asString(answers.name),
          role: asString(answers.role),
          dept: asString(answers.dept),
          status: 'active',
          client: '', location: '', city: '', state: '', country: '',
          manager: '', buddy: '',
          startDate: '', endDate: '',
          email: asString(answers.email),
          source: '',
          created_at: now,
          updated_at: now,
        }
        const { error } = await supabase.from('employees').insert(rec)
        if (error) return 'Insert failed: ' + error.message
        await refetch()
        return `Added employee ${rec.name}.`
      },
    },
    {
      id: 'edit-employee',
      label: 'Edit Employee',
      aliases: ['update employee', 'change employee'],
      steps: [
        {
          id: 'employee_id', prompt: 'Which employee?', kind: 'entity',
          options: () => employees.map(e => ({ label: `${e.name}${e.role ? ' — ' + e.role : ''}`, value: e.id })),
        },
        {
          id: 'field', prompt: 'Which field?', kind: 'choice',
          choices: [
            { label: 'Name', value: 'name' },
            { label: 'Role', value: 'role' },
            { label: 'Department', value: 'dept' },
            { label: 'Manager', value: 'manager' },
            { label: 'Status', value: 'status' },
            { label: 'Email', value: 'email' },
          ],
        },
        { id: 'value', prompt: 'New value?', kind: 'text', placeholder: 'New value' },
      ],
      run: async (answers) => {
        const id = asString(answers.employee_id)
        const field = asString(answers.field)
        const value = asString(answers.value)
        const { error } = await supabase.from('employees').update({ [field]: value, updated_at: nowIso() }).eq('id', id)
        if (error) return 'Update failed: ' + error.message
        await refetch()
        return `Updated ${field}.`
      },
    },
    {
      id: 'delete-employee',
      label: 'Delete Employee',
      aliases: ['remove employee', 'delete team member'],
      steps: [
        {
          id: 'employee_id', prompt: 'Which employee should be deleted?', kind: 'entity',
          options: () => employees.map(e => ({ label: `${e.name}${e.role ? ' — ' + e.role : ''}`, value: e.id })),
        },
        {
          id: 'confirm', prompt: 'Confirm delete?', kind: 'choice',
          choices: [{ label: 'Yes, delete', value: 'yes' }, { label: 'No, cancel', value: 'no' }],
        },
      ],
      run: async (answers) => {
        if (asString(answers.confirm) !== 'yes') return 'Cancelled.'
        const id = asString(answers.employee_id)
        const asgRes = await supabase.from('assignments').delete().eq('employeeId', id)
        if (asgRes.error) return 'Delete failed: ' + asgRes.error.message
        const empRes = await supabase.from('employees').delete().eq('id', id)
        if (empRes.error) return 'Delete failed: ' + empRes.error.message
        await refetch()
        return 'Employee deleted (assignments removed).'
      },
    },
    {
      id: 'start-offboarding',
      label: 'Start Offboarding',
      aliases: ['begin offboarding', 'offboard employee', 'start exit process'],
      steps: [
        {
          id: 'employee_id', prompt: 'Which employee?', kind: 'entity',
          options: () => employees
            .filter(e => e.status !== 'offboarding')
            .map(e => ({ label: `${e.name}${e.role ? ' — ' + e.role : ''}`, value: e.id })),
        },
        {
          id: 'track_id', prompt: 'Which offboarding track?', kind: 'entity',
          options: () => tracks
            .filter(t => t.type === 'offboarding')
            .map(t => ({ label: t.name, value: t.id })),
        },
        { id: 'end_date', prompt: 'Last day? (YYYY-MM-DD)', kind: 'text', placeholder: today() },
      ],
      run: async (answers) => {
        const employeeId = asString(answers.employee_id)
        const trackId = asString(answers.track_id)
        const endDate = normalizeDateInput(answers.end_date)
        const now = nowIso()
        const run: OnboardingRun = {
          id: 'RUN-' + crypto.randomUUID(),
          employeeId,
          trackId,
          type: 'offboarding',
          status: 'active',
          startDate: today(),
          created_at: now,
        }
        const runRes = await supabase.from('onboardingRuns').insert(run)
        if (runRes.error) return 'Offboarding run failed: ' + runRes.error.message
        const empRes = await supabase.from('employees').update({ status: 'offboarding', endDate, updated_at: now }).eq('id', employeeId)
        if (empRes.error) return 'Offboarding run created, but employee update failed: ' + empRes.error.message
        await refetch()
        return 'Offboarding started.'
      },
    },
    {
      id: 'start-onboarding',
      label: 'Start Onboarding',
      aliases: ['begin onboarding', 'onboard employee', 'start onboarding run'],
      steps: [
        {
          id: 'employee_id', prompt: 'Which employee?', kind: 'entity',
          options: () => employees
            .filter(e => e.status !== 'inactive')
            .map(e => ({ label: `${e.name}${e.role ? ' — ' + e.role : ''}`, value: e.id })),
        },
        {
          id: 'track_id', prompt: 'Which onboarding track?', kind: 'entity',
          options: () => tracks
            .filter(t => t.type !== 'offboarding')
            .map(t => ({ label: t.name, value: t.id })),
        },
        { id: 'start_date', prompt: 'Start date? (YYYY-MM-DD, default today)', kind: 'text', placeholder: today(), optional: true },
      ],
      run: async (answers) => {
        const employeeId = asString(answers.employee_id)
        const trackId = asString(answers.track_id)
        const startDate = normalizeDateInput(answers.start_date)
        const now = nowIso()
        const onboardingRun: OnboardingRun = {
          id: 'RUN-' + crypto.randomUUID(),
          employeeId,
          trackId,
          type: 'onboarding',
          status: 'active',
          startDate,
          created_at: now,
        }
        const runRes = await supabase.from('onboardingRuns').insert(onboardingRun)
        if (runRes.error) return 'Onboarding run failed: ' + runRes.error.message
        const templateTasks = tasks
          .filter(t => t.trackId === trackId)
          .sort((a, b) => Number(a.order) - Number(b.order))
        if (templateTasks.length > 0) {
          const newTasks: RunTask[] = templateTasks.map((task) => {
            const due = new Date(startDate + 'T00:00:00')
            due.setDate(due.getDate() + Number(task.dueDaysOffset || '0'))
            return {
              id: 'TASK-' + crypto.randomUUID(),
              runId: onboardingRun.id,
              name: task.name,
              ownerRole: task.ownerRole,
              status: 'pending',
              dueDate: due.toISOString().slice(0, 10),
              created_at: now,
              updated_at: now,
            }
          })
          const taskRes = await supabase.from('runTasks').insert(newTasks)
          if (taskRes.error) return 'Run created, but task provisioning failed: ' + taskRes.error.message
        }
        const empRes = await supabase
          .from('employees')
          .update({ status: 'active', startDate, updated_at: now })
          .eq('id', employeeId)
        if (empRes.error) return 'Run created, but employee update failed: ' + empRes.error.message
        await refetch()
        return 'Onboarding started.'
      },
    },
    {
      id: 'update-run-task',
      label: 'Update Onboarding Task Status',
      aliases: ['complete onboarding task', 'mark task complete', 'set run task status'],
      steps: [
        {
          id: 'run_task_id', prompt: 'Which onboarding/offboarding task?', kind: 'entity',
          options: () => runTasks.map(task => {
            const run = onboardingRuns.find(r => r.id === task.runId)
            const empName = employees.find(e => e.id === run?.employeeId)?.name || 'Unknown'
            return { label: `${empName} — ${task.name} (${task.status})`, value: task.id }
          }),
        },
        {
          id: 'status', prompt: 'Set status to?', kind: 'choice',
          choices: [
            { label: 'pending', value: 'pending' },
            { label: 'completed', value: 'completed' },
          ],
        },
      ],
      run: async (answers) => {
        const taskId = asString(answers.run_task_id)
        const status = asString(answers.status)
        const task = runTasks.find(t => t.id === taskId)
        if (!task) return 'Task not found.'
        const updateRes = await supabase
          .from('runTasks')
          .update({ status, updated_at: nowIso() })
          .eq('id', taskId)
        if (updateRes.error) return 'Task update failed: ' + updateRes.error.message
        if (status === 'completed') {
          const siblings = runTasks.filter(t => t.runId === task.runId)
          const allDone = siblings.length > 0 && siblings.every(t => t.id === taskId ? true : t.status === 'completed')
          if (allDone) {
            await supabase.from('onboardingRuns').update({ status: 'completed' }).eq('id', task.runId)
            const run = onboardingRuns.find(r => r.id === task.runId)
            if (run?.type === 'offboarding') {
              await supabase.from('employees').update({ status: 'inactive', updated_at: nowIso() }).eq('id', run.employeeId)
            }
          }
        }
        await refetch()
        return `Task marked ${status}.`
      },
    },
    {
      id: 'add-track',
      label: 'Add Track',
      aliases: ['new track', 'create onboarding track'],
      steps: [
        { id: 'name', prompt: 'Track name?', kind: 'text', placeholder: 'e.g. Engineering Onboarding' },
        {
          id: 'type', prompt: 'Track type?', kind: 'choice',
          choices: [
            { label: 'company', value: 'company' },
            { label: 'role', value: 'role' },
            { label: 'client', value: 'client' },
            { label: 'offboarding', value: 'offboarding' },
          ],
        },
        {
          id: 'auto_apply', prompt: 'Auto-apply?', kind: 'choice',
          choices: [
            { label: 'No', value: 'false' },
            { label: 'Yes', value: 'true' },
          ],
          optional: true,
        },
      ],
      run: async (answers) => {
        const now = nowIso()
        const track: Track = {
          id: 'TRACK-' + crypto.randomUUID(),
          name: asString(answers.name),
          type: asString(answers.type),
          description: '',
          autoApply: asString(answers.auto_apply) || 'false',
          createdAt: now,
          updated_at: now,
        }
        const { error } = await supabase.from('tracks').insert(track)
        if (error) return 'Track insert failed: ' + error.message
        await refetch()
        return `Track created: ${track.name}.`
      },
    },
    {
      id: 'edit-track',
      label: 'Edit Track',
      aliases: ['update track', 'change track'],
      steps: [
        {
          id: 'track_id', prompt: 'Which track?', kind: 'entity',
          options: () => tracks.map(t => ({ label: `${t.name} (${t.type})`, value: t.id })),
        },
        {
          id: 'field', prompt: 'Which field?', kind: 'choice',
          choices: [
            { label: 'Name', value: 'name' },
            { label: 'Type', value: 'type' },
            { label: 'Auto-apply', value: 'autoApply' },
          ],
        },
        { id: 'value', prompt: 'New value?', kind: 'text', placeholder: 'New value' },
      ],
      run: async (answers) => {
        const id = asString(answers.track_id)
        const field = asString(answers.field)
        const value = asString(answers.value)
        const { error } = await supabase.from('tracks').update({ [field]: value, updated_at: nowIso() }).eq('id', id)
        if (error) return 'Track update failed: ' + error.message
        await refetch()
        return `Track updated (${field}).`
      },
    },
    {
      id: 'delete-track',
      label: 'Delete Track',
      aliases: ['remove track'],
      steps: [
        {
          id: 'track_id', prompt: 'Which track should be deleted?', kind: 'entity',
          options: () => tracks.map(t => ({ label: `${t.name} (${t.type})`, value: t.id })),
        },
        {
          id: 'confirm', prompt: 'Delete track and its template tasks?', kind: 'choice',
          choices: [{ label: 'Yes, delete', value: 'yes' }, { label: 'No, cancel', value: 'no' }],
        },
      ],
      run: async (answers) => {
        if (asString(answers.confirm) !== 'yes') return 'Cancelled.'
        const id = asString(answers.track_id)
        const taskRes = await supabase.from('tasks').delete().eq('trackId', id)
        if (taskRes.error) return 'Delete failed: ' + taskRes.error.message
        const trackRes = await supabase.from('tracks').delete().eq('id', id)
        if (trackRes.error) return 'Delete failed: ' + trackRes.error.message
        await refetch()
        return 'Track deleted.'
      },
    },
    {
      id: 'add-track-task',
      label: 'Add Track Task',
      aliases: ['new track task', 'add onboarding task template'],
      steps: [
        {
          id: 'track_id', prompt: 'For which track?', kind: 'entity',
          options: () => tracks.map(t => ({ label: `${t.name} (${t.type})`, value: t.id })),
        },
        { id: 'name', prompt: 'Task name?', kind: 'text', placeholder: 'e.g. Complete I-9 paperwork' },
        { id: 'owner_role', prompt: 'Owner role? (optional)', kind: 'text', placeholder: 'HR, IT, Manager', optional: true },
        { id: 'due_days_offset', prompt: 'Due in how many days from start?', kind: 'number', placeholder: '1', optional: true },
      ],
      run: async (answers) => {
        const trackId = asString(answers.track_id)
        const now = nowIso()
        const order = tasks.filter(t => t.trackId === trackId).length + 1
        const rec: TrackTask = {
          id: 'TASK-' + crypto.randomUUID(),
          trackId,
          name: asString(answers.name),
          ownerRole: asString(answers.owner_role),
          dueDaysOffset: asString(answers.due_days_offset) || '0',
          order,
          created_at: now,
          updated_at: now,
        }
        const { error } = await supabase.from('tasks').insert(rec)
        if (error) return 'Task insert failed: ' + error.message
        await refetch()
        return 'Track task added.'
      },
    },
    {
      id: 'edit-track-task',
      label: 'Edit Track Task',
      aliases: ['update track task', 'change template task'],
      steps: [
        {
          id: 'task_id', prompt: 'Which track task?', kind: 'entity',
          options: () => tasks.map(task => ({
            label: `${tracks.find(t => t.id === task.trackId)?.name || 'Track'} — ${task.name}`,
            value: task.id,
          })),
        },
        {
          id: 'field', prompt: 'Which field?', kind: 'choice',
          choices: [
            { label: 'Name', value: 'name' },
            { label: 'Owner role', value: 'ownerRole' },
            { label: 'Due days offset', value: 'dueDaysOffset' },
            { label: 'Order', value: 'order' },
          ],
        },
        { id: 'value', prompt: 'New value?', kind: 'text', placeholder: 'New value' },
      ],
      run: async (answers) => {
        const id = asString(answers.task_id)
        const field = asString(answers.field)
        const value = asString(answers.value)
        const payload: Record<string, string | number> = { updated_at: nowIso() }
        payload[field] = field === 'order' ? Number(value) || 1 : value
        const { error } = await supabase.from('tasks').update(payload).eq('id', id)
        if (error) return 'Task update failed: ' + error.message
        await refetch()
        return 'Track task updated.'
      },
    },
    {
      id: 'delete-track-task',
      label: 'Delete Track Task',
      aliases: ['remove track task', 'delete template task'],
      steps: [
        {
          id: 'task_id', prompt: 'Which track task should be deleted?', kind: 'entity',
          options: () => tasks.map(task => ({
            label: `${tracks.find(t => t.id === task.trackId)?.name || 'Track'} — ${task.name}`,
            value: task.id,
          })),
        },
        {
          id: 'confirm', prompt: 'Confirm delete?', kind: 'choice',
          choices: [{ label: 'Yes, delete', value: 'yes' }, { label: 'No, cancel', value: 'no' }],
        },
      ],
      run: async (answers) => {
        if (asString(answers.confirm) !== 'yes') return 'Cancelled.'
        const id = asString(answers.task_id)
        const { error } = await supabase.from('tasks').delete().eq('id', id)
        if (error) return 'Delete failed: ' + error.message
        await refetch()
        return 'Track task deleted.'
      },
    },
    {
      id: 'add-list-item',
      label: 'Add Settings List Item',
      aliases: ['add dropdown value', 'add settings value'],
      steps: [
        { id: 'list_key', prompt: 'Which dropdown list?', kind: 'choice', choices: listKeyChoices },
        { id: 'value', prompt: 'Value to add?', kind: 'text', placeholder: 'New value' },
      ],
      run: async (answers) => {
        const listKey = asString(answers.list_key)
        const value = asString(answers.value)
        if (!value) return 'Value is required.'
        if (lists.find(l => l.listKey === listKey && l.value === value)) return 'That value already exists.'
        const now = nowIso()
        const maxOrder = lists
          .filter(l => l.listKey === listKey)
          .reduce((m, l) => Math.max(m, Number(l.order) || 0), 0)
        const rec: HrList = {
          id: 'LIST-' + crypto.randomUUID(),
          listKey,
          value,
          order: String(maxOrder + 1),
          created_at: now,
          updated_at: now,
        }
        const { error } = await supabase.from('lists').insert(rec)
        if (error) return 'Insert failed: ' + error.message
        await refetch()
        return `Added "${value}" to ${listKey}.`
      },
    },
    {
      id: 'rename-list-item',
      label: 'Rename Settings List Item',
      aliases: ['rename dropdown value', 'edit settings value'],
      steps: [
        {
          id: 'list_item_id', prompt: 'Which list item?', kind: 'entity',
          options: () => lists.map(item => ({ label: `${item.listKey} — ${item.value}`, value: item.id })),
        },
        { id: 'new_value', prompt: 'New value?', kind: 'text', placeholder: 'New value' },
      ],
      run: async (answers) => {
        const id = asString(answers.list_item_id)
        const newValue = asString(answers.new_value)
        const item = lists.find(l => l.id === id)
        if (!item) return 'List item not found.'
        const { error } = await supabase
          .from('lists')
          .update({ value: newValue, updated_at: nowIso() })
          .eq('id', id)
        if (error) return 'Rename failed: ' + error.message
        await refetch()
        return `Renamed "${item.value}" to "${newValue}".`
      },
    },
    {
      id: 'delete-list-item',
      label: 'Delete Settings List Item',
      aliases: ['remove dropdown value', 'delete settings value'],
      steps: [
        {
          id: 'list_item_id', prompt: 'Which list item should be deleted?', kind: 'entity',
          options: () => lists.map(item => ({ label: `${item.listKey} — ${item.value}`, value: item.id })),
        },
        {
          id: 'confirm', prompt: 'Confirm delete?', kind: 'choice',
          choices: [{ label: 'Yes, delete', value: 'yes' }, { label: 'No, cancel', value: 'no' }],
        },
      ],
      run: async (answers) => {
        if (asString(answers.confirm) !== 'yes') return 'Cancelled.'
        const id = asString(answers.list_item_id)
        const { error } = await supabase.from('lists').delete().eq('id', id)
        if (error) return 'Delete failed: ' + error.message
        await refetch()
        return 'List item deleted.'
      },
    },
    {
      id: 'add-device',
      label: 'Add Device',
      aliases: ['new device', 'add hardware', 'log laptop'],
      steps: [
        { id: 'name', prompt: 'Device name?', kind: 'text', placeholder: 'e.g. MacBook Pro 14"' },
        { id: 'type', prompt: 'Device type? (optional)', kind: 'choice', choices: deviceTypeChoices, optional: true },
        { id: 'serial', prompt: 'Serial number? (optional)', kind: 'text', placeholder: 'Serial', optional: true },
        {
          id: 'condition', prompt: 'Condition? (optional)', kind: 'choice', optional: true,
          choices: [
            { label: 'good', value: 'good' },
            { label: 'fair', value: 'fair' },
            { label: 'poor', value: 'poor' },
          ],
        },
      ],
      run: async (answers) => {
        const now = nowIso()
        const rec: Device = {
          id: 'DEV-' + crypto.randomUUID(),
          name: asString(answers.name),
          make: '',
          type: asString(answers.type),
          model: '',
          modelNumber: '',
          serial: asString(answers.serial),
          status: 'available',
          assignedTo: '',
          condition: asString(answers.condition) || 'good',
          purchaseDate: '', purchaseStore: '', orderNumber: '', specs: '',
          location: '', notes: '',
          created_at: now,
          updated_at: now,
        }
        const { error } = await supabase.from('devices').insert(rec)
        if (error) return 'Insert failed: ' + error.message
        await refetch()
        return `Added device ${rec.name}.`
      },
    },
    {
      id: 'edit-device',
      label: 'Edit Device',
      aliases: ['update device', 'change device'],
      steps: [
        {
          id: 'device_id', prompt: 'Which device?', kind: 'entity',
          options: () => devices.map(d => ({ label: `${d.name}${d.serial ? ' — ' + d.serial : ''}`, value: d.id })),
        },
        {
          id: 'field', prompt: 'Which field?', kind: 'choice',
          choices: [
            { label: 'Name', value: 'name' },
            { label: 'Type', value: 'type' },
            { label: 'Serial', value: 'serial' },
            { label: 'Status', value: 'status' },
            { label: 'Condition', value: 'condition' },
            { label: 'Location', value: 'location' },
            { label: 'Notes', value: 'notes' },
          ],
        },
        { id: 'value', prompt: 'New value?', kind: 'text', placeholder: 'New value' },
      ],
      run: async (answers) => {
        const id = asString(answers.device_id)
        const field = asString(answers.field)
        const value = asString(answers.value)
        const patch: Record<string, string> = { [field]: value, updated_at: nowIso() }
        if (field === 'notes') {
          const existing = devices.find(d => d.id === id)
          if (existing) {
            const receiptMeta = parseDeviceReceiptsFromNotes(existing.notes || '')
            patch.notes = mergeDeviceReceiptsIntoNotes(value, receiptMeta.receipts)
          }
        }
        const { error } = await supabase.from('devices').update(patch).eq('id', id)
        if (error) return 'Update failed: ' + error.message
        await refetch()
        return `Updated ${field}.`
      },
    },
    {
      id: 'delete-device',
      label: 'Delete Device',
      aliases: ['remove device', 'delete hardware'],
      steps: [
        {
          id: 'device_id', prompt: 'Which device should be deleted?', kind: 'entity',
          options: () => devices.map(d => ({ label: `${d.name}${d.serial ? ' — ' + d.serial : ''}`, value: d.id })),
        },
        {
          id: 'confirm', prompt: 'Confirm delete?', kind: 'choice',
          choices: [{ label: 'Yes, delete', value: 'yes' }, { label: 'No, cancel', value: 'no' }],
        },
      ],
      run: async (answers) => {
        if (asString(answers.confirm) !== 'yes') return 'Cancelled.'
        const id = asString(answers.device_id)
        const asgRes = await supabase.from('assignments').delete().eq('deviceId', id)
        if (asgRes.error) return 'Delete failed: ' + asgRes.error.message
        const devRes = await supabase.from('devices').delete().eq('id', id)
        if (devRes.error) return 'Delete failed: ' + devRes.error.message
        await refetch()
        return 'Device deleted (assignments removed).'
      },
    },
    {
      id: 'assign-device',
      label: 'Assign Device',
      aliases: ['issue device', 'assign laptop', 'give device'],
      steps: [
        {
          id: 'device_id', prompt: 'Which available device?', kind: 'entity',
          options: () => devices
            .filter(d => d.status !== 'inactive' && !d.assignedTo)
            .map(d => ({ label: `${d.name}${d.serial ? ' — ' + d.serial : ''}`, value: d.id })),
        },
        {
          id: 'employee_id', prompt: 'Assign to which employee?', kind: 'entity',
          options: () => employees
            .filter(e => e.status !== 'offboarding')
            .map(e => ({ label: `${e.name}${e.role ? ' — ' + e.role : ''}`, value: e.id })),
        },
      ],
      run: async (answers) => {
        const deviceId = asString(answers.device_id)
        const employeeId = asString(answers.employee_id)
        const now = nowIso()
        const assignment: Assignment = {
          id: 'ASG-' + crypto.randomUUID(),
          employeeId,
          deviceId,
          assignedAt: now,
          status: 'active',
          returnedAt: '',
          created_at: now,
        }
        const asgRes = await supabase.from('assignments').insert(assignment)
        if (asgRes.error) return 'Assign failed: ' + asgRes.error.message
        const devRes = await supabase.from('devices').update({ status: 'assigned', assignedTo: employeeId, updated_at: now }).eq('id', deviceId)
        if (devRes.error) return 'Assigned, but device update failed: ' + devRes.error.message
        await refetch()
        return 'Device assigned.'
      },
    },
    {
      id: 'return-device',
      label: 'Return Device',
      aliases: ['unassign device', 'device returned', 'check in device'],
      steps: [
        {
          id: 'device_id', prompt: 'Which assigned device?', kind: 'entity',
          options: () => devices
            .filter(d => !!d.assignedTo)
            .map(d => ({
              label: `${d.name}${d.assignedTo ? ' → ' + (employees.find(e => e.id === d.assignedTo)?.name || 'Unknown') : ''}`,
              value: d.id,
            })),
        },
        {
          id: 'new_status', prompt: 'Set device status after return?', kind: 'choice',
          choices: [
            { label: 'available', value: 'available' },
            { label: 'inactive', value: 'inactive' },
          ],
        },
      ],
      run: async (answers) => {
        const deviceId = asString(answers.device_id)
        const newStatus = asString(answers.new_status) || 'available'
        const now = nowIso()
        const asgRes = await supabase
          .from('assignments')
          .update({ status: 'returned', returnedAt: now })
          .eq('deviceId', deviceId)
          .eq('status', 'active')
        if (asgRes.error) return 'Return failed: ' + asgRes.error.message
        const devRes = await supabase.from('devices').update({ status: newStatus, assignedTo: '', updated_at: now }).eq('id', deviceId)
        if (devRes.error) return 'Return failed: ' + devRes.error.message
        await refetch()
        return 'Device returned.'
      },
    },
  ]
}
