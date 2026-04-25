'use client'

import { useEffect, useMemo, useState } from 'react'
import type { AppUser, PagePermission, Role } from '@/types/auth'
import { useUser } from '@/context/UserContext'
import { listUsers, updateUserRole, updateUserPermissions } from '@/lib/users'
import { getPermissionModules } from '@/modules/registry'
import styles from './admin.module.css'

const ALL_PERMISSIONS: PagePermission[] = getPermissionModules().map(module => module.id)

export function UserManager() {
  const { appUser } = useUser()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const actorIdentity = useMemo(
    () => (appUser ? { userId: appUser.user_id, email: appUser.email } : undefined),
    [appUser],
  )

  useEffect(() => {
    listUsers(actorIdentity)
      .then(u => { setUsers(u); setLoading(false) })
      .catch(err => { setError(err instanceof Error ? err.message : String(err)); setLoading(false) })
  }, [actorIdentity])

  async function handleRoleChange(userId: string, role: Role) {
    const target = users.find(u => u.user_id === userId)
    if (target?.is_owner) return
    setSaving(userId)
    setError(null)
    try {
      await updateUserRole(userId, role, actorIdentity)
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role } : u))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(null)
    }
  }

  async function handlePermissionToggle(userId: string, perm: PagePermission) {
    const user = users.find(u => u.user_id === userId)
    if (!user) return
    if (user.is_owner) return
    const current = user.page_permissions
    const updated = current.includes(perm)
      ? current.filter(p => p !== perm)
      : [...current, perm]
    setSaving(userId)
    setError(null)
    try {
      await updateUserPermissions(userId, updated, actorIdentity)
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, page_permissions: updated } : u))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <p className={styles.loading}>Loading users...</p>

  return (
    <div className={styles.tableWrap}>
      {error && (
        <div className={styles.errorBanner} role="alert">
          Save failed: {error}
        </div>
      )}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Permissions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.user_id} className={saving === user.user_id ? styles.rowSaving : undefined}>
              <td className={styles.tdName}>{user.name || '-'}</td>
              <td className={styles.tdEmail}>{user.email}</td>
              <td>
                <select
                  className={styles.roleSelect}
                  value={user.role}
                  onChange={e => handleRoleChange(user.user_id, e.target.value as Role)}
                  disabled={saving === user.user_id || user.is_owner}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                {user.is_owner && <div className={styles.ownerTag}>Owner</div>}
              </td>
              <td>
                <div className={styles.permGrid}>
                  {ALL_PERMISSIONS.map(perm => (
                    <label key={perm} className={styles.permLabel}>
                      <input
                        type="checkbox"
                        checked={user.role === 'admin' || user.page_permissions.includes(perm)}
                        disabled={user.role === 'admin' || saving === user.user_id || !!user.is_owner}
                        onChange={() => handlePermissionToggle(user.user_id, perm)}
                      />
                      {perm}
                    </label>
                  ))}
                </div>
                {user.is_owner && <div className={styles.ownerNote}>Owner access is immutable.</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
