/**
 * Accounts module — chat-driven flows.
 *
 * Every mutation surface on the Accounts page gets a flow so the user can
 * do everything through the chatbot: add/edit/archive accounts, add/edit
 * stakeholders, log actions/notes/opportunities, promote opportunities to
 * projects, etc. Each flow is a pure description that OliverDock's runtime
 * walks through.
 */
import type { OliverFlow } from '@/components/shared/OliverContext'
import type { Account, Stakeholder, Action, Note, Opportunity, Project } from '@/types'
import { upsertStakeholder, upsertAction, upsertNote, upsertOpportunity, upsertProject, deleteRecord } from '@/lib/db'

type AccountsData = {
  accounts: Account[]
  stakeholders: Stakeholder[]
  actions: Action[]
  notes: Note[]
  opportunities: Opportunity[]
  projects: Project[]
}

type Ctx = {
  data: AccountsData
  currentAccountId: string | null
  addAccount: (name: string, clientCompany?: string) => Promise<{ account_id: string }>
  saveAccount: (account: Account) => Promise<void>
  refetch: () => Promise<void> | void
}

const asString = (v: unknown) => (v == null ? '' : String(v))

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function nowIso() { return new Date().toISOString() }

function accountFor(data: AccountsData, currentId: string | null, picked?: string): Account | null {
  const id = picked || currentId
  return data.accounts.find(a => a.account_id === id) ?? null
}

