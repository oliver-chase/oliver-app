'use client'
import { useState, useRef, useEffect } from 'react'
import type { AppState } from '@/types'

interface Props {
  accountId: string
  data: AppState
}

interface Message {
  role: 'user' | 'assistant'
  text: string
}

export default function ChatbotPanel({ accountId, data }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [busy, setBusy] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setBusy(true)
    try {
      // TODO: implement POST /api/chat with account context
      // const acct = data.accounts.find(a => a.account_id === accountId)
      // const bg = data.background.find(b => b.account_id === accountId && !b.engagement_id)
      // const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ message: text, accountId, context: { accountName: acct?.account_name, ... } }) })
      // const { reply } = await res.json()
      const reply = '[TODO: API not yet connected — POST /api/chat]'
      setMessages(prev => [...prev, { role: 'assistant', text: reply }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error sending message.' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        className="chatbot-trigger"
        id="chatbot-trigger"
        aria-expanded={open}
        aria-controls="chatbot-panel"
        aria-label="Open Oliver"
        title="Open Oliver"
        onClick={() => setOpen(o => !o)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      <div
        className={'chatbot-panel' + (open ? ' chatbot-panel--open' : '')}
        id="chatbot-panel"
        role="complementary"
        aria-label="Oliver"
      >
        <div className="chatbot-header">
          <span className="chatbot-header-label">Oliver</span>
          <button className="chatbot-export-btn" id="chatbot-export" aria-label="Export conversation" title="Export conversation"
            onClick={() => {
              // TODO: export conversation to markdown
              const md = messages.map(m => (m.role === 'user' ? '**You:** ' : '**Oliver:** ') + m.text).join('\n\n')
              navigator.clipboard.writeText(md).catch(() => {})
            }}
          >&#8595;</button>
          <button className="chatbot-close-btn" id="chatbot-close" aria-label="Close Oliver" title="Close Oliver" onClick={() => setOpen(false)}>×</button>
        </div>

        <div className="chatbot-body">
          <div ref={messagesRef} className="chatbot-messages">
            {messages.length === 0 && (
              <div className="chatbot-msg chatbot-msg--assistant">
                <div className="chatbot-msg-bubble">
                  Ask me anything about this account — actions, contacts, history, or strategy.
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={'chatbot-msg chatbot-msg--' + msg.role}>
                <div className="chatbot-msg-bubble">{msg.text}</div>
              </div>
            ))}
            {busy && (
              <div className="chatbot-msg chatbot-msg--assistant">
                <div className="chatbot-msg-bubble chatbot-typing">
                  <span className="chatbot-typing-dot" />
                  <span className="chatbot-typing-dot" />
                  <span className="chatbot-typing-dot" />
                </div>
              </div>
            )}
          </div>

          <div className="chatbot-input-row">
            <textarea
              ref={inputRef}
              className="chatbot-input"
              placeholder="Ask a question\u2026"
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
            />
            <button
              className={'chatbot-send-btn' + (busy ? ' chatbot-send-btn--busy' : '')}
              disabled={busy || !input.trim()}
              aria-label="Send message"
              onClick={send}
            >&#9654;</button>
          </div>
        </div>
      </div>
    </>
  )
}
