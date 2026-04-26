#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const SRC_ROOT = join(ROOT, 'src')
const HUB_MODULE_IDS = new Set(['accounts', 'hr', 'sdr', 'slides', 'reviews', 'campaigns'])
const ADMIN_WORKSPACE_SCOPE = 'admin-workspace'
const SCOPES = new Set([...HUB_MODULE_IDS, ADMIN_WORKSPACE_SCOPE])
const CODE_FILE_RE = /\.(?:[cm]?[jt]sx?)$/i
const STATIC_IMPORT_RE = /\b(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g
const DYNAMIC_IMPORT_RE = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g
const CROSS_SCOPE_TARGETS = [
  { prefix: '@/app/accounts', scope: 'accounts' },
  { prefix: '@/components/accounts', scope: 'accounts' },
  { prefix: '@/app/hr', scope: 'hr' },
  { prefix: '@/components/hr', scope: 'hr' },
  { prefix: '@/app/sdr', scope: 'sdr' },
  { prefix: '@/components/sdr', scope: 'sdr' },
  { prefix: '@/app/slides', scope: 'slides' },
  { prefix: '@/components/slides', scope: 'slides' },
  { prefix: '@/app/reviews', scope: 'reviews' },
  { prefix: '@/components/reviews', scope: 'reviews' },
  { prefix: '@/app/campaigns', scope: 'campaigns' },
  { prefix: '@/components/campaigns', scope: 'campaigns' },
  { prefix: '@/app/admin', scope: ADMIN_WORKSPACE_SCOPE },
  { prefix: '@/app/design-system', scope: ADMIN_WORKSPACE_SCOPE },
  { prefix: '@/components/admin', scope: ADMIN_WORKSPACE_SCOPE },
  { prefix: '@/modules/admin-nav', scope: ADMIN_WORKSPACE_SCOPE },
  { prefix: '@/modules/design-catalog', scope: ADMIN_WORKSPACE_SCOPE },
]
const FORBIDDEN_OVERARCHING_INTERNAL_PREFIXES = [
  '@/components/hub',
  '@/app/page',
]

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry)
    const stats = statSync(abs)
    if (stats.isDirectory()) {
      walk(abs, out)
      continue
    }
    if (!CODE_FILE_RE.test(entry)) continue
    out.push(abs)
  }
}

function normalizePath(path) {
  return path.split(sep).join('/')
}

function detectOwnerModule(absPath) {
  const rel = normalizePath(relative(ROOT, absPath))
  const appMatch = rel.match(/^src\/app\/([^/]+)\//)
  if (appMatch && HUB_MODULE_IDS.has(appMatch[1])) return appMatch[1]
  const componentMatch = rel.match(/^src\/components\/([^/]+)\//)
  if (componentMatch && HUB_MODULE_IDS.has(componentMatch[1])) return componentMatch[1]
  if (
    rel.startsWith('src/app/admin/')
    || rel.startsWith('src/app/design-system/')
    || rel.startsWith('src/components/admin/')
    || rel === 'src/modules/admin-nav.ts'
    || rel === 'src/modules/design-catalog.ts'
  ) return ADMIN_WORKSPACE_SCOPE
  return null
}

function detectTargetModule(specifier) {
  if (!specifier.startsWith('@/')) return null
  for (const target of CROSS_SCOPE_TARGETS) {
    if (specifier.startsWith(target.prefix)) return target.scope
  }
  return null
}

function extractImports(source) {
  const imports = []
  let match = null
  STATIC_IMPORT_RE.lastIndex = 0
  while ((match = STATIC_IMPORT_RE.exec(source)) !== null) {
    imports.push(match[1])
  }
  DYNAMIC_IMPORT_RE.lastIndex = 0
  while ((match = DYNAMIC_IMPORT_RE.exec(source)) !== null) {
    imports.push(match[1])
  }
  return imports
}

const codeFiles = []
walk(SRC_ROOT, codeFiles)

const failures = []

for (const file of codeFiles) {
  const ownerScope = detectOwnerModule(file)
  if (!ownerScope) continue
  const source = readFileSync(file, 'utf8')
  const imports = extractImports(source)
  for (const specifier of imports) {
    const targetScope = detectTargetModule(specifier)
    if (targetScope && targetScope !== ownerScope) {
      failures.push({
        file: normalizePath(relative(ROOT, file)),
        reason: `scope "${ownerScope}" cannot import scope "${targetScope}" (${specifier})`,
      })
      continue
    }
    if (
      SCOPES.has(ownerScope)
      && FORBIDDEN_OVERARCHING_INTERNAL_PREFIXES.some(prefix => specifier.startsWith(prefix))
    ) {
      failures.push({
        file: normalizePath(relative(ROOT, file)),
        reason: `scope "${ownerScope}" cannot import overarching hub internals (${specifier})`,
      })
    }
  }
}

if (failures.length > 0) {
  console.error('check-module-boundaries: failed')
  for (const failure of failures) {
    console.error('  - ' + failure.file)
    console.error('      * ' + failure.reason)
  }
  process.exit(1)
}

console.log('check-module-boundaries: clean - module boundaries are respected.')