/** Single source-of-truth flow list for the Accounts module. */
export function buildAccountsFlows(ctx: Ctx): OliverFlow[] {
  const { data, currentAccountId, addAccount, saveAccount, refetch } = ctx

  // Helper step: pick an account, defaulting to the currently-viewed one.
  const pickAccountStep = (optional = false) => ({
    id: 'account_id',
    prompt: 'Which account?' + (currentAccountId ? ` (default: ${data.accounts.find(a => a.account_id === currentAccountId)?.account_name ?? 'current'})` : ''),
    kind: 'entity' as const,
    options: () => data.accounts.map(a => ({ label: a.account_name, value: a.account_id })),
    optional,
    skipIf: () => !!currentAccountId,
  })

  // Resolve the answer if the step was skipped (currentAccountId fallback).
  const resolveAccountId = (answers: Record<string, unknown>): string | null =>
    asString(answers.account_id) || currentAccountId

  return [
    // ─────────────── Account-level ───────────────
    {
      id: 'add-account',
      label: 'Add Account',
      aliases: ['new account', 'create account'],
      steps: [
        { id: 'name',   prompt: "Short name? (e.g. 'NCL')", kind: 'text', placeholder: 'Short name' },
        { id: 'client', prompt: "Full client company name?", kind: 'text', placeholder: 'e.g. Norwegian Cruise Line', optional: true },
      ],
      run: async (answers) => {
        const rec = await addAccount(asString(answers.name), asString(answers.client))
        return `Created ${asString(answers.name)} — switching to it.${rec.account_id ? '' : ''}`
      },
    },
    {
      id: 'edit-account',
      label: 'Edit Account',
      aliases: ['rename account', 'update account'],
      steps: [
        {
          id: 'account_id',
          prompt: 'Which account?',
          kind: 'entity',
          options: () => data.accounts.map(a => ({ label: a.account_name, value: a.account_id })),
        },
        {
          id: 'field',
          prompt: 'Which field?',
          kind: 'choice',
          choices: [
            { label: 'Short name', value: 'account_name' },
            { label: 'Full client company', value: 'client_company' },
            { label: 'Status', value: 'status' },
          ],
        },
        {
          id: 'value',
          prompt: (a) => a.field === 'status' ? 'Active or Archived?' : 'New value?',
          kind: 'text',
          placeholder: 'New value',
        },
      ],
      run: async (answers) => {
        const a = data.accounts.find(x => x.account_id === answers.account_id)
        if (!a) return 'Account not found.'
        const field = asString(answers.field) as keyof Account
        const value = asString(answers.value) as Account[keyof Account]
        await saveAccount({ ...a, [field]: value, last_updated: nowIso() })
        await refetch()
        return `Updated ${field} on ${a.account_name}.`
      },
    },
    {
      id: 'archive-account',
      label: 'Archive / Unarchive Account',
      aliases: ['archive', 'unarchive'],
      steps: [
        {
          id: 'account_id',
          prompt: 'Which account?',
          kind: 'entity',
          options: () => data.accounts.map(a => ({ label: `${a.account_name}${a.status === 'Archived' ? ' (archived)' : ''}`, value: a.account_id })),
        },
      ],
      run: async (answers) => {
        const a = data.accounts.find(x => x.account_id === answers.account_id)
        if (!a) return 'Account not found.'
        const next: Account = { ...a, status: a.status === 'Archived' ? 'Active' : 'Archived', last_updated: nowIso() }
        await saveAccount(next)
        await refetch()
        return `${a.account_name} is now ${next.status}.`
      },
    },

    // ─────────────── Stakeholders ───────────────
    {
      id: 'add-stakeholder',
      label: 'Add Stakeholder',
      aliases: ['new stakeholder', 'add person', 'add contact'],
      steps: [
        pickAccountStep(),
        { id: 'name',     prompt: 'Name?',  kind: 'text', placeholder: 'Full name' },
        { id: 'title',    prompt: 'Title?', kind: 'text', placeholder: 'e.g. VP Digital', optional: true },
        { id: 'org',      prompt: 'Organization?', kind: 'text', placeholder: 'Team / company', optional: true },
        {
          id: 'sentiment', prompt: 'Sentiment?', kind: 'choice',
          choices: [
            { label: 'Champion', value: 'Champion' },
            { label: 'Supporter', value: 'Supporter' },
            { label: 'Neutral', value: 'Neutral' },
            { label: 'Detractor', value: 'Detractor' },
            { label: 'Unknown', value: 'Unknown' },
          ],
          optional: true,
        },
      ],
      run: async (answers) => {
        const accountId = resolveAccountId(answers)
        if (!accountId) return 'No account selected.'
        const s: Stakeholder = {
          stakeholder_id: newId('sh'),
          account_id: accountId, engagement_id: '',
          name: asString(answers.name), title: asString(answers.title),
          department: '', organization: asString(answers.org),
          is_executive: '', sentiment: (asString(answers.sentiment) || 'Unknown') as Stakeholder['sentiment'],
          primary_owner: '', secondary_owner: '', reports_to: '', notes: '',
          created_date: nowIso(), last_updated: nowIso(),
        }
        await upsertStakeholder(s)
        await refetch()
        return `Added ${s.name} as a stakeholder.`
      },
    },
    {
      id: 'edit-stakeholder',
      label: 'Edit Stakeholder',
      aliases: ['update stakeholder', 'change sentiment', 'edit contact'],
      steps: [
        {
          id: 'stakeholder_id',
          prompt: 'Which stakeholder?',
          kind: 'entity',
          options: () => data.stakeholders
            .filter(s => !currentAccountId || s.account_id === currentAccountId)
            .map(s => ({ label: `${s.name}${s.title ? ' — ' + s.title : ''}`, value: s.stakeholder_id })),
        },
        {
          id: 'field',
          prompt: 'Which field?',
          kind: 'choice',
          choices: [
            { label: 'Name', value: 'name' },
            { label: 'Title', value: 'title' },
            { label: 'Organization', value: 'organization' },
            { label: 'Sentiment', value: 'sentiment' },
            { label: 'Notes', value: 'notes' },
          ],
        },
        { id: 'value', prompt: 'New value?', kind: 'text', placeholder: 'New value' },
      ],
      run: async (answers) => {
        const s = data.stakeholders.find(x => x.stakeholder_id === answers.stakeholder_id)
        if (!s) return 'Stakeholder not found.'
        const field = asString(answers.field) as keyof Stakeholder
        const value = asString(answers.value) as Stakeholder[keyof Stakeholder]
        const next: Stakeholder = { ...s, [field]: value, last_updated: nowIso() }
        await upsertStakeholder(next)
        await refetch()
        return `Updated ${field} on ${s.name}.`
      },
    },
    {
      id: 'delete-stakeholder',
      label: 'Delete Stakeholder',
      aliases: ['remove stakeholder', 'remove contact'],
      steps: [
        {
          id: 'stakeholder_id',
          prompt: 'Which stakeholder to remove?',
          kind: 'entity',
          options: () => data.stakeholders
            .filter(s => !currentAccountId || s.account_id === currentAccountId)
            .map(s => ({ label: `${s.name}${s.title ? ' — ' + s.title : ''}`, value: s.stakeholder_id })),
        },
        {
          id: 'confirm', prompt: 'Confirm delete?', kind: 'choice',
          choices: [{ label: 'Yes, delete', value: 'yes' }, { label: 'No, cancel', value: 'no' }],
        },
      ],
      run: async (answers) => {
        if (answers.confirm !== 'yes') return 'Cancelled.'
        const id = asString(answers.stakeholder_id)
        await deleteRecord('stakeholders', 'stakeholder_id', id)
        await refetch()
        return 'Stakeholder removed.'
      },
    },

    // ─────────────── Actions ───────────────
    {
      id: 'add-action',
      label: 'Add Action Item',
      aliases: ['new action', 'new task', 'todo'],
      steps: [
        pickAccountStep(),
        { id: 'description', prompt: 'What needs doing?', kind: 'text', placeholder: 'Action description' },
        { id: 'owner',       prompt: 'Owner?', kind: 'text', placeholder: 'Who owns it', optional: true },
        {
          id: 'status', prompt: 'Status?', kind: 'choice',
          choices: [
            { label: 'Open', value: 'Open' },
            { label: 'In Progress', value: 'In Progress' },
            { label: 'Done', value: 'Done' },
          ],
          optional: true,
        },
      ],
      run: async (answers) => {
        const accountId = resolveAccountId(answers)
        if (!accountId) return 'No account selected.'
        const a: Action = {
          action_id: newId('act'), account_id: accountId, engagement_id: '',
          description: asString(answers.description),
          owner: asString(answers.owner),
          status: (asString(answers.status) || 'Open') as Action['status'],
          closed_date: '', created_date: nowIso(), last_updated: nowIso(),
        }
        await upsertAction(a)
        await refetch()
        return `Logged action: ${a.description}.`
      },
    },
    {
      id: 'edit-action',
      label: 'Edit Action',
      aliases: ['update action', 'change action'],
      steps: [
        {
          id: 'action_id', prompt: 'Which action?', kind: 'entity',
          options: () => data.actions
            .filter(a => !currentAccountId || a.account_id === currentAccountId)
            .map(a => ({ label: `${a.description}${a.status ? ' (' + a.status + ')' : ''}`, value: a.action_id })),
        },
        {
          id: 'field', prompt: 'Which field?', kind: 'choice',
          choices: [
            { label: 'Description', value: 'description' },
            { label: 'Owner', value: 'owner' },
            { label: 'Status', value: 'status' },
          ],
        },
        { id: 'value', prompt: 'New value?', kind: 'text', placeholder: 'New value' },
      ],
      run: async (answers) => {
        const a = data.actions.find(x => x.action_id === answers.action_id)
        if (!a) return 'Action not found.'
        const field = asString(answers.field) as keyof Action
        const value = asString(answers.value) as Action[keyof Action]
        const next: Action = { ...a, [field]: value, last_updated: nowIso() }
        if (field === 'status' && value === 'Done') next.closed_date = nowIso()
        await upsertAction(next)
        await refetch()
        return `Updated ${field} on that action.`
      },
    },
    {
      id: 'mark-action-done',
      label: 'Mark Action Done',
      aliases: ['close action', 'finish action', 'done'],
      steps: [
        {
          id: 'action_id', prompt: 'Which action?', kind: 'entity',
          options: () => data.actions
            .filter(a => a.status !== 'Done' && (!currentAccountId || a.account_id === currentAccountId))
            .map(a => ({ label: a.description, value: a.action_id })),
        },
      ],
      run: async (answers) => {
        const a = data.actions.find(x => x.action_id === answers.action_id)
        if (!a) return 'Action not found.'
        await upsertAction({ ...a, status: 'Done', closed_date: nowIso(), last_updated: nowIso() })
        await refetch()
        return `Marked done: ${a.description}.`
      },
    },

    // ─────────────── Notes ───────────────
    {
      id: 'add-note',
      label: 'Add Note',
      aliases: ['log note', 'new note', 'meeting note'],
      steps: [
        pickAccountStep(),
        { id: 'title', prompt: 'Note title?', kind: 'text', placeholder: 'e.g. Weekly sync 4/22', optional: true },
        { id: 'body',  prompt: "What happened? Paste or describe.", kind: 'text', placeholder: 'Note body' },
      ],
      run: async (answers) => {
        const accountId = resolveAccountId(answers)
        if (!accountId) return 'No account selected.'
        const n: Note = {
          note_id: newId('note'), account_id: accountId, engagement_id: '',
          date: new Date().toISOString().slice(0, 10), type: 'General',
          title: asString(answers.title), template_data: '',
          body: asString(answers.body), transcript_link: '',
          created_date: nowIso(), last_updated: nowIso(),
        }
        await upsertNote(n)
        await refetch()
        return `Note saved${n.title ? ': ' + n.title : '.'}`
      },
    },

    // ─────────────── Opportunities ───────────────
    {
      id: 'add-opportunity',
      label: 'Add Opportunity',
      aliases: ['new opp', 'new opportunity', 'log opp'],
      steps: [
        pickAccountStep(),
        { id: 'description', prompt: 'Short description?', kind: 'text', placeholder: 'e.g. Migrate data lake' },
        { id: 'value',       prompt: 'Estimated value? ($ amount)', kind: 'text', placeholder: '$', optional: true },
        {
          id: 'status', prompt: 'Stage?', kind: 'choice',
          choices: [
            { label: 'Identified', value: 'Identified' },
            { label: 'Pursuing', value: 'Pursuing' },
            { label: 'Won', value: 'Won' },
            { label: 'Lost', value: 'Lost' },
          ],
        },
      ],
      run: async (answers) => {
        const accountId = resolveAccountId(answers)
        if (!accountId) return 'No account selected.'
        const o: Opportunity = {
          opportunity_id: newId('opp'), account_id: accountId, engagement_id: '',
          description: asString(answers.description),
          status: (asString(answers.status) || 'Identified') as Opportunity['status'],
          owners: [], value: asString(answers.value),
          close_date: '', year: String(new Date().getFullYear()),
          notes: '',
          created_date: nowIso(), last_updated: nowIso(),
        }
        await upsertOpportunity(o)
        await refetch()
        return `Opportunity logged: ${o.description}.`
      },
    },
    {
      id: 'edit-opportunity',
      label: 'Edit Opportunity',
      aliases: ['update opp', 'change opp stage'],
      steps: [
        {
          id: 'opportunity_id', prompt: 'Which opportunity?', kind: 'entity',
          options: () => data.opportunities
            .filter(o => !currentAccountId || o.account_id === currentAccountId)
            .map(o => ({ label: `${o.description} (${o.status})`, value: o.opportunity_id })),
        },
        {
          id: 'field', prompt: 'Which field?', kind: 'choice',
          choices: [
            { label: 'Description', value: 'description' },
            { label: 'Stage', value: 'status' },
            { label: 'Value', value: 'value' },
            { label: 'Year', value: 'year' },
            { label: 'Notes', value: 'notes' },
          ],
        },
        { id: 'value', prompt: 'New value?', kind: 'text', placeholder: 'New value' },
      ],
      run: async (answers) => {
        const o = data.opportunities.find(x => x.opportunity_id === answers.opportunity_id)
        if (!o) return 'Opportunity not found.'
        const field = asString(answers.field) as keyof Opportunity
        const value = asString(answers.value) as Opportunity[keyof Opportunity]
        const next = { ...o, [field]: value, last_updated: nowIso() } as Opportunity
        await upsertOpportunity(next)
        await refetch()
        return `Updated ${field} on that opportunity.`
      },
    },
    {
      id: 'promote-opportunity',
      label: 'Promote Opportunity to Project',
      aliases: ['promote opp', 'opp to project', 'convert opportunity'],
      steps: [
        {
          id: 'opportunity_id', prompt: 'Which opportunity?', kind: 'entity',
          options: () => data.opportunities
            .filter(o => o.status !== 'Lost' && (!currentAccountId || o.account_id === currentAccountId))
            .map(o => ({ label: `${o.description} (${o.status})`, value: o.opportunity_id })),
        },
        { id: 'project_name', prompt: 'Project name?', kind: 'text', placeholder: 'Short project name' },
      ],
      run: async (answers) => {
        const o = data.opportunities.find(x => x.opportunity_id === answers.opportunity_id)
        if (!o) return 'Opportunity not found.'
        const p: Project = {
          project_id: newId('proj'), account_id: o.account_id, engagement_id: o.engagement_id,
          project_name: asString(answers.project_name) || o.description,
          status: 'Active',
          client_stakeholder_ids: [],
          notes: o.notes,
          year: o.year || String(new Date().getFullYear()),
          created_date: nowIso(), last_updated: nowIso(),
        }
        await upsertProject(p)
        await upsertOpportunity({ ...o, status: 'Won', last_updated: nowIso() })
        await refetch()
        return `Promoted — ${p.project_name} is now an active project.`
      },
    },
  ]
}
