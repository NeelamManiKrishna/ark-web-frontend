import { useAuth } from './useAuth.ts'

/**
 * Branch restriction derived from the access scope (GET /auth/me).
 * A user limited to exactly one branch (ADMIN, USER) gets that branch id and `branchLocked`
 * so branch filters can be preset and disabled.
 */
export function useAdminBranchScope() {
  const { scope } = useAuth()
  const locked = !!scope && !scope.allBranches && scope.branchIds.length === 1

  return {
    adminBranchId: locked ? scope.branchIds[0] : undefined,
    branchLocked: locked,
  }
}
