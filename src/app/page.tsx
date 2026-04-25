'use client'

import { useMemo } from 'react'
/* NOTE: visibleModules MUST be memoized. oliverConfig depends on it, and
   useRegisterOliver writes config into OliverProvider state on every change.
   An unstable array ref here = infinite render loop = Links stop working.
   Do not inline the filter into render body. */
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useUser } from '@/context/UserContext'
import { HubModuleList } from '@/components/hub/HubModuleList'
import { getHubModules } from '@/modules/registry'
import styles from './hub.module.css'

const HUB_MODULES = getHubModules()
const HUB_SKELETON_ROWS = 4

type PermissionState = 'loading' | 'error' | 'ready' | 'unassigned'

export default function HubPage() {
  const { appUser, isAdmin, hasPermission, isLoading, loadError, refreshUser } = useUser()
  const { account, logout } = useAuth()

  const permissionState: PermissionState = isLoading
    ? 'loading'
    : loadError
      ? 'error'
      : appUser
        ? 'ready'
        : 'unassigned'

  const visibleModules = useMemo(
    () => HUB_MODULES.filter(m => {
      if (permissionState !== 'ready') return false
      if (m.comingSoon) return isAdmin
      return hasPermission(m.id)
    }),
    [hasPermission, isAdmin, permissionState],
  )

  // Hub intentionally does not register an Oliver config. The dock only
  // lives inside each module (Accounts, HR, SDR, …). The hub is pure nav.
  void visibleModules

  return (
    <>
      {account && (
        <div className={styles.sessionBar}>
          <span className={styles.sessionEmail}>{account.username}</span>
          <div className={styles.sessionActions}>
            {isAdmin && (
              <>
                <Link href="/design-system" className={styles.adminBtn}>Design System</Link>
                <Link href="/admin" className={styles.adminBtn}>Admin</Link>
              </>
            )}
            <button type="button" className={styles.adminBtn} onClick={() => logout()}>
              Sign out
            </button>
          </div>
        </div>
      )}

      <div className={styles.hub}>
        {loadError && (
          <div className={styles.statusRegion}>
            <p className={styles.statusBanner}>
              Permissions service unavailable. Module access is temporarily restricted until permissions can be verified.
            </p>
            <div className={styles.statusActions}>
              <button
                type="button"
                className={styles.statusBtn}
                onClick={() => { void refreshUser() }}
                disabled={isLoading}
              >
                {isLoading ? 'Retrying…' : 'Retry Permissions'}
              </button>
            </div>
          </div>
        )}

        <div className={styles.brand}>
          <div className={styles.wordmark}>V.Two Ops</div>
          <div className={styles.subtitle}>
            {permissionState === 'loading' ? 'Loading module access…' : 'Internal Operations Hub'}
          </div>
        </div>

        {permissionState === 'loading' && (
          <div className={styles.skeletonWrap} aria-hidden="true">
            {Array.from({ length: HUB_SKELETON_ROWS }).map((_, idx) => (
              <div key={idx} className={styles.skeletonCard} />
            ))}
          </div>
        )}

        {permissionState !== 'loading' && (
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
