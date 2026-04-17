import { createContext } from 'react'
import type { UserInfo, AuthResponse } from '../types/auth.ts'

export interface AuthContextValue {
  user: UserInfo | null
  accessToken: string | null
  isAuthenticated: boolean
  loginSuccess: (auth: AuthResponse) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
