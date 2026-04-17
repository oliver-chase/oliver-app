'use client'

interface Props {
  show: boolean
  search: string
  onSearch: (v: string) => void
  onReset: () => void
}

export default function Filterbar({ show, search, onSearch, onReset }: Props) {
  return (
    <div
      className="filterbar"
      id="filterbar"
      role="search"
      style={{ display: show ? '' : 'none' }}
    >
      <input
        type="text"
        className="filter-search"
        id="filter-search"
        placeholder="Search…"
        aria-label="Search accounts"
        value={search}
        onChange={e => onSearch(e.currentTarget.value)}
      />
      <button
        className="filter-reset"
        id="filter-reset"
        title="Reset all filters to default view"
        aria-label="Reset all filters"
        type="button"
        onClick={onReset}
      >
        Reset
      </button>
    </div>
  )
}
