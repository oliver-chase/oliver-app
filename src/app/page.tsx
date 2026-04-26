'use client'

import { useEffect, useMemo, useRef } from 'react'
/* NOTE: visibleModules MUST be memoized. oliverConfig depends on it, and
   useRegisterOliver writes config into OliverProvider state on every change.
   An unstable array ref here = infinite render loop = Links stop working.
   Do not inline the filter into render body. */
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useUser } from '@/context/UserContext'
import { AppNotice } from '@/components/shared/AppNotice'
import { HubModuleList } from '@/components/hub/HubModuleList'
import { getHubModules } from '@/modules/registry'
import { recordStartupTiming } from '@/lib/startup-telemetry'
import styles from './hub.module.css'

const HUB_MODULES = getHubModules()
const HUB_SKELETON_ROWS = 4

type PermissionState = 'loading' | 'error' | 'ready' | 'unassigned'

export default function HubPage() {
  const { appUser, isAdmin, hasPermission, isLoading, loadError, refreshUser } = useUser()
  const { account, logout, isReady } = useAuth()
  const startupMarksRef = useRef({ permissionFilter: false, firstInteractive: false })
  const hubStartMsRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : Date.now())

  const permissionState: PermissionState = isLoading
    ? 'loading'
    : loadError
      ? 'error'
      : appUser
        ? 'ready'
        : 'unassigned'

  const visibleModulesMeasure = useMemo(
    () => {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const modules = HUB_MODULES.filter(m => {
        if (permissionState !== 'ready') return false
        if (m.comingSoon) return false
        return hasPermission(m.id)
      })
      const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt
      return { modules, durationMs: elapsed }
    },
    [hasPermission, permissionState],
  )
  const visibleModules = visibleModulesMeasure.modules

  useEffect(() => {
    if (permissionState !== 'ready') return
    if (startupMarksRef.current.permissionFilter) return
    startupMarksRef.current.permissionFilter = true
    recordStartupTiming('permission_filter_ms', visibleModulesMeasure.durationMs, '/')
  }, [permissionState, visibleModulesMeasure.durationMs])

  useEffect(() => {
    if (!isReady || permissionState === 'loading') return
    if (startupMarksRef.current.firstInteractive) return
    startupMarksRef.current.firstInteractive = true
    const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - hubStartMsRef.current
    recordStartupTiming('hub_interactive_ms', elapsed, '/')
  }, [isReady, permissionState])

  // Hub intentionally does not register an Oliver config. The dock only
  // lives inside each module (Accounts, HR, SDR, …). The hub is pure nav.
  void visibleModules
  const isStartupLoading = !isReady || permissionState === 'loading'
  const subtitle = !isReady
    ? 'Checking sign-in…'
    : permissionState === 'loading'
      ? 'Loading permissions…'
      : 'Internal Operations Hub'

  return (
    <>
      {account && (
        <>
          {isAdmin && (
            <div className={styles.sessionBarLeft}>
              <Link href="/admin" className={styles.adminBtn}>Admin</Link>
            </div>
          )}
          <div className={styles.sessionBar}>
            <span className={styles.sessionEmail}>{account.username}</span>
            <div className={styles.sessionActions}>
              <button type="button" className={styles.adminBtn} onClick={() => logout()}>
                Sign out
              </button>
            </div>
          </div>
        </>
      )}

      <div className={styles.hub}>
        {loadError && (
          <div className={styles.statusRegion}>
            <AppNotice
              tone="error"
              actions={(
                <button
                  type="button"
                  className={styles.statusBtn}
                  onClick={() => { void refreshUser() }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Retrying…' : 'Retry Permissions'}
                </button>
              )}
            >
              Permissions service unavailable. Module access is temporarily restricted until permissions can be verified.
            </AppNotice>
          </div>
        )}

        <div className={styles.brand}>
          <div className={styles.wordmark}>V.Two Ops</div>
          <div className={styles.subtitle}>{subtitle}</div>
        </div>

        {isStartupLoading && (
          <div className={styles.skeletonWrap} aria-hidden="true">
            {Array.from({ length: HUB_SKELETON_ROWS }).map((_, idx) => (
              <div key={idx} className={styles.skeletonCard} />
            ))}
          </div>
        )}

        {!isStartupLoading && (
          permissionState === 'error'
            ? <p className={styles.empty}>Permissions are unavailable. Retry once service access is restored.</p>
            : visibleModules.length > 0
              ? <HubModuleList modules={visibleModules} />
              : <p className={styles.empty}>No modules assigned. Contact your administrator.</p>
        )}
      </div>
      <div className={styles.footer}>V.TWO &middot; 2026</div>
    </>
  )
}
