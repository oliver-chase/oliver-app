'use client'
/**
 * ChatbotInputBar — locked input row for OliverDock.
 *
 * Contract (fixed sequence, left to right):
 *   upload (if supported) · mic · text input · send
 *
 * Design system owns visuals via .chatbot-input-row / .chatbot-input /
 * .chatbot-send / .btn classes in chatbot.css. No inline styles for visual
 * properties. Layout-only style is acceptable on the mic button for the
 * listening-state tint since it is a state indicator, not a visual override.
 */
import { forwardRef } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onUpload?: () => void
  uploadTitle?: string
  onMic?: () => void
  listening?: boolean
  sendDisabled?: boolean
  placeholder?: string
  onEscape?: () => void
}

export const ChatbotInputBar = forwardRef<HTMLInputElement, Props>(function ChatbotInputBar(
  { value, onChange, onSend, onUpload, uploadTitle, onMic, listening, sendDisabled, placeholder, onEscape },
  ref,
) {
  return (
    <div className="chatbot-input-row">
      {onUpload && (
        <button
          type="button"
          className="btn btn-ghost btn--compact"
          title={uploadTitle ?? 'Upload file'}
          aria-label="Upload file"
          onClick={onUpload}
          style={{ flexShrink: 0 }}
        >
          &#128206;
        </button>
      )}
      {onMic && (
        <button
          type="button"
          className="btn btn-ghost btn--compact"
          title={listening ? 'Stop recording' : 'Start voice input'}
          aria-label={listening ? 'Stop recording' : 'Start voice input'}
          aria-pressed={listening}
          onClick={onMic}
          style={{ flexShrink: 0, color: listening ? 'var(--color-brand-primary)' : undefined }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
            <path d="M12 19v3" />
          </svg>
        </button>
      )}
      <input
        ref={ref}
        type="text"
        className="chatbot-input"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() }
          if (e.key === 'Escape') onEscape?.()
        }}
        aria-label="Message or command"
        aria-autocomplete="list"
      />
      <button
        className="btn btn-primary btn--compact chatbot-send"
        aria-label="Send"
        disabled={sendDisabled}
        onClick={onSend}
      >
        Send
      </button>
    </div>
  )
})
