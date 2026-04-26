#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const GUARDED_TARGETS = [
  'src/app/page.tsx',
  'src/app/admin',
  'src/app/slides/page.tsx',
  'src/components/admin',
]

const CODE_EXT_RE = /\.(?:[cm]?[jt]sx?)$/i
const HEX_RE = /(?<!&)#[0-9a-fA-F]{3,8}\b/g
const RGBA_RE = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+\s*)?\)/g

function walk(absPath, files) {
  const stat = statSync(absPath)
  if (stat.isDirectory()) {
    for (const entry of readdirSync(absPath)) {
      walk(join(absPath, entry), files)
    }
    return
  }
  if (CODE_EXT_RE.test(absPath)) files.push(absPath)
}

function collectGuardedFiles() {
  const files = []
  for (const target of GUARDED_TARGETS) {
    const abs = join(ROOT, target)
    walk(abs, files)
  }
  return files
}

function scanFile(filePath) {
  const rel = relative(ROOT, filePath).replace(/\\/g, '/')
  const source = readFileSync(filePath, 'utf8')
  const lines = source.split(/\r?\n/)
  const hits = []

  let inBlockComment = false
  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index]

    if (inBlockComment) {
      const end = line.indexOf('*/')
      if (end < 0) continue
      line = line.slice(end + 2)
      inBlockComment = false
    }

    while (line.includes('/*')) {
      const start = line.indexOf('/*')
      const end = line.indexOf('*/', start + 2)
      if (end < 0) {
        line = line.slice(0, start)
        inBlockComment = true
        break
      }
      line = line.slice(0, start) + line.slice(end + 2)
    }

    const lineCommentAt = line.indexOf('//')
    if (lineCommentAt >= 0) line = line.slice(0, lineCommentAt)
    if (!line.trim()) continue

    const hexHits = line.match(HEX_RE) || []
    const rgbaHits = line.match(RGBA_RE) || []
    for (const value of [...hexHits, ...rgbaHits]) {
      hits.push({
        file: rel,
        line: index + 1,
        value,
      })
    }
  }

  return hits
}

const files = collectGuardedFiles()
const hits = files.flatMap(scanFile)

if (hits.length === 0) {
  console.log(`check-guarded-token-drift: clean - ${files.length} guarded files scanned.`)
  process.exit(0)
}

console.error(`check-guarded-token-drift: ${hits.length} raw color literal(s) found in guarded module files:`)
for (const hit of hits) {
  console.error(`  ${hit.file}:${hit.line}  ${hit.value}`)
}
console.error('')
console.error('Fix: replace with token/runtime values (for example CSS vars or token readers) instead of raw hex/rgba literals.')
process.exit(1)
