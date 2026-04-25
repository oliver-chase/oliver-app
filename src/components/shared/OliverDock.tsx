'use client'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useOliverContext } from './OliverContext'
import type { OliverAction, OliverFlow } from './OliverContext'
import { fuzzyFilter, fuzzyScore } from '@/lib/fuzzy'
import { useUser } from '@/context/UserContext'
import { useAuth } from '@/context/AuthContext'
import { detectPathScopeViolation, detectProfileIntent } from '@/lib/chatbot-intents'
import TranscriptReviewModal from './TranscriptReviewModal'
import { ChatbotTopbar } from './ChatbotTopbar'
import { ChatbotInputBar } from './ChatbotInputBar'

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'

// Module-level upload trigger so page components can fire it via an action.
let _uploadTrigger: (() => void) | null = null
export function triggerOliverUpload() { _uploadTrigger?.() }

type ChatItem =
  | { id: number; kind: 'msg'; role: 'user' | 'assistant'; text: string; model?: string }
  | { id: number; kind: 'parse-result'; title: string; summary: string; model: string; payload: unknown }
  | { id: number; kind: 'write-prompt'; text: string; hasConflicts: boolean; payload: unknown }

type PersistedMessage = Extract<ChatItem, { kind: 'msg' }>

type HistoryRow = {
  role: 'user' | 'assistant'
  text: string
  kind?: string
}

function getAccountUserId(account: { idTokenClaims?: unknown; localAccountId?: string; homeAccountId?: string; username?: string } | null) {
  if (!account) return null
  const claims = account.idTokenClaims as Record<string, unknown> | undefined
  if (typeof claims?.oid === 'string' && claims.oid) return claims.oid
  if (typeof claims?.sub === 'string' && claims.sub) return claims.sub
  return account.localAccountId || account.homeAccountId || account.username || null
}

