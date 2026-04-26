import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const CAMPAIGN_SOURCE_FILES = [
  'src/app/campaigns/campaigns.css',
]

const HEX_RE = /(?<![a-zA-Z0-9#])#[0-9a-fA-F]{3,8}\b/g
const RGBA_RE = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+\s*)?\)/gi

function stripBlockComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function findMatches(lines, relPath) {
  return lines.flatMap((line, index) => {
    const hits = []
    const matches = [...line.matchAll(HEX_RE), ...line.matchAll(RGBA_RE)]
    for (const match of matches) {
      hits.push({
        file: relPath,
        line: index + 1,
        value: match[0],
      })
    }
    return hits
  })
}

test('campaign module style tokens: no raw hex or rgba literals in campaign module source', () => {
  const findings = CAMPAIGN_SOURCE_FILES.flatMap((path) => {
    if (!existsSync(path)) {
      return [{
        file: path,
        line: 0,
        value: 'MISSING_FILE',
      }]
    }

    const raw = readFileSync(path, 'utf8')
    const source = stripBlockComments(raw)
    const lines = source.split(/\r?\n/)
    return findMatches(lines, path)
  })

  assert.equal(findings.length, 0, `raw color literals found in campaign module source:\n${findings
    .map((entry) => `${entry.file}:${entry.line} ${entry.value}`)
    .join('\n')}`)
})
