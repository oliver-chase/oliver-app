'use client'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useOliverContext } from './OliverContext'
import type { OliverAction } from './OliverContext'
import { fuzzyFilter } from '@/lib/fuzzy'

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'

type Mode = 'command' | 'chat'

type ChatItem =
  | { id: number; kind: 'msg'; role: 'user' | 'assistant'; text: string; model?: string }
  | { id: number; kind: 'topic-prompt' }
  | { id: number; kind: 'parse-result'; title: string; summary: string; model: string; payload: unknown }
  | { id: number; kind: 'write-prompt'; text: string; hasConflicts: boolean; payload: unknown }

export default function OliverDock() {
  const { config, openSignal } = useOliverContext()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('command')
  const [q, setQ] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [items, setItems] = useState<ChatItem[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [greeted, setGreeted] = useState(false)
  const idRef = useRef(0)
  const cmdInputRef = useRef<HTMLInputElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const nextId = () => ++idRef.current

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [items, busy])

  useEffect(() => {
    if (!config) return
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        setMode('command')
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
    if (openSignal > 0) { setOpen(true); setMode('command') }
  }, [openSignal])

  useEffect(() => {
    if (!open) return
    if (mode === 'command') setTimeout(() => cmdInputRef.current?.focus(), 40)
    else setTimeout(() => chatInputRef.current?.focus(), 40)
  }, [open, mode])

  const filtered = useMemo(() => {
    if (!config) return []
    return fuzzyFilter(q, config.actions, a => a.label + ' ' + a.group + ' ' + (a.hint || '')).map(h => h.item)
  }, [config, q])

  useEffect(() => { setActiveIdx(0) }, [q])

  const groupOrder: OliverAction['group'][] = ['Search', 'Create', 'Quick']
  const grouped = useMemo(() => {
    return groupOrder
      .map(g => ({ group: g, items: filtered.filter(a => a.group === g) }))
      .filter(g => g.items.length > 0)
  }, [filtered])

  // FAB row: top 4 matches across all groups, always visible when the dock is open.
  const fabActions = useMemo(() => filtered.slice(0, 4), [filtered])

  const enterChat = useCallback((seed?: string) => {
    setMode('chat')
    if (!greeted && config?.greeting) {
      setItems([{ id: nextId(), kind: 'msg', role: 'assistant', text: config.greeting }])
      setGreeted(true)
    }
    if (seed) setInput(seed)
  }, [greeted, config])

  async function executeAction(a: OliverAction) {
    setOpen(false)
    setQ('')
    try { await a.run() } catch (err) { console.error('[Oliver] action failed', a.id, err) }
  }

  function onCmdKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(filtered.length - 1, i + 1)); return }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)); return }
    if (e.key === 'Enter') {
      e.preventDefault()
      const a = filtered[activeIdx]
      if (a) executeAction(a)
      else if (q.trim()) enterChat(q.trim())
    }
  }

  async function sendChat() {
    if (!config) return
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    const history = items
      .filter((it): it is Extract<ChatItem, { kind: 'msg' }> => it.kind === 'msg')
      .map(m => ({ role: m.role, content: m.text }))
    const newHistory = [...history, { role: 'user' as const, content: text }]
    setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'user', text }])
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.slice(-20),
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
      setItems(prev => [...prev, { id: nextId(), kind: 'topic-prompt' }])
    }
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

  if (!config) return null

  return (
    <>
      <button
        className="chatbot-trigger"
        aria-expanded={open}
        aria-controls="oliver-dock-panel"
        aria-label={open ? 'Close Oliver' : 'Open Oliver'}
        title={open ? 'Close Oliver' : 'Open Oliver (\u2318K)'}
        onClick={() => { setOpen(o => !o); setMode('command') }}
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
          {mode === 'chat' && (
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
              if (file) {
                if (mode !== 'chat') enterChat()
                ;(async () => {
                  if (!config.upload) return
                  setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'Reading ' + file.name + '\u2026' }])
                  try {
                    const r = await config.upload.parse(file)
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

        <div className="chatbot-body" aria-hidden={!open}>
          {mode === 'command' ? (
            <CommandMode
              config={config}
              q={q}
              setQ={setQ}
              filtered={filtered}
              grouped={grouped}
              fabActions={fabActions}
              activeIdx={activeIdx}
              setActiveIdx={setActiveIdx}
              execute={executeAction}
              enterChat={enterChat}
              inputRef={cmdInputRef}
              onKey={onCmdKey}
              onUploadClick={() => fileInputRef.current?.click()}
            />
          ) : (
            <ChatMode
              config={config}
              items={items}
              busy={busy}
              input={input}
              setInput={setInput}
              send={sendChat}
              back={() => { setMode('command'); setQ('') }}
              onUploadClick={() => fileInputRef.current?.click()}
              chatInputRef={chatInputRef}
              messagesRef={messagesRef}
              onReview={async (itemId, payload) => {
                if (!config.upload) return
                setItems(prev => prev.filter(it => it.id !== itemId))
                setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'Checking for conflicts\u2026' }])
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
              }}
              onDiscard={itemId => { setItems(prev => prev.filter(it => it.id !== itemId)) }}
              onConfirmWrite={async (itemId, payload) => {
                if (!config.upload) return
                setItems(prev => prev.filter(it => it.id !== itemId))
                setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'Writing to database\u2026' }])
                try {
                  const res = await config.upload.commit(payload)
                  setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: res.message }])
                  config.onChatRefresh?.()
                } catch (err) {
                  console.error('[Oliver] commit failed', err)
                  setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'assistant', text: 'Write failed: ' + (err instanceof Error ? err.message : String(err)) }])
                }
              }}
              onQuickConvo={(preset: string) => { setInput(preset); setTimeout(() => chatInputRef.current?.focus(), 40) }}
            />
          )}
        </div>
      </div>
    </>
  )
}

