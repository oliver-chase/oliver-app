#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const DEFAULT_BASE_REF = process.env.EPIC_BASE_REF || 'origin/staging'
const MAX_COMMITS = Number(process.env.EPIC_SQUASH_MAX_COMMITS || 5)
const MAX_FILES = Number(process.env.EPIC_SQUASH_MAX_FILES || 20)
const MAX_LOC = Number(process.env.EPIC_SQUASH_MAX_LOC || 1200)
const strict = process.argv.includes('--strict')

function runGit(args, allowFailure = false) {
  const result = spawnSync('git', args, { encoding: 'utf8' })
  if (result.status === 0) {
    return (result.stdout || '').trim()
  }
  if (allowFailure) return ''
  const stderr = (result.stderr || '').trim()
  throw new Error(`git ${args.join(' ')} failed${stderr ? `: ${stderr}` : ''}`)
}

function refExists(ref) {
  const result = spawnSync('git', ['rev-parse', '--verify', '--quiet', ref], { encoding: 'utf8' })
  return result.status === 0
}

function parseShortStat(shortStat) {
  const files = Number((shortStat.match(/(\d+)\s+files?\s+changed/) || [])[1] || 0)
  const insertions = Number((shortStat.match(/(\d+)\s+insertions?\(\+\)/) || [])[1] || 0)
  const deletions = Number((shortStat.match(/(\d+)\s+deletions?\(-\)/) || [])[1] || 0)
  return {
    files,
    insertions,
    deletions,
    loc: insertions + deletions,
  }
}

function pickBaseRef() {
  const candidates = [DEFAULT_BASE_REF, 'staging', 'main', 'master']
  for (const candidate of candidates) {
    if (candidate && refExists(candidate)) return candidate
  }
  throw new Error(
    `Could not resolve a base ref. Tried: ${candidates.filter(Boolean).join(', ')}. ` +
    'Set EPIC_BASE_REF to a valid reference.',
  )
}

function main() {
  runGit(['rev-parse', '--git-dir'])

  const baseRef = pickBaseRef()
  const mergeBase = runGit(['merge-base', baseRef, 'HEAD'])
  const commitCount = Number(runGit(['rev-list', '--count', `${mergeBase}..HEAD`]) || '0')
  const shortStat = runGit(['diff', '--shortstat', `${mergeBase}..HEAD`], true)
  const { files, insertions, deletions, loc } = parseShortStat(shortStat)

  const overCommits = commitCount > MAX_COMMITS
  const overFiles = files > MAX_FILES
  const overLoc = loc > MAX_LOC
  const shouldSquash = overCommits || overFiles || overLoc

  console.log('epic-size-check:')
  console.log(`  base_ref: ${baseRef}`)
  console.log(`  merge_base: ${mergeBase}`)
  console.log(`  commits_since_base: ${commitCount} (max ${MAX_COMMITS})`)
  console.log(`  files_changed: ${files} (max ${MAX_FILES})`)
  console.log(`  loc_changed: ${loc} (insertions ${insertions}, deletions ${deletions}, max ${MAX_LOC})`)

  if (!shouldSquash) {
    console.log('  result: within threshold (no squash required)')
    return
  }

  console.log('  result: threshold exceeded (squash recommended)')
  console.log('  suggested_non_interactive_flow:')
  console.log(`    BASE="$(git merge-base ${baseRef} HEAD)"`)
  console.log('    git reset --soft "$BASE"')
  console.log('    git commit -m "feat(epic-<epic-slug>): <milestone summary>"')

  if (strict) process.exit(1)
}

main()
