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
import type { Account, Stakeholder, Action, Note, Opportunity, Project, Background } from '@/types'
import { upsertStakeholder, upsertAction, upsertNote, upsertOpportunity, upsertProject, upsertBackground, deleteRecord } from '@/lib/db'
import { downloadAccountExport, type AccountExportOptions } from '@/lib/accounts-export'

type AccountsData = {
  accounts: Account[]
  stakeholders: Stakeholder[]
  actions: Action[]
  notes: Note[]
  opportunities: Opportunity[]
  projects: Project[]
  background: Background[]
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
  const resolveAccount = (answers: Record<string, unknown>) =>
    accountFor(data, currentAccountId, asString(answers.account_id))
  const asYes = (value: unknown) => asString(value) === 'yes'
  const getBackground = (accountId: string) =>
    data.background.find(b => b.account_id === accountId && !b.engagement_id) ?? null
  const ensureBackground = (accountId: string): Background => (
    getBackground(accountId) ?? {
      background_id: newId('bg'),
      account_id: accountId,
      engagement_id: '',
      overview: '',
      strategic_context: '',
      delivery_model: '',
      key_dates: '',
      account_director: '',
      account_manager: '',
      account_team: '',
      next_meeting: '',
      account_tier: '',
      meeting_title: '',
      meeting_frequency: '',
      meeting_day: '',
      meeting_attendees: '',
      meeting_interval: '',
      next_meeting_override: '',
      revenue: {},
      created_date: nowIso(),
      last_updated: nowIso(),
    }
  )

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
    {
      id: 'export-data',
      label: 'Export Data',
      aliases: ['export account plan', 'export pdf', 'download account brief'],
      steps: [
        pickAccountStep(),
        {
          id: 'preset',
          prompt: 'What export do you need?',
          kind: 'choice',
          choices: [
            { label: 'Weekly Brief', value: 'weekly' },
            { label: 'Executive Readout', value: 'exec' },
            { label: 'Full Account Plan', value: 'full' },
            { label: 'Custom Export', value: 'custom' },
          ],
        },
        {
          id: 'include_actions',
          prompt: 'Include actions?',
          kind: 'choice',
          choices: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }],
          skipIf: answers => asString(answers.preset) !== 'custom',
        },
        {
          id: 'include_notes',
          prompt: 'Include notes?',
          kind: 'choice',
          choices: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }],
          skipIf: answers => asString(answers.preset) !== 'custom',
        },
        {
          id: 'note_mode',
          prompt: 'Which note scope?',
          kind: 'choice',
          choices: [{ label: 'Latest note only', value: 'latest' }, { label: 'All notes', value: 'all' }],
          skipIf: answers => asString(answers.preset) !== 'custom' || !asYes(answers.include_notes),
        },
        {
          id: 'include_overview',
          prompt: 'Include overview and revenue?',
          kind: 'choice',
          choices: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }],
          skipIf: answers => asString(answers.preset) !== 'custom',
        },
        {
          id: 'include_projects',
          prompt: 'Include projects?',
          kind: 'choice',
          choices: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }],
          skipIf: answers => asString(answers.preset) !== 'custom',
        },
        {
          id: 'include_opportunities',
          prompt: 'Include opportunities?',
          kind: 'choice',
          choices: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }],
          skipIf: answers => asString(answers.preset) !== 'custom',
        },
        {
          id: 'include_people',
          prompt: 'Include people and org coverage?',
          kind: 'choice',
          choices: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }],
          skipIf: answers => asString(answers.preset) !== 'custom',
        },
      ],
      run: async (answers) => {
        const account = resolveAccount(answers)
        if (!account) return 'No account selected.'
        const preset = asString(answers.preset)
        let options: AccountExportOptions
        if (preset === 'weekly') {
          options = {
            includeActions: true,
            includeNotes: true,
            noteMode: 'latest',
            includeOverview: false,
            includeProjects: false,
            includeOpportunities: false,
            includePeople: false,
            useCaseLabel: 'Weekly brief',
          }
        } else if (preset === 'exec') {
          options = {
            includeActions: true,
            includeNotes: true,
            noteMode: 'latest',
            includeOverview: true,
            includeProjects: false,
            includeOpportunities: true,
            includePeople: false,
            useCaseLabel: 'Executive readout',
          }
        } else if (preset === 'full') {
          options = {
            includeActions: true,
            includeNotes: true,
            noteMode: 'all',
            includeOverview: true,
            includeProjects: true,
            includeOpportunities: true,
            includePeople: true,
            useCaseLabel: 'Full account plan',
          }
        } else {
          options = {
            includeActions: asYes(answers.include_actions),
            includeNotes: asYes(answers.include_notes),
            noteMode: asString(answers.note_mode) === 'all' ? 'all' : 'latest',
            includeOverview: asYes(answers.include_overview),
            includeProjects: asYes(answers.include_projects),
            includeOpportunities: asYes(answers.include_opportunities),
            includePeople: asYes(answers.include_people),
            useCaseLabel: 'Custom export',
          }
        }
        const doc = downloadAccountExport(data, account.account_id, options)
        return `Downloaded ${doc.fileName}. It is a print-ready HTML export for ${account.account_name}; open it in a browser and Print to save as PDF if needed.`
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
    {
      id: 'delete-action',
      label: 'Delete Action',
      aliases: ['remove action', 'delete task'],
      steps: [
        {
          id: 'action_id', prompt: 'Which action should be deleted?', kind: 'entity',
          options: () => data.actions
            .filter(a => !currentAccountId || a.account_id === currentAccountId)
            .map(a => ({ label: `${a.description}${a.status ? ' (' + a.status + ')' : ''}`, value: a.action_id })),
        },
        {
          id: 'confirm', prompt: 'Confirm delete?', kind: 'choice',
          choices: [{ label: 'Yes, delete', value: 'yes' }, { label: 'No, cancel', value: 'no' }],
        },
      ],
      run: async (answers) => {
        if (asString(answers.confirm) !== 'yes') return 'Cancelled.'
        const id = asString(answers.action_id)
        await deleteRecord('actions', 'action_id', id)
        await refetch()
        return 'Action deleted.'
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
    {
      id: 'edit-note',
      label: 'Edit Note',
      aliases: ['update note', 'change note'],
      steps: [
        {
          id: 'note_id', prompt: 'Which note?', kind: 'entity',
          options: () => data.notes
            .filter(n => !currentAccountId || n.account_id === currentAccountId)
            .map(n => ({ label: `${n.date} — ${n.title || '(untitled)'}`, value: n.note_id })),
        },
        {
          id: 'field', prompt: 'Which field?', kind: 'choice',
          choices: [
            { label: 'Title', value: 'title' },
            { label: 'Body', value: 'body' },
            { label: 'Date', value: 'date' },
            { label: 'Type', value: 'type' },
          ],
        },
        { id: 'value', prompt: 'New value?', kind: 'text', placeholder: 'New value' },
      ],
      run: async (answers) => {
        const note = data.notes.find(n => n.note_id === answers.note_id)
        if (!note) return 'Note not found.'
        const field = asString(answers.field) as keyof Note
        const value = asString(answers.value) as Note[keyof Note]
        await upsertNote({ ...note, [field]: value, last_updated: nowIso() })
        await refetch()
        return `Updated ${field} on that note.`
      },
    },
    {
      id: 'delete-note',
      label: 'Delete Note',
      aliases: ['remove note'],
      steps: [
        {
          id: 'note_id', prompt: 'Which note should be deleted?', kind: 'entity',
          options: () => data.notes
            .filter(n => !currentAccountId || n.account_id === currentAccountId)
            .map(n => ({ label: `${n.date} — ${n.title || '(untitled)'}`, value: n.note_id })),
        },
        {
          id: 'confirm', prompt: 'Confirm delete?', kind: 'choice',
          choices: [{ label: 'Yes, delete', value: 'yes' }, { label: 'No, cancel', value: 'no' }],
        },
      ],
      run: async (answers) => {
        if (asString(answers.confirm) !== 'yes') return 'Cancelled.'
        await deleteRecord('notes', 'note_id', asString(answers.note_id))
        await refetch()
        return 'Note deleted.'
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
      id: 'delete-opportunity',
      label: 'Delete Opportunity',
      aliases: ['remove opportunity', 'delete opp'],
      steps: [
        {
          id: 'opportunity_id', prompt: 'Which opportunity should be deleted?', kind: 'entity',
          options: () => data.opportunities
            .filter(o => !currentAccountId || o.account_id === currentAccountId)
            .map(o => ({ label: `${o.description} (${o.status})`, value: o.opportunity_id })),
        },
        {
          id: 'confirm', prompt: 'Confirm delete?', kind: 'choice',
          choices: [{ label: 'Yes, delete', value: 'yes' }, { label: 'No, cancel', value: 'no' }],
        },
      ],
      run: async (answers) => {
        if (asString(answers.confirm) !== 'yes') return 'Cancelled.'
        await deleteRecord('opportunities', 'opportunity_id', asString(answers.opportunity_id))
        await refetch()
        return 'Opportunity deleted.'
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

    // ─────────────── Projects ───────────────
    {
      id: 'add-project',
      label: 'Add Project',
      aliases: ['new project', 'create project'],
      steps: [
        pickAccountStep(),
        { id: 'project_name', prompt: 'Project name?', kind: 'text', placeholder: 'Project name' },
        {
          id: 'status', prompt: 'Status?', kind: 'choice',
          choices: [
            { label: 'Active', value: 'Active' },
            { label: 'On Hold', value: 'On Hold' },
            { label: 'Complete', value: 'Complete' },
          ],
          optional: true,
        },
        { id: 'year', prompt: 'Year? (optional)', kind: 'text', placeholder: String(new Date().getFullYear()), optional: true },
        { id: 'notes', prompt: 'Notes? (optional)', kind: 'text', placeholder: 'Project notes', optional: true },
      ],
      run: async (answers) => {
        const account = resolveAccount(answers)
        if (!account) return 'Account not found.'
        const p: Project = {
          project_id: newId('proj'),
          account_id: account.account_id,
          engagement_id: '',
          project_name: asString(answers.project_name),
          status: (asString(answers.status) || 'Active') as Project['status'],
          client_stakeholder_ids: [],
          notes: asString(answers.notes),
          year: asString(answers.year) || String(new Date().getFullYear()),
          created_date: nowIso(),
          last_updated: nowIso(),
        }
        await upsertProject(p)
        await refetch()
        return `Project created: ${p.project_name}.`
      },
    },
    {
      id: 'edit-project',
      label: 'Edit Project',
      aliases: ['update project', 'change project'],
      steps: [
        {
          id: 'project_id', prompt: 'Which project?', kind: 'entity',
          options: () => data.projects
            .filter(p => !currentAccountId || p.account_id === currentAccountId)
            .map(p => ({ label: `${p.project_name} (${p.status})`, value: p.project_id })),
        },
        {
          id: 'field', prompt: 'Which field?', kind: 'choice',
          choices: [
            { label: 'Project name', value: 'project_name' },
            { label: 'Status', value: 'status' },
            { label: 'Year', value: 'year' },
            { label: 'Notes', value: 'notes' },
          ],
        },
        { id: 'value', prompt: 'New value?', kind: 'text', placeholder: 'New value' },
      ],
      run: async (answers) => {
        const project = data.projects.find(p => p.project_id === answers.project_id)
        if (!project) return 'Project not found.'
        const field = asString(answers.field) as keyof Project
        const value = asString(answers.value) as Project[keyof Project]
        await upsertProject({ ...project, [field]: value, last_updated: nowIso() })
        await refetch()
        return `Updated ${field} on that project.`
      },
    },
    {
      id: 'delete-project',
      label: 'Delete Project',
      aliases: ['remove project'],
      steps: [
        {
          id: 'project_id', prompt: 'Which project should be deleted?', kind: 'entity',
          options: () => data.projects
            .filter(p => !currentAccountId || p.account_id === currentAccountId)
            .map(p => ({ label: `${p.project_name} (${p.status})`, value: p.project_id })),
        },
        {
          id: 'confirm', prompt: 'Confirm delete?', kind: 'choice',
          choices: [{ label: 'Yes, delete', value: 'yes' }, { label: 'No, cancel', value: 'no' }],
        },
      ],
      run: async (answers) => {
        if (asString(answers.confirm) !== 'yes') return 'Cancelled.'
        await deleteRecord('projects', 'project_id', asString(answers.project_id))
        await refetch()
        return 'Project deleted.'
      },
    },
    {
      id: 'update-account-background',
      label: 'Update Account Background',
      aliases: ['update account context', 'edit account overview', 'update meeting details'],
      steps: [
        pickAccountStep(),
        {
          id: 'field', prompt: 'Which background field?', kind: 'choice',
          choices: [
            { label: 'Overview', value: 'overview' },
            { label: 'Strategic context', value: 'strategic_context' },
            { label: 'Delivery model', value: 'delivery_model' },
            { label: 'Key dates', value: 'key_dates' },
            { label: 'Account director', value: 'account_director' },
            { label: 'Account manager', value: 'account_manager' },
            { label: 'Account team', value: 'account_team' },
            { label: 'Next meeting', value: 'next_meeting' },
            { label: 'Account tier', value: 'account_tier' },
            { label: 'Meeting title', value: 'meeting_title' },
            { label: 'Meeting frequency', value: 'meeting_frequency' },
            { label: 'Meeting day', value: 'meeting_day' },
            { label: 'Meeting attendees', value: 'meeting_attendees' },
            { label: 'Meeting interval', value: 'meeting_interval' },
            { label: 'Next meeting override', value: 'next_meeting_override' },
          ],
        },
        { id: 'value', prompt: 'New value?', kind: 'text', placeholder: 'New value' },
      ],
      run: async (answers) => {
        const account = resolveAccount(answers)
        if (!account) return 'Account not found.'
        const field = asString(answers.field) as keyof Background
        const value = asString(answers.value) as Background[keyof Background]
        const bg = ensureBackground(account.account_id)
        await upsertBackground({ ...bg, [field]: value, last_updated: nowIso() })
        await refetch()
        return `Updated ${field} for ${account.account_name}.`
      },
    },
  ]
}
