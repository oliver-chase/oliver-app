'use client'

import Link from 'next/link'

interface ModuleSidebarHeaderProps {
  title: string
  backHref?: string
  backLabel?: string
  onBackClick?: React.MouseEventHandler<HTMLAnchorElement>
}

export function ModuleSidebarHeader({
  title,
  backHref = '/',
  backLabel = '← Back to Hub',
  onBackClick,
}: ModuleSidebarHeaderProps) {
  return (
    <>
      <div className="app-sidebar-logo">{title}</div>
      <Link href={backHref} className="sidebar-back" onClick={onBackClick}>
        {backLabel}
      </Link>
    </>
  )
}
