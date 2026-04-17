export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'ADMIN' | 'USER'

export interface UserInfo {
  id: string
  fullName: string
  email: string
  role: UserRole
  organizationId: string
  branchId?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  user: UserInfo
}

export interface RefreshTokenRequest {
  refreshToken: string
}
