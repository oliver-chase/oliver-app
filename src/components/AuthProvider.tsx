'use client'
import { MsalProvider } from '@azure/msal-react'
import { msalInstance } from '@/lib/auth'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>
}
