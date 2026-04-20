// supabase-js v2 resolves successfully even when the request failed — the
// result carries `{ error }` instead of throwing. `dbWrite` wraps a single
// supabase query so callers only need one try/catch instead of remembering
// to destructure `error` at every site.
//
// Usage:
//   await dbWrite(supabase.from('candidates').insert(rec), 'insert candidate')
//   await dbWrite(supabase.from('devices').update(x).eq('id', id), 'update device')

type SupabaseQueryResult = { error: { message: string } | null }
type ThenableQuery = PromiseLike<SupabaseQueryResult>

export async function dbWrite(query: ThenableQuery, label: string): Promise<void> {
  const { error } = await query
  if (error) {
    console.error('[dbWrite] ' + label + ':', error.message)
    throw new Error(label + ' failed: ' + error.message)
  }
}
