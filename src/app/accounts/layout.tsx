import type { Metadata } from 'next'
import { PageGuard } from '@/components/auth/PageGuard'

export const metadata: Metadata = {
  title: 'Account Strategy & Planning — V.Two Ops',
}

export default function AccountsLayout({ children }: { children: React.ReactNode }) {
  return <PageGuard page="accounts">{children}</PageGuard>
}
