import { supabase } from './supabase'
import type { Account, Engagement, Stakeholder, Action, Note, Opportunity, Project, Background } from '@/types'

async function fetchTable<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw new Error(`[db] ${table}: ${error.message}`)
  return (data ?? []) as T[]
}

export async function loadAllData() {
  const [accounts, engagements, stakeholders, actions, notes, opportunities, projects, background] =
    await Promise.all([
      fetchTable<Account>('Accounts'),
      fetchTable<Engagement>('Engagements'),
      fetchTable<Stakeholder>('Stakeholders'),
      fetchTable<Action>('Actions'),
      fetchTable<Note>('Notes'),
      fetchTable<Opportunity>('Opportunities'),
      fetchTable<Project>('Projects'),
      fetchTable<Background>('Background'),
    ])
  return { accounts, engagements, stakeholders, actions, notes, opportunities, projects, background }
}

export async function upsertAccount(account: Account) {
  const { error } = await supabase.from('Accounts').upsert(account, { onConflict: 'account_id' })
  if (error) throw error
}

export async function upsertBackground(bg: Background) {
  const { error } = await supabase.from('Background').upsert(bg, { onConflict: 'background_id' })
  if (error) throw error
}

export async function upsertStakeholder(s: Stakeholder) {
  const { error } = await supabase.from('Stakeholders').upsert(s, { onConflict: 'stakeholder_id' })
  if (error) throw error
}

export async function upsertAction(a: Action) {
  const { error } = await supabase.from('Actions').upsert(a, { onConflict: 'action_id' })
  if (error) throw error
}

export async function upsertNote(n: Note) {
  const { error } = await supabase.from('Notes').upsert(n, { onConflict: 'note_id' })
  if (error) throw error
}

export async function upsertOpportunity(o: Opportunity) {
  const { error } = await supabase.from('Opportunities').upsert(o, { onConflict: 'opportunity_id' })
  if (error) throw error
}

export async function upsertProject(p: Project) {
  const { error } = await supabase.from('Projects').upsert(p, { onConflict: 'project_id' })
  if (error) throw error
}

export async function deleteRecord(table: string, idCol: string, id: string) {
  const { error } = await supabase.from(table).delete().eq(idCol, id)
  if (error) throw error
}

export function today() {
  return new Date().toISOString().split('T')[0]
}

export function newId(prefix: string) {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
}
