'use client'
import { useState, useRef, useEffect } from 'react'
import type { AppState } from '@/types'

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'

let _nextId = 0
function nextId() { return ++_nextId }

type MsgItem =
  | { id: number; kind: 'msg'; role: 'user' | 'assistant'; text: string; model?: string }
  | { id: number; kind: 'topic-prompt' }
  | { id: number; kind: 'upload-confirm'; file: File }
  | { id: number; kind: 'parse-result'; result: unknown; model: string; docType: 'image' | 'document' }
  | { id: number; kind: 'write-prompt'; text: string; hasConflicts: boolean; payload: unknown }

interface Props {
  accountId: string
  data: AppState
}

export default function ChatbotPanel({ accountId, data }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [items, setItems] = useState<MsgItem[]>([])
  const [busy, setBusy] = useState(false)
  const [initialShown, setInitialShown] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingPayloadRef = useRef<unknown>(null)

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
        text: "Hi, I'm Oliver! I can answer questions about your accounts, make updates, and add notes. Upload a meeting transcript or org chart screenshot and I'll update your account plan.",
      }])
    }
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleClose() { setOpen(false) }

  function getContextData() {
    const acct = data.accounts.find(a => a.account_id === accountId)
    const bg = data.background?.find(b => b.account_id === accountId && !b.engagement_id)
    const stakeholders = data.stakeholders?.filter(s => s.account_id === accountId) ?? []
    const actions = data.actions?.filter(a => a.account_id === accountId) ?? []
    const opportunities = data.opportunities?.filter(o => o.account_id === accountId) ?? []
    const projects = data.projects?.filter(p => p.account_id === accountId) ?? []
    return { account: acct, background: bg, stakeholders, actions, opportunities, projects }
  }

  function exportConversation() {
    const msgs = items.filter((it): it is Extract<MsgItem, { kind: 'msg' }> => it.kind === 'msg')
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
          pageContext: 'Account',
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

  async function handleFile(file: File, contextInstruction: string) {
    const isImage = file.type.startsWith('image/')
    if (isImage) {
      addMsg('assistant', 'Reading image...')
      const base64 = await readAsBase64(file)
      addMsg('assistant', 'Analyzing image with AI...')
      try {
        const res = await fetch('/api/parse-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mediaType: file.type, contextInstruction }),
        })
        const d = await res.json()
        if (d.error) { addMsg('assistant', 'Parse error: ' + d.error); return }
        pendingPayloadRef.current = d.result
        setItems(prev => [...prev, { id: nextId(), kind: 'parse-result', result: d.result, model: d.model, docType: 'image' }])
      } catch { addMsg('assistant', 'Network error during parse.') }
    } else {
      addMsg('assistant', 'Reading ' + file.name + '...')
      let text: string
      try { text = await readAsText(file) } catch { addMsg('assistant', 'Failed to read file.'); return }
      addMsg('assistant', 'Analyzing document with AI...')
      try {
        const res = await fetch('/api/parse-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, filename: file.name, contextInstruction }),
        })
        const d = await res.json()
        if (d.error) { addMsg('assistant', 'Parse error: ' + d.error); return }
        pendingPayloadRef.current = d.result
        setItems(prev => [...prev, { id: nextId(), kind: 'parse-result', result: d.result, model: d.model, docType: 'document' }])
      } catch { addMsg('assistant', 'Network error during parse.') }
    }
  }

  function buildSummaryText(result: unknown, docType: 'image' | 'document'): string {
    const r = result as Record<string, unknown>
    if (docType === 'image') {
      const people = (r.people as Array<Record<string, string>>) || []
      return people.map(p => {
        const parts: string[] = [p.name]
        if (p.title) parts.push(p.title)
        if (p.department) parts.push(p.department)
        if (p.reports_to) parts.push('reports to ' + p.reports_to)
        return parts.join(' | ')
      }).join('\n') || 'No people found.'
    }
    const meta = (r.metadata as Record<string, unknown>) || {}
    const lines: string[] = []
    if (meta.title) lines.push('Meeting: ' + meta.title)
    if (meta.date) lines.push('Date: ' + meta.date)
    const attendees = meta.attendees as string[] | undefined
    if (attendees?.length) lines.push('Attendees: ' + attendees.join(', '))
    const actions = r.actions as Array<Record<string, string>> | undefined
    if (actions?.length) {
      lines.push(''); lines.push('Actions (' + actions.length + '):')
      actions.forEach(a => lines.push('  - ' + a.task + (a.owner ? ' (' + a.owner + ')' : '')))
    }
    const decisions = r.decisions as Array<Record<string, string>> | undefined
    if (decisions?.length) {
      lines.push(''); lines.push('Decisions (' + decisions.length + '):')
      decisions.forEach(d => lines.push('  - ' + d.decision))
    }
    return lines.join('\n') || JSON.stringify(result, null, 2).slice(0, 500)
  }

  async function startConfirm(itemId: number) {
    setItems(prev => prev.filter(it => it.id !== itemId))
    addMsg('assistant', 'Checking for conflicts...')
    try {
      const res = await fetch('/api/confirm-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, payload: pendingPayloadRef.current, dryRun: true }),
      })
      const json = await res.json() as { conflicts?: Array<{ section: string; field: string; existing: string; incoming: string }>; summary?: Record<string, number>; error?: string }
      if (json.error) { addMsg('assistant', 'Conflict check error: ' + json.error); return }
      const hasConflicts = !!(json.conflicts && json.conflicts.length > 0)
      let text: string
      if (hasConflicts) {
        text = 'Conflicts found:\n'
        json.conflicts!.forEach(c => { text += '  ' + c.section + '/' + c.field + ': existing "' + c.existing + '" vs incoming "' + c.incoming + '"\n' })
        text += '\nProceed anyway?'
      } else {
        text = 'Ready to write:\n'
        const summary = json.summary || {}
        Object.keys(summary).forEach(k => { if (summary[k] > 0) text += '  ' + k + ': ' + summary[k] + '\n' })
      }
      setItems(prev => [...prev, { id: nextId(), kind: 'write-prompt', text, hasConflicts, payload: pendingPayloadRef.current }])
    } catch { addMsg('assistant', 'Conflict check failed. Try again.') }
  }

  async function doWrite(itemId: number, payload: unknown) {
    setItems(prev => prev.filter(it => it.id !== itemId))
    addMsg('assistant', 'Writing to database...')
    try {
      const res = await fetch('/api/confirm-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, payload, dryRun: false }),
      })
      const json = await res.json() as { message?: string; error?: string }
      if (json.error) {
        addMsg('assistant', 'Write failed: ' + json.error)
      } else {
        pendingPayloadRef.current = null
        addMsg('assistant', 'Done. Data written. Reload the page to see changes.')
        setItems(prev => [...prev, { id: nextId(), kind: 'topic-prompt' }])
      }
    } catch { addMsg('assistant', 'Network error during write.') }
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

    if (item.kind === 'upload-confirm') {
      return (
        <UploadConfirmCard
          key={item.id}
          file={item.file}
          accounts={data.accounts}
          currentAccountId={accountId}
          onSend={(instruction) => {
            setItems(prev => prev.filter(it => it.id !== item.id))
            handleFile(item.file, instruction)
          }}
          onCancel={() => setItems(prev => prev.filter(it => it.id !== item.id))}
        />
      )
    }

    if (item.kind === 'parse-result') {
      const summary = buildSummaryText(item.result, item.docType)
      const title = item.docType === 'image' ? 'Extracted People' : 'Extracted Meeting Data'
      return (
        <div key={item.id} className="chatbot-parse-card">
          <div className="chatbot-parse-header">
            <span className="chatbot-parse-title">{title}</span>
            <span className="chatbot-msg-model">{item.model}</span>
          </div>
          <pre className="chatbot-parse-pre">{summary}</pre>
          <div className="chatbot-parse-actions">
            <button className="btn btn-primary btn--compact" onClick={() => startConfirm(item.id)}>Review &amp; Confirm</button>
            <button className="btn btn-ghost btn--compact" onClick={() => {
              pendingPayloadRef.current = null
              setItems(prev => prev.filter(it => it.id !== item.id))
              addMsg('assistant', 'Discarded. Upload a new file or ask a question.')
            }}>Discard</button>
          </div>
        </div>
      )
    }

    if (item.kind === 'write-prompt') {
      return (
        <div key={item.id} className="chatbot-parse-card chatbot-confirm-card">
          <pre className="chatbot-parse-pre">{item.text}</pre>
          <div className="chatbot-parse-actions">
            <button className="btn btn-primary btn--compact" onClick={() => doWrite(item.id, item.payload)}>
              {item.hasConflicts ? 'Write Anyway' : 'Confirm & Write'}
            </button>
            <button className="btn btn-ghost btn--compact" onClick={() => setItems(prev => prev.filter(it => it.id !== item.id))}>
              Cancel
            </button>
          </div>
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
            onClick={handleClose}
          >
            &#215;
          </button>
        </div>

        <div className="chatbot-body" id="chatbot-body" aria-hidden={!open}>
          <div
            ref={messagesRef}
            className="chatbot-messages"
            id="chatbot-messages"
            aria-live="polite"
            aria-atomic="false"
          >
            {items.map(renderItem)}
            {busy && (
              <div className="chatbot-msg chatbot-msg--assistant chatbot-msg--typing" id="chatbot-typing">
                <span className="chatbot-typing-dot" />
                <span className="chatbot-typing-dot" />
                <span className="chatbot-typing-dot" />
              </div>
            )}
          </div>

          <div id="chatbot-upload-zone" className="chatbot-upload-zone">
            <input
              ref={fileInputRef}
              type="file"
              id="chatbot-file-input"
              accept=".docx,.txt,.pdf,image/jpeg,image/png,image/gif,image/webp"
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
              aria-label="Upload meeting transcript, org chart image, or PDF"
              tabIndex={-1}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) setItems(prev => [...prev, { id: nextId(), kind: 'upload-confirm', file }])
                e.target.value = ''
              }}
            />
            <div className="chatbot-upload-row">
              <button
                className="btn btn-primary btn--compact"
                id="chatbot-upload-btn"
                type="button"
                title="Meeting notes or org chart (PDF, .docx, .txt, image)"
                aria-label="Upload meeting transcript, org chart, or PDF"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload
              </button>
              <span className="chatbot-upload-hint" aria-hidden="true">.docx &middot; .txt &middot; .pdf &middot; image</span>
            </div>
          </div>

          <div className="chatbot-input-row">
            <textarea
              ref={inputRef}
              className="chatbot-input"
              id="chatbot-input"
              rows={1}
              aria-label="Message"
              placeholder="Type a message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
            />
            <button
              className="btn btn-primary btn--compact chatbot-send"
              id="chatbot-send"
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