export default function OliverDock() {
  const { config, openSignal } = useOliverContext()
  const { appUser } = useUser()
  const { account } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [items, setItems] = useState<ChatItem[]>([])
  const [busy, setBusy] = useState(false)
  const [reviewModal, setReviewModal] = useState<{ itemId: number; payload: unknown } | null>(null)
  const [listening, setListening] = useState(false)
  // Active flow runtime. `answers` collects the stepper outputs keyed by step id.
  const [flowState, setFlowState] = useState<{ flow: OliverFlow; stepIdx: number; answers: Record<string, unknown> } | null>(null)
  const flowStateRef = useRef(flowState)
  useEffect(() => { flowStateRef.current = flowState }, [flowState])
  const idRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const historyLoadKeyRef = useRef<string | null>(null)
  const [historyReadyKey, setHistoryReadyKey] = useState<string | null>(null)

  const nextId = () => ++idRef.current
  const historyUserId = appUser?.user_id || getAccountUserId(account)
  const historyKey = historyUserId && config ? 'oliver-history:' + historyUserId + ':' + config.pageLabel : null

  const msgItems = useMemo(
    () => items.filter((item): item is PersistedMessage => item.kind === 'msg'),
    [items],
  )

  const historyRows = useMemo<HistoryRow[]>(
    () => msgItems.map((item) => ({ role: item.role, text: item.text, kind: item.kind })),
    [msgItems],
  )

  const replaceHistory = useCallback((rows: HistoryRow[]) => {
    idRef.current = rows.length
    setItems(rows.map((row, index) => ({
      id: index + 1,
      kind: 'msg',
      role: row.role === 'user' ? 'user' : 'assistant',
      text: row.text,
    })))
  }, [])

  const persistHistory = useCallback(async (rows: HistoryRow[]) => {
    if (!historyKey) return
    window.localStorage.setItem(historyKey, JSON.stringify(rows))
    if (!historyUserId || !config?.pageLabel) return
    try {
      await fetch('/api/chat-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: historyUserId,
          page_label: config.pageLabel,
          messages: rows,
        }),
      })
    } catch {}
  }, [config?.pageLabel, historyKey, historyUserId])

  // Register upload trigger so page actions can call triggerOliverUpload().
  useEffect(() => {
    _uploadTrigger = () => fileInputRef.current?.click()
    return () => { _uploadTrigger = null }
  }, [])

  // Scroll messages on update.
  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [items, busy])

  // Keyboard shortcuts.
  useEffect(() => {
    if (!config) return
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        return
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [config, open])

  useEffect(() => {
    if (openSignal > 0) setOpen(true)
  }, [openSignal])

  useEffect(() => {
    if (!config || !historyKey) return
    if (historyLoadKeyRef.current === historyKey) return
    historyLoadKeyRef.current = historyKey
    setHistoryReadyKey(null)

    const localRaw = window.localStorage.getItem(historyKey)
    if (localRaw) {
      try {
        replaceHistory(JSON.parse(localRaw) as HistoryRow[])
      } catch {
        window.localStorage.removeItem(historyKey)
      }
    } else {
      replaceHistory([])
    }

    if (!historyUserId) return
    ;(async () => {
      try {
        const res = await fetch('/api/chat-messages?user_id=' + encodeURIComponent(historyUserId) + '&page_label=' + encodeURIComponent(config.pageLabel))
        if (!res.ok) return
        const rows = await res.json() as Array<{ role: string; text: string }>
        if (!Array.isArray(rows)) return
        const normalized: HistoryRow[] = rows
          .filter((row) => typeof row.text === 'string' && row.text.trim())
          .map((row) => ({ role: row.role === 'user' ? 'user' : 'assistant', text: row.text, kind: 'msg' }))
        if (normalized.length > 0) {
          window.localStorage.setItem(historyKey, JSON.stringify(normalized))
          replaceHistory(normalized)
        }
      } catch {
      } finally {
        setHistoryReadyKey(historyKey)
      }
    })()
    if (!historyUserId) setHistoryReadyKey(historyKey)
  }, [config, historyKey, historyUserId, replaceHistory])

  useEffect(() => {
    if (!historyKey || historyReadyKey !== historyKey) return
    void persistHistory(historyRows)
  }, [historyKey, historyReadyKey, historyRows, persistHistory])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40)
  }, [open])

  // Chip row: all non-granular actions (wraps to multiple lines).
  // Granular per-entity actions (edit person X) stay hidden from chips and only
  // surface via fuzzy typeahead.
  const fabActions = useMemo(() => config?.actions.filter(a => !a.granular) ?? [], [config])
  const profileAction = useMemo<OliverAction>(() => ({
    id: 'global-profile-settings',
    label: 'Profile Settings',
    group: 'Quick',
    hint: 'Manage password, email, name, and sign-in settings',
    aliases: [
      'change password',
      'update password',
      'security settings',
      'security info',
      'change email',
      'change name',
      'profile',
      'my account',
      'personal info',
      'sign-in settings',
    ],
    granular: true,
    run: () => { router.push('/profile') },
  }), [router])
  const commandPool = useMemo<OliverAction[]>(() => {
    if (!config) return []
    const flowCommands: OliverAction[] = (config.flows ?? []).map(flow => ({
      id: flow.id,
      label: flow.label,
      group: 'Quick',
      hint: flow.hint,
      aliases: flow.aliases ?? [],
      granular: true,
      run: () => {},
    }))
    const hasProfileAction = config.actions.some(action => normalize(action.label) === normalize(profileAction.label))
    const seen = new Set<string>()
    return [...config.actions, ...flowCommands, ...(hasProfileAction ? [] : [profileAction])].filter((action) => {
      const key = normalize(action.id + '|' + action.label)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [config, profileAction])

  // Fuzzy suggestions driven by input (top 3, ≤2 edits).
  const suggestions = useMemo(() => {
    if (!config || !input.trim()) return []
    return fuzzyFilter(input, commandPool, a => {
      return a.label + ' ' + (a.hint ?? '') + ' ' + a.aliases.join(' ')
    })
      .slice(0, 3)
      .map(h => h.item)
  }, [commandPool, config, input])

  function normalize(text: string) {
    return text.trim().toLowerCase().replace(/\s+/g, ' ')
  }

  function resolveChoiceValue(step: Extract<OliverFlow['steps'][number], { kind: 'choice' }>, text: string): string | null {
    const n = normalize(text)
    if (!n) return null
    const direct = step.choices.find(c => normalize(c.value) === n || normalize(c.label) === n)
    if (direct) return direct.value
    let best: { value: string; score: number } | null = null
    for (const c of step.choices) {
      const score = fuzzyScore(n, normalize(c.label + ' ' + c.value))
      if (score === null) continue
      if (!best || score < best.score) best = { value: c.value, score }
    }
    return best ? best.value : null
  }

  function resolveEntityValue(step: Extract<OliverFlow['steps'][number], { kind: 'entity' }>, text: string): string | null {
    const n = normalize(text)
    if (!n) return null
    const opts = step.options()
    const direct = opts.find(o => normalize(o.value) === n || normalize(o.label) === n)
    if (direct) return direct.value
    let best: { value: string; score: number } | null = null
    for (const o of opts) {
      const score = fuzzyScore(n, normalize(o.label + ' ' + o.value))
      if (score === null) continue
      if (!best || score < best.score) best = { value: o.value, score }
    }
    // For entity steps, allow typed fallback if no option matched.
    return best ? best.value : text
  }

  async function executeAction(a: OliverAction) {
    setInput('')
    // An action's id may match a registered flow id — if so, start the flow
    // instead of running the action's side effect.
    const flow = config?.flows?.find(f => f.id === a.id)
      ?? config?.flows?.find(f => normalize(f.label) === normalize(a.label))
    if (flow) { startFlow(flow); return }
    try { await a.run() } catch (err) { console.error('[Oliver] action failed', a.id, err) }
  }

  // ── Flow runtime ─────────────────────────────────────────────
  // A flow is a list of steps. We walk step-by-step, collecting answers into
  // answers[step.id]. Each step's UI renders inline as a chat card.

  function startFlow(flow: OliverFlow) {
    setFlowState({ flow, stepIdx: 0, answers: {} })
    setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'user', text: flow.label }])
    promptFlowStep(flow, 0, {})
  }

  function promptFlowStep(flow: OliverFlow, idx: number, answers: Record<string, unknown>) {
    // Skip any steps the flow wants to skip.
    let i = idx
    while (i < flow.steps.length && flow.steps[i].skipIf?.(answers)) i++
    if (i >= flow.steps.length) { void finishFlow(flow, answers); return }
    const step = flow.steps[i]
    const prompt = typeof step.prompt === 'function' ? step.prompt(answers) : step.prompt
    setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: prompt }])
    setFlowState({ flow, stepIdx: i, answers })
    if (step.kind !== 'text' && step.kind !== 'number') {
      // Choice/entity steps get their picker rendered below the last message
      // via the same chatbot-messages container — see the JSX block.
    } else {
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }

  function supplyFlowAnswer(value: string) {
    const s = flowStateRef.current
    if (!s) return
    const step = s.flow.steps[s.stepIdx]
    if (step.optional !== true && !value.trim() && step.kind !== 'choice' && step.kind !== 'entity') {
      setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'Need a value — type one or Cancel.' }])
      return
    }
    setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'user', text: value || '(skipped)' }])
    const nextAnswers = { ...s.answers, [step.id]: value }
    promptFlowStep(s.flow, s.stepIdx + 1, nextAnswers)
  }

  async function finishFlow(flow: OliverFlow, answers: Record<string, unknown>) {
    try {
      const confirmation = await flow.run(answers)
      setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: confirmation }])
    } catch (err) {
      console.error('[Oliver] flow run failed', flow.id, err)
      setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'Something went wrong — try again?' }])
    } finally {
      setFlowState(null)
    }
  }

  function cancelFlow() {
    setFlowState(null)
    setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'Cancelled.' }])
  }

  const sendChat = useCallback(async (text: string) => {
    if (!config || !text || busy) return
    const scopeViolation = config.conversationPath
      ? detectPathScopeViolation(text, config.conversationPath)
      : null
    if (scopeViolation) {
      setItems(prev => [
        ...prev,
        { id: nextId(), kind: 'msg', role: 'user', text },
        { id: nextId(), kind: 'msg', role: 'assistant', text: scopeViolation.message },
      ])
      return
    }
    setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'user', text }])
    setBusy(true)
    try {
      const history = items
        .filter((it): it is Extract<ChatItem, { kind: 'msg' }> => it.kind === 'msg')
        .map(m => ({ role: m.role, content: m.text }))
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: text }].slice(-20),
          pageContext: config.pageLabel,
          conversationPath: config.conversationPath ?? null,
          accountData: config.contextPayload ? config.contextPayload() : null,
        }),
      })
      const json = await res.json() as { reply?: string; error?: string; model?: string }
      if (json.error) {
        setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'Error: ' + json.error }])
      } else {
        setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: json.reply ?? 'No response.', model: json.model ?? DEFAULT_MODEL }])
      }
    } catch {
      setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'Network error. Try again.' }])
    } finally {
      setBusy(false)
    }
  }, [config, busy, items])

  function send() {
    const text = input.trim()
    if (!text) return
    setInput('')
    // If a flow step is awaiting typed input, route there first.
    const s = flowStateRef.current
    if (s) {
      const step = s.flow.steps[s.stepIdx]
      const n = normalize(text)
      if (n === 'cancel' || n === 'stop' || n === 'never mind' || n === 'nevermind') { cancelFlow(); return }
      if (step.optional && (n === 'skip' || n === 'none' || n === 'n/a' || n === 'na')) { supplyFlowAnswer(''); return }
      if (step.kind === 'text' || step.kind === 'number') { supplyFlowAnswer(text); return }
      if (step.kind === 'choice') {
        const resolved = resolveChoiceValue(step, text)
        if (!resolved) {
          setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'Pick one of the options above, or type Cancel.' }])
          return
        }
        supplyFlowAnswer(resolved)
        return
      }
      if (step.kind === 'entity') {
        const resolved = resolveEntityValue(step, text)
        if (!resolved) {
          setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'Choose from the options above, or type the exact value.' }])
          return
        }
        supplyFlowAnswer(resolved)
        return
      }
    }
    if (detectProfileIntent(text)) {
      void executeAction(profileAction)
      return
    }
    // Execute top fuzzy match; fall through to chat if none found.
    if (suggestions.length > 0) {
      executeAction(suggestions[0])
      return
    }
    sendChat(text)
  }

  function resetOliver() {
    setFlowState(null)
    setItems([])
    setInput('')
    if (historyKey) window.localStorage.removeItem(historyKey)
    if (historyUserId && config?.pageLabel) {
      void fetch('/api/chat-messages?user_id=' + encodeURIComponent(historyUserId) + '&page_label=' + encodeURIComponent(config.pageLabel), {
        method: 'DELETE',
      }).catch(() => {})
    }
  }

  function toggleMic() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = typeof window !== 'undefined' && (w.SpeechRecognition || w.webkitSpeechRecognition)
    if (!SR) {
      setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: "Voice input isn't supported in this browser." }])
      return
    }
    if (listening) { recognitionRef.current?.stop(); return }
    const rec = new SR()
    recognitionRef.current = rec
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.maxAlternatives = 1
    setListening(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript: string = e.results[0][0].transcript
      setListening(false)
      sendChat(transcript)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    rec.start()
  }

  function exportConversation() {
    const msgs = items.filter((it): it is Extract<ChatItem, { kind: 'msg' }> => it.kind === 'msg')
    if (!msgs.length) return
    const text = msgs.map(m => (m.role === 'user' ? 'You' : 'Oliver') + ': ' + m.text).join('\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'oliver-conversation-' + new Date().toISOString().split('T')[0] + '.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleReview(itemId: number, payload: unknown) {
    if (!config?.upload) return
    setItems(prev => prev.filter(it => it.id !== itemId))
    setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'Checking for conflicts…' }])
    try {
      const dr = await config.upload.dryRun(payload)
      const hasConflicts = !!(dr.conflicts && dr.conflicts.length > 0)
      let text: string
      if (hasConflicts) {
        text = 'Conflicts found:\n'
        dr.conflicts!.forEach(c => { text += '  ' + c.section + '/' + c.field + ': existing "' + c.existing + '" vs incoming "' + c.incoming + '"\n' })
        text += '\nProceed anyway?'
      } else {
        text = 'Ready to write:\n'
        const s = dr.summary || {}
        Object.keys(s).forEach(k => { if (s[k] > 0) text += '  ' + k + ': ' + s[k] + '\n' })
      }
      setItems(prev => [...prev, { id: nextId(), kind: 'write-prompt', text, hasConflicts, payload }])
    } catch (err) {
      console.error('[Oliver] dryRun failed', err)
      setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'Conflict check failed. Try again.' }])
    }
  }

  async function handleConfirmWrite(itemId: number, payload: unknown) {
    if (!config?.upload) return
    setItems(prev => prev.filter(it => it.id !== itemId))
    setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'Writing to database…' }])
    try {
      const res = await config.upload.commit(payload)
      setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: res.message }])
      config.onChatRefresh?.()
      const actions = (payload as Record<string, unknown>).actions as Array<Record<string, string>> | undefined
      if (actions?.length) {
        const first = actions[0]
        const task = first.task || 'an item'
        const owner = first.owner ? ' for ' + first.owner : ''
        const followUp = 'I see ' + actions.length + ' action item' + (actions.length > 1 ? 's' : '') + ' from this transcript. For example: "' + task + '"' + owner + '. Do you want me to create reminders or add calendar entries for any of these?'
        setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: followUp }])
      }
    } catch (err) {
      console.error('[Oliver] commit failed', err)
      setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'Write failed: ' + (err instanceof Error ? err.message : String(err)) }])
    }
  }

  if (!config) return null

  return (
    <>
      <button
        className="chatbot-trigger"
        aria-expanded={open}
        aria-controls="oliver-dock-panel"
        aria-label={open ? 'Close Oliver' : 'Open Oliver'}
        title={open ? 'Close Oliver' : 'Open Oliver (⌘K)'}
        onClick={() => setOpen(o => !o)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {open
            ? <path d="M18 6L6 18M6 6l12 12" />
            : <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          }
        </svg>
      </button>

      <div
        className={'chatbot-panel' + (open ? ' chatbot-panel--open' : '')}
        id="oliver-dock-panel"
        role="complementary"
        aria-label="Oliver"
      >
        <ChatbotTopbar
          title={`Oliver · ${config.pageLabel}`}
          canExport={items.some(it => it.kind === 'msg')}
          onExport={exportConversation}
          canReset={items.length > 0 || !!flowState}
          onReset={resetOliver}
          onClose={() => setOpen(false)}
        />

        {config.upload && (
          <input
            ref={fileInputRef}
            type="file"
            accept={config.upload.accepts}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
            aria-label={config.upload.hint}
            tabIndex={-1}
            onChange={e => {
              const file = e.target.files?.[0]
              if (file && config.upload) {
                const MAX_BYTES = 10 * 1024 * 1024
                const acceptList = (config.upload.accepts ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
                const nameLower = file.name.toLowerCase()
                const mimeLower = (file.type ?? '').toLowerCase()
                const okType = acceptList.length === 0 || acceptList.some(a =>
                  a.startsWith('.') ? nameLower.endsWith(a) :
                  a.endsWith('/*') ? mimeLower.startsWith(a.slice(0, -1)) :
                  mimeLower === a
                )
                if (!okType) {
                  setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'Unsupported file type: ' + file.name }])
                  e.target.value = ''
                  return
                }
                if (file.size > MAX_BYTES) {
                  setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'File too large (max 10 MB): ' + file.name }])
                  e.target.value = ''
                  return
                }
                ;(async () => {
                  setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'Reading ' + file.name + '…' }])
                  try {
                    const r = await config.upload!.parse(file)
                    setItems(prev => [...prev, { id: nextId(), kind: 'parse-result', title: r.title, summary: r.summary, model: r.model, payload: r.payload }])
                  } catch (err) {
                    console.error('[Oliver] parse failed', err)
                    setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'Parse error: ' + (err instanceof Error ? err.message : String(err)) }])
                  }
                })()
              }
              e.target.value = ''
            }}
          />
        )}

        <div className="chatbot-body">
          {/* Static greeting */}
          {config.greeting && (
            <div className="oliver-cmd-greeting">
              <div className="chatbot-msg chatbot-msg--assistant">
                <div className="chatbot-msg-text">{config.greeting}</div>
              </div>
            </div>
          )}

          {/* Quick command chips */}
          {fabActions.length > 0 && (
            <div className="oliver-fab-row" role="toolbar" aria-label="Quick commands">
              {fabActions.map(a => (
                <button
                  key={a.id}
                  type="button"
                  className="oliver-fab-chip"
                  onMouseDown={e => { e.preventDefault(); executeAction(a) }}
                  title={a.hint || a.label}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {/* Chat messages */}
          <div ref={messagesRef} className="chatbot-messages" aria-live="polite" aria-atomic="false">
            {items.map(it => {
              if (it.kind === 'msg') {
                return (
                  <div key={it.id} className={'chatbot-msg chatbot-msg--' + it.role}>
                    <div className="chatbot-msg-text">{it.text}</div>
                    {it.role === 'assistant' && it.model && (
                      <div className="chatbot-msg-model">{it.model}</div>
                    )}
                  </div>
                )
              }
              if (it.kind === 'parse-result') {
                return (
                  <div key={it.id} className="chatbot-parse-card">
                    <div className="chatbot-parse-header">
                      <span className="chatbot-parse-title">{it.title}</span>
                      <span className="chatbot-msg-model">{it.model}</span>
                    </div>
                    <pre className="chatbot-parse-pre">{it.summary}</pre>
                    <div className="chatbot-parse-actions">
                      <button className="btn btn-primary btn--compact" onClick={() => setReviewModal({ itemId: it.id, payload: it.payload })}>Review &amp; Edit</button>
                      <button className="btn btn-ghost btn--compact" onClick={() => setItems(prev => prev.filter(x => x.id !== it.id))}>Discard</button>
                    </div>
                  </div>
                )
              }
              if (it.kind === 'write-prompt') {
                return (
                  <div key={it.id} className="chatbot-parse-card chatbot-confirm-card">
                    <pre className="chatbot-parse-pre">{it.text}</pre>
                    <div className="chatbot-parse-actions">
                      <button className="btn btn-primary btn--compact" onClick={() => handleConfirmWrite(it.id, it.payload)}>
                        {it.hasConflicts ? 'Write Anyway' : 'Confirm & Write'}
                      </button>
                      <button className="btn btn-ghost btn--compact" onClick={() => setItems(prev => prev.filter(x => x.id !== it.id))}>Cancel</button>
                    </div>
                  </div>
                )
              }
              return null
            })}
            {busy && (
              <div className="chatbot-msg chatbot-msg--assistant chatbot-msg--typing">
                <span className="chatbot-typing-dot" />
                <span className="chatbot-typing-dot" />
                <span className="chatbot-typing-dot" />
              </div>
            )}
            {flowState && (() => {
              const step = flowState.flow.steps[flowState.stepIdx]
              if (!step) return null
              if (step.kind === 'choice') {
                return (
                  <div className="oliver-fab-row" role="toolbar" aria-label={step.id}>
                    {step.choices.map(c => (
                      <button key={c.value} className="oliver-fab-chip" onMouseDown={e => { e.preventDefault(); supplyFlowAnswer(c.value) }}>{c.label}</button>
                    ))}
                    {step.optional && (
                      <button className="oliver-fab-chip" onMouseDown={e => { e.preventDefault(); supplyFlowAnswer('') }}>Skip</button>
                    )}
                    <button className="oliver-fab-chip" onMouseDown={e => { e.preventDefault(); cancelFlow() }}>Cancel</button>
                  </div>
                )
              }
              if (step.kind === 'entity') {
                return (
                  <div className="oliver-fab-row" role="toolbar" aria-label={step.id}>
                    {step.options().slice(0, 12).map(o => (
                      <button key={o.value} className="oliver-fab-chip" onMouseDown={e => { e.preventDefault(); supplyFlowAnswer(o.value) }}>{o.label}</button>
                    ))}
                    <button className="oliver-fab-chip" onMouseDown={e => { e.preventDefault(); cancelFlow() }}>Cancel</button>
                  </div>
                )
              }
              // text / number — rendered inline-cancel only; typed value flows through send().
              return (
                <div className="oliver-fab-row" role="toolbar" aria-label={step.id}>
                  {step.optional && (
                    <button className="oliver-fab-chip" onMouseDown={e => { e.preventDefault(); supplyFlowAnswer('') }}>Skip</button>
                  )}
                  <button className="oliver-fab-chip" onMouseDown={e => { e.preventDefault(); cancelFlow() }}>Cancel</button>
                </div>
              )
            })()}
          </div>

          {/* Typeahead suggestions */}
          {suggestions.length > 0 && input.trim() && (
            <div className="oliver-suggestions" role="listbox" aria-label="Matching commands">
              {suggestions.map(a => (
                <button
                  key={a.id}
                  role="option"
                  aria-selected={false}
                  className="oliver-suggestion-item"
                  onMouseDown={e => { e.preventDefault(); executeAction(a) }}
                >
                  <span className="oliver-suggestion-label">{a.label}</span>
                  {a.hint && <span className="oliver-suggestion-hint">{a.hint}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Upload guidance */}
          {config.upload?.guidance && (
            <div className="oliver-upload-guidance">{config.upload.guidance}</div>
          )}

          <ChatbotInputBar
            ref={inputRef}
            value={input}
            onChange={setInput}
            onSend={send}
            onUpload={config.upload ? () => fileInputRef.current?.click() : undefined}
            uploadTitle={config.upload?.hint}
            onMic={toggleMic}
            listening={listening}
            sendDisabled={busy || !input.trim()}
            placeholder={config.placeholder}
            onEscape={() => setInput('')}
          />
        </div>
      </div>
      {reviewModal && (
        <TranscriptReviewModal
          payload={reviewModal.payload}
          onConfirm={edited => {
            const id = reviewModal.itemId
            setItems(prev => prev.filter(it => it.id !== id))
            setReviewModal(null)
            handleReview(id, edited)
          }}
          onCancel={() => setReviewModal(null)}
        />
      )}
    </>
  )
}
