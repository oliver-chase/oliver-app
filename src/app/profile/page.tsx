'use client'

import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useUser } from '@/context/UserContext'
import './profile.css'

export default function ProfilePage() {
  const { account } = useAuth()
  const { appUser } = useUser()

  const displayName = appUser?.name || account?.name || 'Unknown user'
  const email = appUser?.email || account?.username || 'Not available'
  const role = appUser?.role || 'member'

  return (
    <div className="profile-shell">
      <div className="profile-header">
        <div>
          <div className="profile-title">Profile Settings</div>
          <div className="profile-subtitle">Manage personal info, account security, and sign-in settings.</div>
        </div>
        <Link href="/" className="profile-back">← Back to Hub</Link>
      </div>

      <section className="profile-card" aria-labelledby="profile-personal-title">
        <h2 id="profile-personal-title">Personal Info</h2>
        <div className="profile-grid">
          <div className="profile-field">
            <span className="profile-label">Name</span>
            <span className="profile-value">{displayName}</span>
          </div>
          <div className="profile-field">
            <span className="profile-label">Email</span>
            <span className="profile-value">{email}</span>
          </div>
          <div className="profile-field">
            <span className="profile-label">Role</span>
            <span className="profile-value">{role}</span>
          </div>
        </div>
        <p className="profile-note">
          Name and email are managed by your Microsoft account profile.
        </p>
        <button
          type="button"
          className="profile-btn"
          onClick={() => { window.open('https://myaccount.microsoft.com/profile', '_blank', 'noopener,noreferrer') }}
        >
          Manage Name &amp; Email
        </button>
      </section>

      <section className="profile-card" aria-labelledby="profile-security-title">
        <h2 id="profile-security-title">Security</h2>
        <p className="profile-note">
          Password and MFA changes are handled in Microsoft security settings.
        </p>
        <button
          type="button"
          className="profile-btn"
          onClick={() => { window.open('https://mysignins.microsoft.com/security-info', '_blank', 'noopener,noreferrer') }}
        >
          Open Password &amp; MFA Settings
        </button>
      </section>
    </div>
  )
}
