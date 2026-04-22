'use client'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useOliverContext } from './OliverContext'
import type { OliverAction } from './OliverContext'
import { fuzzyFilter } from '@/lib/fuzzy'
import TranscriptReviewModal from './TranscriptReviewModal'

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'

// Module-level upload trigger so page components can fire it via an action.
let _uploadTrigger: (() => void) | null = null
export function triggerOliverUpload() { _uploadTrigger?.() }

type ChatItem =
  | { id: number; kind: 'msg'; role: 'user' | 'assistant'; text: string; model?: string }
  | { id: number; kind: 'parse-result'; title: string; summary: string; model: string; payload: unknown }
  | { id: number; kind: 'write-prompt'; text: string; hasConflicts: boolean; payload: unknown }

export default function OliverDock() {
  const { config, openSignal } = useOliverContext()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [items, setItems] = useState<ChatItem[]>([])
  const [busy, setBusy] = useState(false)
  const [reviewModal, setReviewModal] = useState<{ itemId: number; payload: unknown } | null>(null)
  const [listening, setListening] = useState(false)
  const idRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  const nextId = () => ++idRef.current

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
    if (open) setTimeout(() => inputRef.current?.focus(), 40)
  }, [open])

  // Chip row: all non-granular actions (wraps to multiple lines).
  // Granular per-entity actions (edit person X) stay hidden from chips and only
  // surface via fuzzy typeahead.
  const fabActions = useMemo(() => config?.actions.filter(a => !a.granular) ?? [], [config])

  // Fuzzy suggestions driven by input (top 3, ≤2 edits).
  const suggestions = useMemo(() => {
    if (!config || !input.trim()) return []
    return fuzzyFilter(input, config.actions, a => a.label + ' ' + (a.hint ?? ''))
      .slice(0, 3)
      .map(h => h.item)
  }, [config, input])

  async function executeAction(a: OliverAction) {
    setInput('')
    try { await a.run() } catch (err) { console.error('[Oliver] action failed', a.id, err) }
  }

  const sendChat = useCallback(async (text: string) => {
    if (!config || !text || busy) return
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
    // Execute top fuzzy match; fall through to chat if none found.
    if (suggestions.length > 0) {
      executeAction(suggestions[0])
      return
    }
    sendChat(text)
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
        <div className="chatbot-header">
          <span className="chatbot-header-label">Oliver &middot; {config.pageLabel}</span>
          {items.some(it => it.kind === 'msg') && (
            <button
              className="chatbot-export-btn chatbot-tooltip-wrap"
              aria-label="Export conversation"
              data-tooltip="Export conversation"
              onClick={exportConversation}
            >
              &#8595;
            </button>
          )}
          <button
            className="chatbot-close-btn"
            aria-label="Close Oliver"
            title="Close Oliver"
            onClick={() => setOpen(false)}
          >
            &#215;
          </button>
        </div>

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

          {/* Input bar */}
          <div className="chatbot-input-row">
            {config.upload && (
              <button
                type="button"
                className="btn btn-ghost btn--compact"
                title={config.upload.hint}
                aria-label="Upload file"
                onClick={() => fileInputRef.current?.click()}
                style={{ flexShrink: 0 }}
              >
                &#128206;
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn--compact"
              title={listening ? 'Stop recording' : 'Start voice input'}
              aria-label={listening ? 'Stop recording' : 'Start voice input'}
              aria-pressed={listening}
              onClick={toggleMic}
              style={{ flexShrink: 0, color: listening ? 'var(--color-brand-primary)' : undefined }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
                <path d="M12 19v3" />
              </svg>
            </button>
            <input
              ref={inputRef}
              type="text"
              className="chatbot-input"
              placeholder={config.placeholder}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                if (e.key === 'Escape') setInput('')
              }}
              aria-label="Message or command"
              aria-autocomplete="list"
            />
            <button
              className="btn btn-primary btn--compact chatbot-send"
              aria-label="Send"
              disabled={busy || !input.trim()}
              onClick={send}
            >
              Send
            </button>
          </div>
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
