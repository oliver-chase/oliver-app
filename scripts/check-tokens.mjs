#!/usr/bin/env node
// Token-drift scanner: fails CI when a raw color (hex or rgba) sneaks into a
// stylesheet outside of tokens.css. Each hit is printed with file:line so the
// violation is easy to locate.
//
// Intentionally conservative — only colors are enforced. Raw px in specific
// properties has too many legitimate cases (border widths, SVG icon sizes,
// layout constants) to gate on without false positives.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('../', import.meta.url).pathname
const SRC = join(ROOT, 'src')

// Files that are allowed to contain raw colors.
const ALLOW_FILES = new Set([
  'src/app/tokens.css',
])

// Per-line exemptions: if a CSS line matches any of these patterns, any
// raw value inside it is ignored. These are the known SVG data URI cases
// where CSS variables can't be used.
const LINE_EXEMPTIONS = [
  /url\("data:image\/svg\+xml/,
]

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g
const RGBA_RE = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/g
const FONT_SIZE_PX_RE = /font-size\s*:\s*(\d+px)/g

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const s = statSync(full)
    if (s.isDirectory()) out.push(...walk(full))
    else if (entry.endsWith('.css')) out.push(full)
  }
  return out
}

function scan(file) {
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  if (ALLOW_FILES.has(rel)) return []
  const text = readFileSync(file, 'utf8')
  const lines = text.split(/\r?\n/)
  const hits = []
  let inBlockComment = false
  lines.forEach((line, idx) => {
    let remaining = line
    if (inBlockComment) {
      const end = remaining.indexOf('*/')
      if (end < 0) return
      remaining = remaining.slice(end + 2)
      inBlockComment = false
    }
    while (remaining.includes('/*')) {
      const start = remaining.indexOf('/*')
      const end = remaining.indexOf('*/', start + 2)
      if (end < 0) {
        remaining = remaining.slice(0, start)
        inBlockComment = true
        break
      }
      remaining = remaining.slice(0, start) + remaining.slice(end + 2)
    }
    if (LINE_EXEMPTIONS.some(re => re.test(remaining))) return
    const hexHits = remaining.match(HEX_RE) ?? []
    const rgbaHits = remaining.match(RGBA_RE) ?? []
    const fontPxHits = [...remaining.matchAll(FONT_SIZE_PX_RE)].map(m => m[1])
    for (const h of hexHits) hits.push({ rel, line: idx + 1, value: h, kind: 'hex' })
    for (const h of rgbaHits) hits.push({ rel, line: idx + 1, value: h, kind: 'rgba' })
    for (const h of fontPxHits) hits.push({ rel, line: idx + 1, value: 'font-size: ' + h, kind: 'font-size-px' })
  })
  return hits
}

const cssFiles = walk(SRC)
const allHits = cssFiles.flatMap(scan)

if (allHits.length === 0) {
  console.log('check-tokens: clean — ' + cssFiles.length + ' stylesheets scanned, no raw colors or font-size px outside tokens.css.')
  process.exit(0)
}

console.error('check-tokens: ' + allHits.length + ' raw design-token value(s) found outside tokens.css:')
for (const h of allHits) {
  console.error('  ' + h.rel + ':' + h.line + '  ' + h.kind + '  ' + h.value)
}
console.error('')
console.error('Fix: replace with var(--color-*) or var(--font-size-*) from tokens.css. If no existing token matches, pick the nearest and accept a small visual shift, or add a new semantic token to tokens.css first.')
process.exit(1)
