'use client'
/**
 * ChatbotTopbar — locked header strip for OliverDock.
 *
 * Contract: title on the left, optional export (down-arrow) when messages
 * exist, close button on the right. Design system owns the visuals via the
 * .chatbot-header* classes in chatbot.css. Do not add inline styles here.
 */

interface Props {
  title: string
  canExport?: boolean
  onExport?: () => void
  canReset?: boolean
  onReset?: () => void
  onClose: () => void
}

export function ChatbotTopbar({ title, canExport, onExport, canReset, onReset, onClose }: Props) {
  return (
    <div className="chatbot-header">
      <span className="chatbot-header-label">{title}</span>
      {canReset && onReset && (
        <button
          className="chatbot-export-btn chatbot-tooltip-wrap"
          aria-label="Start over"
          data-tooltip="Start over"
          onClick={onReset}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
        </button>
      )}
      {canExport && onExport && (
        <button
          className="chatbot-export-btn chatbot-tooltip-wrap"
          aria-label="Export conversation"
          data-tooltip="Export conversation"
          onClick={onExport}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 4v14" />
            <path d="M5 13l7 7 7-7" />
          </svg>
        </button>
      )}
      <button
        className="chatbot-close-btn"
        aria-label={`Close ${title}`}
        title={`Close ${title}`}
        onClick={onClose}
      >
        &#215;
      </button>
    </div>
  )
}
