// Open union: known roles get autocomplete, but unknown roles (e.g. a future PARENT) are still valid.
export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'ADMIN' | 'USER' | (string & {})

export interface UserInfo {
  id: string
  fullName: string
  email: string
  role: UserRole
  organizationId: string
  branchId?: string
}

/** What the signed-in user may see. Source of truth: GET /auth/me. */
export interface AccessScope {
  role: UserRole
  organizationId: string | null
  branchIds: string[]
  studentIds: string[]
  /** True when the role sees every branch of its organization. */
  allBranches?: boolean
}

export interface MeResponse {
  user: UserInfo
  scope: AccessScope
}

export interface LoginRequest {
  email: string
  password: string
  deviceId?: string
  deviceName?: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType?: string
  expiresIn?: number
  user: UserInfo
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

/** Backend error body (contract A2). */
export interface ApiErrorBody {
  error?: string
  message?: string
  fieldErrors?: { field: string; message: string }[]
}
