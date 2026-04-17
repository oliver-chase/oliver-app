import type { Metadata } from 'next'
import './globals.css'
import { OliverProvider } from '@/components/shared/OliverContext'
import OliverDock from '@/components/shared/OliverDock'
import TokenOverridesLoader from '@/components/shared/TokenOverridesLoader'
import { AuthProvider } from '@/context/AuthContext'
import { AuthGuard } from '@/components/auth/AuthGuard'

export const metadata: Metadata = {
  title: 'V.Two Ops',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TokenOverridesLoader />
        <AuthProvider>
          <AuthGuard>
            <OliverProvider>
              {children}
              <OliverDock />
            </OliverProvider>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  )
}
