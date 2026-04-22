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
  onClose: () => void
}

export function ChatbotTopbar({ title, canExport, onExport, onClose }: Props) {
  return (
    <div className="chatbot-header">
      <span className="chatbot-header-label">{title}</span>
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
