import type { Metadata } from 'next'
import './globals.css'
import { OliverProvider } from '@/components/shared/OliverContext'
import OliverDock from '@/components/shared/OliverDock'
import TokenOverridesLoader from '@/components/shared/TokenOverridesLoader'

export const metadata: Metadata = {
  title: 'V.Two Ops',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TokenOverridesLoader />
        <OliverProvider>
          {children}
          <OliverDock />
        </OliverProvider>
      </body>
    </html>
  )
}
