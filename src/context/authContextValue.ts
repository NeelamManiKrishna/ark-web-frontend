import { createContext } from 'react'
import type { UserInfo, AccessScope, AuthResponse } from '../types/auth.ts'

export interface AuthContextValue {
  user: UserInfo | null
  /** Role/org/branch/student visibility from GET /auth/me. Null until loaded. */
  scope: AccessScope | null
  accessToken: string | null
  isAuthenticated: boolean
  /** Why the user was signed out (e.g. session expired); shown on the login page. */
  sessionNotice: string | null
  clearSessionNotice: () => void
  loginSuccess: (auth: AuthResponse) => void
  /** Revokes this device's refresh token on the server, then clears local state. */
  logout: () => Promise<void>
  /** Revokes every device's session, then clears local state. */
  logoutAll: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