interface CommandModeProps {
  config: ReturnType<typeof useOliverContext>['config']
  q: string
  setQ: (v: string) => void
  filtered: OliverAction[]
  grouped: { group: OliverAction['group']; items: OliverAction[] }[]
  fabActions: OliverAction[]
  activeIdx: number
  setActiveIdx: (n: number) => void
  execute: (a: OliverAction) => void
  enterChat: (seed?: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  onKey: (e: React.KeyboardEvent) => void
  onUploadClick: () => void
}

function CommandMode({ config, q, setQ, filtered, grouped, fabActions, activeIdx, setActiveIdx, execute, enterChat, inputRef, onKey, onUploadClick }: CommandModeProps) {
  if (!config) return null
  const empty = filtered.length === 0
  return (
    <div className="oliver-cmd">
      <div className="oliver-cmd-search">
        <input
          ref={inputRef}
          className="cp-input"
          type="text"
          placeholder={config.placeholder}
          value={q}
          onChange={e => setQ(e.currentTarget.value)}
          onKeyDown={onKey}
          aria-label="What do you want to do"
        />
      </div>
      {fabActions.length > 0 && (
        <div className="oliver-fab-row" role="toolbar" aria-label="Quick commands">
          {fabActions.map(a => (
            <button
              key={a.id}
              type="button"
              className="oliver-fab-chip"
              onMouseDown={e => { e.preventDefault(); execute(a) }}
              title={a.hint || a.label}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
      {config.upload && (
        <div className="chatbot-upload-row">
          <button
            className="btn btn-primary btn--compact"
            type="button"
            title={config.upload.hint}
            onClick={onUploadClick}
          >
            Upload
          </button>
          <span className="chatbot-upload-hint">{config.upload.hint}</span>
        </div>
      )}
      <div className="oliver-cmd-body" role="listbox">
        {empty ? (
          <div className="oliver-empty">
            <div className="oliver-empty-title">No matching command</div>
            <div className="oliver-empty-sub">Ask Oliver in chat, or switch to live chat.</div>
            <div className="oliver-empty-actions">
              <button className="btn btn-primary btn--compact" onClick={() => enterChat(q.trim() || undefined)}>Ask Oliver</button>
              <button
                className="btn btn-ghost btn--compact"
                onClick={() => {
                  window.open('mailto:support@v-two.com?subject=Live%20chat%20request', '_blank')
                }}
              >
                Live chat
              </button>
            </div>
          </div>
        ) : grouped.map(g => (
          <div key={g.group} role="group" aria-label={g.group}>
            <div className="cp-group-label" aria-hidden="true">{g.group}</div>
            {g.items.map(a => {
              const flatIdx = filtered.indexOf(a)
              const active = flatIdx === activeIdx
              return (
                <div
                  key={a.id}
                  role="option"
                  aria-selected={active}
                  className={'cp-item' + (active ? ' selected' : '')}
                  onMouseEnter={() => setActiveIdx(flatIdx)}
                  onMouseDown={e => { e.preventDefault(); execute(a) }}
                >
                  <div className="cp-item-text">
                    <div className="cp-item-title">{a.label}</div>
                    {a.hint && <div className="cp-item-sub">{a.hint}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div className="oliver-cmd-footer">
        <button className="btn-link" onClick={() => enterChat()}>Open chat &rarr;</button>
      </div>
    </div>
  )
}

interface ChatModeProps {
  config: NonNullable<ReturnType<typeof useOliverContext>['config']>
  items: ChatItem[]
  busy: boolean
  input: string
  setInput: (v: string) => void
  send: () => void
  back: () => void
  onUploadClick: () => void
  onReview: (itemId: number, payload: unknown) => void
  onDiscard: (itemId: number) => void
  onConfirmWrite: (itemId: number, payload: unknown) => void
  onQuickConvo: (preset: string) => void
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>
  messagesRef: React.RefObject<HTMLDivElement | null>
}

function ChatMode({ config, items, busy, input, setInput, send, back, onUploadClick, onReview, onDiscard, onConfirmWrite, onQuickConvo, chatInputRef, messagesRef }: ChatModeProps) {
  return (
    <>
      <div className="oliver-chat-back">
        <button className="btn-link" onClick={back}>&larr; Commands</button>
      </div>
      <div
        ref={messagesRef}
        className="chatbot-messages"
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map(it => {
          if (it.kind === 'msg') {
            return (
              <div key={it.id} className={'chatbot-msg chatbot-msg--' + it.role}>
                <div className="chatbot-msg-text">{it.text}</div>
                {it.role === 'assistant' && (
                  <div className="chatbot-msg-model">{it.model ?? DEFAULT_MODEL}</div>
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
                  <button className="btn btn-primary btn--compact" onClick={() => onReview(it.id, it.payload)}>Review &amp; Confirm</button>
                  <button className="btn btn-ghost btn--compact" onClick={() => onDiscard(it.id)}>Discard</button>
                </div>
              </div>
            )
          }
          if (it.kind === 'write-prompt') {
            return (
              <div key={it.id} className="chatbot-parse-card chatbot-confirm-card">
                <pre className="chatbot-parse-pre">{it.text}</pre>
                <div className="chatbot-parse-actions">
                  <button className="btn btn-primary btn--compact" onClick={() => onConfirmWrite(it.id, it.payload)}>
                    {it.hasConflicts ? 'Write Anyway' : 'Confirm & Write'}
                  </button>
                  <button className="btn btn-ghost btn--compact" onClick={() => onDiscard(it.id)}>Cancel</button>
                </div>
              </div>
            )
          }
          return (
            <div key={it.id} className="chatbot-topic-prompt">
              <div className="chatbot-topic-text">More on this topic or start something new?</div>
              <div className="chatbot-topic-actions">
                <button className="btn btn-ghost btn--compact" onClick={() => chatInputRef.current?.focus()}>Continue</button>
                <button className="btn btn-primary btn--compact" onClick={back}>New Topic</button>
              </div>
            </div>
          )
        })}
        {busy && (
          <div className="chatbot-msg chatbot-msg--assistant chatbot-msg--typing">
            <span className="chatbot-typing-dot" />
            <span className="chatbot-typing-dot" />
            <span className="chatbot-typing-dot" />
          </div>
        )}
      </div>

      {config.upload && (
        <div className="chatbot-upload-zone">
          <div className="chatbot-upload-row">
            <button
              className="btn btn-primary btn--compact"
              type="button"
              title={config.upload.hint}
              onClick={onUploadClick}
            >
              Upload
            </button>
            <span className="chatbot-upload-hint">{config.upload.hint}</span>
          </div>
        </div>
      )}

      {config.quickConvos && config.quickConvos.length > 0 && (
        <div className="oliver-quick-convos">
          {config.quickConvos.map((preset, i) => (
            <button key={i} className="btn-dashed btn--compact" onClick={() => onQuickConvo(preset)}>
              {preset}
            </button>
          ))}
        </div>
      )}

      <div className="chatbot-input-row">
        <textarea
          ref={chatInputRef}
          className="chatbot-input"
          rows={1}
          aria-label="Message"
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
        />
        <button
          className="btn btn-primary btn--compact chatbot-send"
          aria-label="Send"
          disabled={busy}
          onClick={send}
        >
          Send
        </button>
      </div>
    </>
  )
}
