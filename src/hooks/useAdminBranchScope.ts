import { useEffect, useState } from 'react'
import { getUserById } from '../api/userApi.ts'
import { useAuth } from './useAuth.ts'

/**
 * For ADMIN role, fetches the user's profile to get their assigned branchId.
 * Returns the branchId and a locked flag indicating the branch filter should be disabled.
 */
export function useAdminBranchScope(organizationId: string | undefined) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [adminBranchId, setAdminBranchId] = useState<string | undefined>()
  const [branchLocked, setBranchLocked] = useState(false)

  useEffect(() => {
    if (!isAdmin || !organizationId || !user?.id) return
    getUserById(organizationId, user.id)
      .then((profile) => {
        if (profile.branchId) {
          setAdminBranchId(profile.branchId)
          setBranchLocked(true)
        }
      })
      .catch(() => { /* ignore — filter stays unlocked */ })
  }, [isAdmin, organizationId, user?.id])

  return { adminBranchId, branchLocked }
}
