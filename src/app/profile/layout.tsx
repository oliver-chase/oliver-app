import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Profile Settings — V.Two Ops' }

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
