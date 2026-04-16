'use client'
import { useMsal } from '@azure/msal-react'
import { loginRequest } from '@/lib/auth'

export default function LoginPage() {
  const { instance } = useMsal()

  function handleLogin() {
    instance.loginRedirect(loginRequest)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-brand">V.Two Ops</span>
        </div>
        <h1 className="login-title">Sign in</h1>
        <p className="login-subtitle">Use your V.Two Microsoft account</p>
        <button className="btn btn--primary login-btn" onClick={handleLogin}>
          <svg className="login-ms-icon" viewBox="0 0 21 21" width="20" height="20" aria-hidden="true">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          Sign in with Microsoft
        </button>
      </div>
    </div>
  )
}
