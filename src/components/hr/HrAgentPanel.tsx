'use client'
import { useState, useRef, useEffect } from 'react'
import type { HrDB, HrPage } from './types'

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'

let _nextId = 0
function nextId() { return ++_nextId }

type MsgItem =
  | { id: number; kind: 'msg'; role: 'user' | 'assistant'; text: string; model?: string }
  | { id: number; kind: 'topic-prompt' }

interface Props {
  db: HrDB
  currentPage: HrPage
}

export default function HrAgentPanel({ db, currentPage }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [items, setItems] = useState<MsgItem[]>([])
  const [busy, setBusy] = useState(false)
  const [initialShown, setInitialShown] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [items, busy])

  function addMsg(role: 'user' | 'assistant', text: string, model?: string) {
    setItems(prev => [...prev, { id: nextId(), kind: 'msg', role, text, model }])
  }

  function handleOpen() {
    setOpen(true)
    if (!initialShown) {
      setInitialShown(true)
      setItems(prev => [...prev, {
        id: nextId(), kind: 'msg', role: 'assistant',
        text: "Hi, I'm Oliver! I can answer questions about your HR data — candidates, employees, onboarding, devices, and more.",
      }])
    }
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleClose() { setOpen(false) }

  function getContextData() {
    return {
      currentPage,
      summary: {
        candidates: db.candidates.length,
        active_candidates: db.candidates.filter(c => c.candStatus === 'Active').length,
        employees: db.employees.length,
        devices: db.devices.length,
        open_onboarding: db.onboardingRuns.filter(r => r.status === 'active' && r.type === 'onboarding').length,
        open_offboarding: db.onboardingRuns.filter(r => r.status === 'active' && r.type === 'offboarding').length,
        tracks: db.tracks.length,
      },
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    const msgHistory = items
      .filter((it): it is Extract<MsgItem, { kind: 'msg' }> => it.kind === 'msg')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.text }))
    const newHistory = [...msgHistory, { role: 'user' as const, content: text }]
    setItems(prev => [...prev, { id: nextId(), kind: 'msg', role: 'user', text }])
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.slice(-20),
          pageContext: 'HR',
          accountData: getContextData(),
        }),
      })
      const json = await res.json() as { reply?: string; error?: string; model?: string }
      if (json.error) {
        addMsg('assistant', 'Error: ' + json.error)
      } else {
        addMsg('assistant', json.reply ?? 'No response.', json.model ?? DEFAULT_MODEL)
      }
    } catch {
      addMsg('assistant', 'Network error. Try again.')
    } finally {
      setBusy(false)
      setItems(prev => [...prev, { id: nextId(), kind: 'topic-prompt' }])
    }
  }

  function renderItem(item: MsgItem) {
    if (item.kind === 'msg') {
      return (
        <div key={item.id} className={'chatbot-msg chatbot-msg--' + item.role}>
          <div className="chatbot-msg-text">{item.text}</div>
          {item.role === 'assistant' && (
            <div className="chatbot-msg-model">{item.model ?? DEFAULT_MODEL}</div>
          )}
        </div>
      )
    }

    if (item.kind === 'topic-prompt') {
      return (
        <div key={item.id} className="chatbot-topic-prompt" aria-label="Continue or start new conversation">
          <div className="chatbot-topic-text">More on this topic or start something new?</div>
          <div className="chatbot-topic-actions">
            <button className="btn btn-ghost btn--compact" onClick={() => inputRef.current?.focus()}>Continue</button>
            <button className="btn btn-primary btn--compact" onClick={() => {
              setItems([])
              setInitialShown(false)
              setTimeout(() => inputRef.current?.focus(), 50)
            }}>New Topic</button>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <>
      <button
        className="chatbot-trigger chatbot-trigger--hr"
        aria-expanded={open}
        aria-controls="hr-chatbot-panel"
        aria-label={open ? 'Close Oliver' : 'Open Oliver'}
        title={open ? 'Close Oliver' : 'Open Oliver'}
        onClick={() => { if (open) handleClose(); else handleOpen() }}
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
        id="hr-chatbot-panel"
        role="complementary"
        aria-label="Oliver"
      >
        <div className="chatbot-header">
          <span className="chatbot-header-label">Oliver</span>
          <button
            className="chatbot-close-btn"
            aria-label="Close Oliver"
            title="Close Oliver"
            onClick={handleClose}
          >
            &#215;
          </button>
        </div>

        <div className="chatbot-body" aria-hidden={!open}>
          <div
            ref={messagesRef}
            className="chatbot-messages"
            aria-live="polite"
            aria-atomic="false"
          >
            {items.map(renderItem)}
            {busy && (
              <div className="chatbot-msg chatbot-msg--assistant chatbot-msg--typing">
                <span className="chatbot-typing-dot" />
                <span className="chatbot-typing-dot" />
                <span className="chatbot-typing-dot" />
              </div>
            )}
          </div>

          <div className="chatbot-input-row">
            <textarea
              ref={inputRef}
              className="chatbot-input"
              rows={1}
              aria-label="Message"
              placeholder="Ask about HR data..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
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
        </div>
      </div>
    </>
  )
}
