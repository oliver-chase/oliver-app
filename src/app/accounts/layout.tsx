import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Account Strategy & Planning — V.Two Ops',
}

export default function AccountsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
