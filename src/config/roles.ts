import type { UserRole } from '../types/auth.ts'
import { PERMISSIONS } from './permissions.ts'
import type { Feature } from './permissions.ts'

// Compatibility views over the single table in permissions.ts. Define permissions there, not here.
export const ROLE_PERMISSIONS = Object.fromEntries(
  Object.entries(PERMISSIONS).map(([k, v]) => [k, v.view]),
) as Record<Feature, UserRole[]>

export const WRITE_ROLES = Object.fromEntries(
  Object.entries(PERMISSIONS).map(([k, v]) => [k, 'write' in v ? v.write : []]),
) as Record<Feature, UserRole[]>

export function hasRole(userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean {
  return !!userRole && allowedRoles.includes(userRole)
}
