import { supabase } from './supabase'

export interface DesignToken {
  token_name: string
  token_value: string
  category: string
  updated_at: string
}

export async function listTokenOverrides(): Promise<DesignToken[]> {
  const { data, error } = await supabase
    .from('design_tokens')
    .select('*')
    .order('category')
  if (error) throw new Error('listTokenOverrides: ' + error.message)
  return data ?? []
}

export async function upsertToken(token_name: string, token_value: string, category: string): Promise<void> {
  const { error } = await supabase
    .from('design_tokens')
    .upsert({ token_name, token_value, category })
  if (error) throw new Error('upsertToken ' + token_name + ': ' + error.message)
}

export async function applyTokenOverrides(): Promise<void> {
  const tokens = await listTokenOverrides()
  if (!tokens.length) return
  const root = document.documentElement
  for (const t of tokens) {
    root.style.setProperty(t.token_name, t.token_value)
  }
}
