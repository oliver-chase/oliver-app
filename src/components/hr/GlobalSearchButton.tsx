'use client'

interface Props {
  onClick: () => void
}

export default function GlobalSearchButton({ onClick }: Props) {
  return (
    <button
      className="gs-icon-btn"
      onClick={onClick}
      aria-label="Search (press / )"
      title="Search (/)"
      type="button"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="7" cy="7" r="4.5" />
        <path d="M10.5 10.5L14 14" strokeLinecap="round" />
      </svg>
    </button>
  )
}
