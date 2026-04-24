import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const STORIES_ROOT = join(ROOT, '.github', 'user-stories', 'oliver-app')

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    const absPath = join(dir, entry)
    const stat = statSync(absPath)
    if (stat.isDirectory()) {
      walk(absPath, out)
      continue
    }
    if (!/^US-.*\.md$/i.test(entry)) continue
    out.push(absPath)
  }
}

function checkStory(path) {
  const text = readFileSync(path, 'utf8')
  const problems = []

  if (!/^As an?\s+/m.test(text)) {
    problems.push('missing user role line: "As a..."')
  }
  if (!/^I want\s+/m.test(text)) {
    problems.push('missing intent line: "I want..."')
  }
  if (!/^So\s+/m.test(text)) {
    problems.push('missing value line: "So..."')
  }

  if (!/^Acceptance Criteria:\s*$/m.test(text)) {
    problems.push('missing "Acceptance Criteria:" section label')
  }

  if (!/^\s*- \[(?: |x|X)\]\s+/m.test(text)) {
    problems.push('missing checklist acceptance criteria items')
  }

  return problems
}

const storyFiles = []
walk(STORIES_ROOT, storyFiles)

const failures = []
for (const file of storyFiles) {
  const problems = checkStory(file)
  if (problems.length === 0) continue
  failures.push({ file, problems })
}

if (failures.length > 0) {
  console.error('check-user-stories: failed')
  for (const failure of failures) {
    console.error('  - ' + relative(ROOT, failure.file))
    for (const problem of failure.problems) {
      console.error('      * ' + problem)
    }
  }
  process.exit(1)
}

console.log('check-user-stories: clean - ' + storyFiles.length + ' story files validated.')
