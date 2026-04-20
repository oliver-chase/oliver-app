// Lightweight fuzzy matcher — no deps.
// Scoring: lower is better. Returns null when no acceptable match.

export interface FuzzyHit<T> {
  item: T
  score: number
}

function levenshtein(a: string, b: string, cap: number): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  if (Math.abs(a.length - b.length) > cap) return cap + 1
  const prev = new Array(b.length + 1)
  const curr = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    let rowMin = curr[0]
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
      if (curr[j] < rowMin) rowMin = curr[j]
    }
    if (rowMin > cap) return cap + 1
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
  }
  return prev[b.length]
}

function scoreToken(token: string, target: string): number | null {
  if (!token) return 0
  if (target.includes(token)) {
    const i = target.indexOf(token)
    return i === 0 ? 0 : 1 + i * 0.01
  }
  const cap = token.length <= 4 ? 1 : 2
  let best = cap + 1
  for (const word of target.split(/\s+/)) {
    const d = levenshtein(token, word, cap)
    if (d < best) best = d
  }
  return best <= cap ? 5 + best : null
}

export function fuzzyScore(query: string, text: string): number | null {
  const q = query.trim().toLowerCase()
  const t = text.toLowerCase()
  if (!q) return 0
  if (t.includes(q)) return t.indexOf(q) === 0 ? 0 : 1
  let total = 0
  for (const tok of q.split(/\s+/)) {
    const s = scoreToken(tok, t)
    if (s === null) return null
    total += s
  }
  return total
}

export function fuzzyFilter<T>(query: string, items: T[], key: (i: T) => string): FuzzyHit<T>[] {
  const q = query.trim()
  if (!q) return items.map((item) => ({ item, score: 0 }))
  const hits: FuzzyHit<T>[] = []
  for (const item of items) {
    const score = fuzzyScore(q, key(item))
    if (score !== null) hits.push({ item, score })
  }
  hits.sort((a, b) => a.score - b.score)
  return hits
}
