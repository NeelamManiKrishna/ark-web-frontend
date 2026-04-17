import { useAuth } from './useAuth.ts'
import { hasRole } from '../config/roles.ts'
import type { UserRole } from '../types/auth.ts'

export function useCanWrite(allowedRoles: UserRole[]): boolean {
  const { user } = useAuth()
  return hasRole(user?.role, allowedRoles)
}
