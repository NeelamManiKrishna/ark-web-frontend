import type { AccessScope, ChangePasswordRequest, MeResponse } from '../../types/auth.ts'
import { tokenStore } from '../../auth/tokenStore.ts'
import { ApiError } from '../../auth/apiError.ts'

// Stand-ins for the Part A endpoints the backend has not shipped yet
// (/auth/me, /auth/logout, /auth/logout-all, /auth/change-password).
// Enabled with VITE_USE_MOCK_AUTH=true. Login and refresh still hit the real backend.

export const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === 'true'

export async function mockGetMe(): Promise<MeResponse> {
  const user = tokenStore.getUser()
  if (!user) throw new ApiError('Session expired. Please login again.', 401, 'TOKEN_EXPIRED')

  const scope: AccessScope = {
    role: user.role,
    organizationId: user.role === 'SUPER_ADMIN' ? null : user.organizationId,
    branchIds: user.branchId ? [user.branchId] : [],
    studentIds: [],
    allBranches: user.role === 'SUPER_ADMIN' || user.role === 'ORG_ADMIN',
  }
  return { user, scope }
}

export async function mockNoop(): Promise<void> {
  return
}

export async function mockChangePassword(data: ChangePasswordRequest): Promise<void> {
  if (!data.currentPassword) {
    throw new ApiError('Current password is incorrect.', 400, 'BAD_REQUEST', [
      { field: 'currentPassword', message: 'Current password is incorrect.' },
    ])
  }
  if (data.newPassword.length < 8) {
    throw new ApiError('Password must be at least 8 characters.', 422, 'VALIDATION_FAILED', [
      { field: 'newPassword', message: 'Must be at least 8 characters.' },
    ])
  }
}
