'use client'
import { useState, useRef, useEffect } from 'react'
import type { AppState } from '@/types'

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'

type MsgItem =
  | { kind: 'msg'; role: 'user' | 'assistant'; text: string; model?: string }
  | { kind: 'topic-prompt' }

type UploadCard =
  | { phase: 'confirm'; file: File; instruction: string }
  | { phase: 'parsing' }
  | { phase: 'result'; summary: string; model: string; payload: unknown; file: File }
  | { phase: 'write-check'; conflicts: string[]; payload: unknown }
  | { phase: 'writing' }

interface Props {
  accountId: string
  data: AppState
}

export default function ChatbotPanel({ accountId, data }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [items, setItems] = useState<MsgItem[]>([])
  const [busy, setBusy] = useState(false)
  const [uploadCard, setUploadCard] = useState<UploadCard | null>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [items, uploadCard, busy])

  function getContextData() {
    const acct = data.accounts.find(a => a.account_id === accountId)
    const bg = data.background?.find(
      (b: { account_id: string; engagement_id?: string }) => b.account_id === accountId && !b.engagement_id
    )
    const stakeholders = data.stakeholders?.filter(s => s.account_id === accountId) ?? []
    const actions = data.actions?.filter(a => a.account_id === accountId) ?? []
    const opportunities = data.opportunities?.filter(o => o.account_id === accountId) ?? []
    const projects = data.projects?.filter(p => p.account_id === accountId) ?? []
    return { account: acct, background: bg, stakeholders, actions, opportunities, projects }
  }

  function exportConversation() {
    const msgs = items.filter((it): it is Extract<MsgItem, { kind: 'msg' }> => it.kind === 'msg')
    if (!msgs.length) return
    const text = msgs.map(m => (m.role === 'user' ? 'You: ' : 'Oliver: ') + m.text).join('\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const d = new Date()
    const date =
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    a.href = url
    a.download = 'oliver-conversation-' + date + '.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    const msgHistory = items
      .filter((it): it is Extract<MsgItem, { kind: 'msg' }> => it.kind === 'msg')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.text }))
    const newHistory = [...msgHistory, { role: 'user' as const, content: text }]
    setItems(prev => [...prev, { kind: 'msg', role: 'user', text }])
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.slice(-20),
          pageContext: 'Account page',
          accountData: getContextData(),
        }),
      })
      const json = await res.json() as { reply?: string; error?: string; model?: string }
      if (json.error) {
        setItems(prev => [...prev, { kind: 'msg', role: 'assistant', text: json.error! }])
      } else {
        setItems(prev => [
          ...prev,
          { kind: 'msg', role: 'assistant', text: json.reply ?? 'No response.', model: json.model ?? DEFAULT_MODEL },
        ])
      }
    } catch {
      setItems(prev => [...prev, { kind: 'msg', role: 'assistant', text: 'Something went wrong. Please try again.' }])
    } finally {
      setBusy(false)
      setItems(prev => [...prev, { kind: 'topic-prompt' }])
    }
  }

  function showUploadConfirm(file: File) {
    setUploadCard({ phase: 'confirm', file, instruction: '' })
  }

  function readAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  function readAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleFile(file: File, instruction: string) {
    setUploadCard({ phase: 'parsing' })
    try {
      let result: Record<string, unknown>
      if (file.type.startsWith('image/')) {
        const base64 = await readAsBase64(file)
        const res = await fetch('/api/parse-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mediaType: file.type, contextInstruction: instruction }),
        })
        result = await res.json()
      } else {
        const text = await readAsText(file)
        const res = await fetch('/api/parse-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, filename: file.name, contextInstruction: instruction }),
        })
        result = await res.json()
      }
      if (result.error) {
        setItems(prev => [...prev, { kind: 'msg', role: 'assistant', text: 'Parse error: ' + String(result.error) }])
        setUploadCard(null)
      } else {
        setUploadCard({
          phase: 'result',
          summary: String(result.summary ?? ''),
          model: String(result.model ?? DEFAULT_MODEL),
          payload: result,
          file,
        })
      }
    } catch {
      setItems(prev => [...prev, { kind: 'msg', role: 'assistant', text: 'Error parsing file.' }])
      setUploadCard(null)
    }
  }

  async function startConfirm(payload: unknown) {
    setUploadCard({ phase: 'parsing' })
    try {
      const res = await fetch('/api/confirm-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, payload, dryRun: true }),
      })
      const json = await res.json() as { conflicts?: string[]; error?: string }
      if (json.error) {
        setItems(prev => [...prev, { kind: 'msg', role: 'assistant', text: 'Conflict check error: ' + json.error }])
        setUploadCard(null)
      } else {
        setUploadCard({ phase: 'write-check', conflicts: json.conflicts ?? [], payload })
      }
    } catch {
      setItems(prev => [...prev, { kind: 'msg', role: 'assistant', text: 'Error checking conflicts.' }])
      setUploadCard(null)
    }
  }

  async function doWrite(payload: unknown) {
    setUploadCard({ phase: 'writing' })
    try {
      const res = await fetch('/api/confirm-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, payload, dryRun: false }),
      })
      const json = await res.json() as { message?: string; error?: string }
      setItems(prev => [
        ...prev,
        { kind: 'msg', role: 'assistant', text: json.message ?? json.error ?? 'Write complete.' },
      ])
    } catch {
      setItems(prev => [...prev, { kind: 'msg', role: 'assistant', text: 'Error writing data.' }])
    } finally {
      setUploadCard(null)
    }
  }

  function renderUploadCard() {
    if (!uploadCard) return null
    if (uploadCard.phase === 'confirm') {
      const { file, instruction } = uploadCard
      return (
        <div className="chatbot-upload-confirm">
          <div className="chatbot-upload-confirm-name">{file.name}</div>
          <textarea
            className="chatbot-confirm-input"
            placeholder="Context or instruction (optional)"
            rows={2}
            value={instruction}
            onChange={e => setUploadCard({ phase: 'confirm', file, instruction: e.target.value })}
          />
          <div className="chatbot-upload-confirm-actions">
            <button className="btn btn-primary btn--compact" onClick={() => handleFile(file, instruction)}>
              Send
            </button>
            <button className="btn btn-ghost btn--compact" onClick={() => setUploadCard(null)}>
              Cancel
            </button>
          </div>
        </div>
      )
    }
    if (uploadCard.phase === 'parsing' || uploadCard.phase === 'writing') {
      return (
        <div className="chatbot-parse-card">
          <div className="chatbot-msg-bubble chatbot-typing">
            <span className="chatbot-typing-dot" />
            <span className="chatbot-typing-dot" />
            <span className="chatbot-typing-dot" />
          </div>
        </div>
      )
    }
    if (uploadCard.phase === 'result') {
      const { summary, model, payload, file } = uploadCard
      return (
        <div className="chatbot-parse-card">
          <div className="chatbot-parse-card-header">
            <span>{file.name}</span>
            <span className="chatbot-msg-model">{model}</span>
          </div>
          <pre className="chatbot-parse-pre">{summary}</pre>
          <div className="chatbot-parse-actions">
            <button className="btn btn-primary btn--compact" onClick={() => startConfirm(payload)}>
              Review &amp; Confirm
            </button>
            <button className="btn btn-ghost btn--compact" onClick={() => setUploadCard(null)}>
              Discard
            </button>
          </div>
        </div>
      )
    }
    if (uploadCard.phase === 'write-check') {
      const { conflicts, payload } = uploadCard
      return (
        <div className="chatbot-parse-card">
          {conflicts.length > 0 ? (
            <>
              <div className="chatbot-parse-card-header">Conflicts found</div>
              <ul className="chatbot-conflicts">
                {conflicts.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
              <div className="chatbot-parse-actions">
                <button className="btn btn-primary btn--compact" onClick={() => doWrite(payload)}>
                  Write Anyway
                </button>
                <button className="btn btn-ghost btn--compact" onClick={() => setUploadCard(null)}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="chatbot-parse-card-header">Ready to write</div>
              <div className="chatbot-parse-actions">
                <button className="btn btn-primary btn--compact" onClick={() => doWrite(payload)}>
                  Confirm &amp; Write
                </button>
                <button className="btn btn-ghost btn--compact" onClick={() => setUploadCard(null)}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )
    }
    return null
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
          <button
            className="chatbot-export-btn"
            id="chatbot-export"
            aria-label="Export conversation"
            title="Export conversation"
            onClick={exportConversation}
          >
            &#8595;
          </button>
          <button
            className="chatbot-close-btn"
            id="chatbot-close"
            aria-label="Close Oliver"
            title="Close Oliver"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>

        <div className="chatbot-body">
          <div ref={messagesRef} className="chatbot-messages">
            {items.length === 0 && !uploadCard && (
              <div className="chatbot-msg chatbot-msg--assistant">
                <div className="chatbot-msg-bubble">
                  Ask me anything about this account — actions, contacts, history, or strategy.
                </div>
              </div>
            )}
            {items.map((item, i) => {
              if (item.kind === 'msg') {
                return (
                  <div key={i} className={'chatbot-msg chatbot-msg--' + item.role}>
                    <div className="chatbot-msg-bubble">{item.text}</div>
                    {item.role === 'assistant' && (
                      <div className="chatbot-msg-model">{item.model ?? DEFAULT_MODEL}</div>
                    )}
                  </div>
                )
              }
              if (item.kind === 'topic-prompt') {
                return (
                  <div key={i} className="chatbot-topic-prompt">
                    <span>More on this topic or start something new?</span>
                    <button
                      className="btn btn-ghost btn--compact"
                      onClick={() => inputRef.current?.focus()}
                    >
                      Continue
                    </button>
                    <button
                      className="btn btn-primary btn--compact"
                      onClick={() => { setItems([]); inputRef.current?.focus() }}
                    >
                      New Topic
                    </button>
                  </div>
                )
              }
              return null
            })}
            {busy && (
              <div className="chatbot-msg chatbot-msg--assistant">
                <div className="chatbot-msg-bubble chatbot-typing">
                  <span className="chatbot-typing-dot" />
                  <span className="chatbot-typing-dot" />
                  <span className="chatbot-typing-dot" />
                </div>
              </div>
            )}
            {renderUploadCard()}
          </div>

          <div id="chatbot-upload-zone" className="chatbot-upload-zone">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.txt,.pdf,image/jpeg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) showUploadConfirm(file)
                e.target.value = ''
              }}
            />
            <button className="btn btn-dashed btn--compact" onClick={() => fileInputRef.current?.click()}>
              Upload
            </button>
            <span className="chatbot-upload-hint">.docx · .txt · .pdf · image</span>
          </div>

          <div className="chatbot-input-row">
            <textarea
              ref={inputRef}
              className="chatbot-input"
              placeholder="Type a message…"
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
            >
              &#9654;
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
