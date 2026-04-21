'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRegisterOliver } from '@/components/shared/OliverContext'
import type { OliverConfig } from '@/components/shared/OliverContext'
import { supabase } from '@/lib/supabase'
import { updateSecurityQuestions } from '@/lib/users'

const SECURITY_QUESTIONS = [
  'What was the name of your first pet?',
  'What city were you born in?',
  'What is your mother\'s maiden name?',
  'What was your childhood nickname?',
  'What street did you grow up on?',
  'What was the name of your elementary school?',
  'What is your oldest sibling\'s middle name?',
  'What was the make of your first car?',
  'What is the name of the town where your parents met?',
  'What was your favorite childhood sports team?',
] as const

async function sha256(input: string): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(input.trim().toLowerCase()))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function ProfilePage() {
  const [email, setEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // DB state (committed)
  const [dbQ1, setDbQ1] = useState('')
  const [dbQ2, setDbQ2] = useState('')
  const [dbQ3, setDbQ3] = useState('')
  const [hasAnswers, setHasAnswers] = useState(false)

  // Edit-mode draft state
  const [editing, setEditing] = useState(false)
  const [draftQ1, setDraftQ1] = useState('')
  const [draftA1, setDraftA1] = useState('')
  const [draftQ2, setDraftQ2] = useState('')
  const [draftA2, setDraftA2] = useState('')
  const [draftQ3, setDraftQ3] = useState('')
  const [draftA3, setDraftA3] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(async (d: { email: string | null }) => {
        if (!d.email) return
        setEmail(d.email)
        const { data } = await supabase
          .from('app_users')
          .select('user_id, security_q1, security_q2, security_q3, security_a1')
          .eq('email', d.email)
          .maybeSingle()
        if (data) {
          setUserId(data.user_id)
          setDbQ1((data as Record<string, string>).security_q1 ?? '')
          setDbQ2((data as Record<string, string>).security_q2 ?? '')
          setDbQ3((data as Record<string, string>).security_q3 ?? '')
          setHasAnswers(!!(data as Record<string, string>).security_a1)
        }
      })
      .catch(console.error)
  }, [])

  function startEdit() {
    setDraftQ1(dbQ1)
    setDraftA1('')
    setDraftQ2(dbQ2)
    setDraftA2('')
    setDraftQ3(dbQ3)
    setDraftA3('')
    setErr('')
    setSaved(false)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setErr('')
  }

  async function handleSave() {
    if (!draftQ1 || !draftA1 || !draftQ2 || !draftA2 || !draftQ3 || !draftA3) {
      setErr('All three questions and answers are required.')
      return
    }
    if (new Set([draftQ1, draftQ2, draftQ3]).size < 3) {
      setErr('Each question must be different.')
      return
    }
    if (!userId) {
      setErr('User account not found. Contact an admin.')
      return
    }
    setSaving(true)
    setErr('')
    try {
      const [h1, h2, h3] = await Promise.all([sha256(draftA1), sha256(draftA2), sha256(draftA3)])
      await updateSecurityQuestions(userId, draftQ1, h1, draftQ2, h2, draftQ3, h3)
      setDbQ1(draftQ1)
      setDbQ2(draftQ2)
      setDbQ3(draftQ3)
      setHasAnswers(true)
      setEditing(false)
      setSaved(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const oliverConfig = useMemo<OliverConfig>(() => ({
    pageLabel: 'Profile',
    placeholder: 'Ask about your profile settings...',
    actions: [],
  }), [])

  useRegisterOliver(oliverConfig)

  return (
    <div className="app-layout" style={{ minHeight: '100vh', background: 'var(--color-bg-page)' }}>
      <div className="app-layout-content">
        <div style={{ maxWidth: 640, margin: '0 auto', padding: 'var(--spacing-20) var(--spacing-lg) var(--spacing-lg)' }}>

          <h1 style={{ fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-xl)' }}>
            Profile Settings
          </h1>

          {email && (
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)' }}>
              Signed in as {email}
            </p>
          )}

          {/* Security Questions section */}
          <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                  Security Questions
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                  Used to verify your identity if you need to reset access. Answers are hashed — never stored as plain text.
                </div>
              </div>
              {!editing && (
                <button className="btn btn-primary btn--compact" onClick={startEdit} style={{ flexShrink: 0, marginLeft: 'var(--spacing-md)' }}>
                  {hasAnswers ? 'Update' : 'Set Up'}
                </button>
              )}
            </div>

            <div style={{ height: 1, background: 'var(--color-border)', marginBottom: 'var(--spacing-md)' }} />

            {!editing ? (
              <div>
                {hasAnswers ? (
                  [dbQ1, dbQ2, dbQ3].map((q, i) => (
                    <div key={i} style={{ marginBottom: i < 2 ? 'var(--spacing-md)' : 0 }}>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                        Question {i + 1}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-xs)' }}>
                        {q || '—'}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', letterSpacing: '0.15em' }}>
                        ••••••••
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                    {!email ? 'Loading...' : 'No security questions set. Click Set Up to add them.'}
                  </p>
                )}
                {saved && (
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-success)', marginTop: 'var(--spacing-sm)', margin: 0 }}>
                    Security questions saved.
                  </p>
                )}
              </div>
            ) : (
              <div>
                {([
                  { q: draftQ1, setQ: setDraftQ1, a: draftA1, setA: setDraftA1, n: 1 },
                  { q: draftQ2, setQ: setDraftQ2, a: draftA2, setA: setDraftA2, n: 2 },
                  { q: draftQ3, setQ: setDraftQ3, a: draftA3, setA: setDraftA3, n: 3 },
                ] as const).map(({ q, setQ, a, setA, n }) => (
                  <div key={n} style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                      Question {n}
                    </label>
                    <select
                      value={q}
                      onChange={e => setQ(e.target.value)}
                      style={{ width: '100%', minHeight: 'var(--touch-target)', padding: 'var(--spacing-sm) var(--spacing-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', background: 'var(--color-bg-input)', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-xs)' }}
                    >
                      <option value="">Select a question...</option>
                      {SECURITY_QUESTIONS.map(sq => (
                        <option key={sq} value={sq}>{sq}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={a}
                      onChange={e => setA(e.target.value)}
                      placeholder="Your answer"
                      style={{ width: '100%', minHeight: 'var(--touch-target)', padding: 'var(--spacing-sm) var(--spacing-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', background: 'var(--color-bg-input)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
                      autoComplete="off"
                    />
                  </div>
                ))}

                {err && (
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)', marginBottom: 'var(--spacing-sm)' }}>
                    {err}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" onClick={cancelEdit} disabled={saving}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
