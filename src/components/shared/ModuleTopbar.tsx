'use client'

interface ModuleTopbarProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  sidebarId?: string
  toggleAriaLabel?: string
  children?: React.ReactNode
}

export function ModuleTopbar({
  sidebarOpen,
  onToggleSidebar,
  sidebarId = 'sidebar',
  toggleAriaLabel = 'Toggle navigation',
  children,
}: ModuleTopbarProps) {
  return (
    <header className="topbar">
      <button
        className="topbar-hamburger"
        onClick={onToggleSidebar}
        aria-label={toggleAriaLabel}
        aria-expanded={sidebarOpen}
        aria-controls={sidebarId}
      >
        &#9776;
      </button>
      {children ? <div className="module-topbar-right">{children}</div> : null}
    </header>
  )
}
