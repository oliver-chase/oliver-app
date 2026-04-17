import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { AuthGuard } from '@/components/auth/AuthGuard'

export const metadata: Metadata = {
  title: 'V.Two Ops',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  )
}