function UploadConfirmCard({ file, accounts, currentAccountId, onSend, onCancel }: {
  file: File
  accounts: Array<{ account_id: string; account_name: string }>
  currentAccountId: string
  onSend: (instruction: string) => void
  onCancel: () => void
}) {
  const [instruction, setInstruction] = useState('')
  const currentAcct = accounts.find(a => a.account_id === currentAccountId)
  return (
    <div className="chatbot-upload-confirm-card">
      <div className="chatbot-confirm-filename">File: {file.name}</div>
      <div className="chatbot-confirm-form">
        <label className="chatbot-confirm-label">Account</label>
        <div className="chatbot-confirm-picker-btn">{currentAcct?.account_name ?? 'Unknown account'}</div>
        <label className="chatbot-confirm-label" style={{ marginTop: 8 }}>Context</label>
        <input
          type="text"
          className="chatbot-confirm-input"
          placeholder='e.g. "Q3 planning meeting"'
          aria-label="Context for upload"
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
        />
      </div>
      <div className="chatbot-confirm-actions">
        <button className="btn btn-primary btn--compact" onClick={() => onSend(instruction)}>Send</button>
        <button className="btn btn-ghost btn--compact" title="Cancel" aria-label="Cancel upload" onClick={onCancel}>&#215;</button>
      </div>
    </div>
  )
}
