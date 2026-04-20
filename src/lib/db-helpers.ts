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

// Parallel-writes helper that replaces the buggy `dbMulti` pattern duplicated
// across HR components. Each op is a thunk returning a supabase query. Runs
// them in parallel via Promise.all; throws if any op reported an error. The
// component's setSyncState wrapper runs once (syncing → ok / error).
export async function dbWriteMulti(
  ops: Array<() => ThenableQuery>,
  label: string,
): Promise<void> {
  const results = await Promise.all(ops.map(fn => fn()))
  const failed = results.filter(r => r.error)
  if (failed.length) {
    const msg = failed.map(r => r.error!.message).join('; ')
    console.error('[dbWriteMulti] ' + label + ':', msg)
    throw new Error(label + ' failed: ' + msg)
  }
}

// Convenience wrapper: wraps dbWriteMulti with the setSyncState lifecycle
// that every HR file reimplemented. Returns true on success, false on failure.
export async function runWrites(
  setSyncState: (s: 'ok' | 'syncing' | 'error') => void,
  ops: Array<() => ThenableQuery>,
  label: string,
): Promise<boolean> {
  setSyncState('syncing')
  try {
    await dbWriteMulti(ops, label)
    setSyncState('ok')
    return true
  } catch {
    setSyncState('error')
    return false
  }
}
