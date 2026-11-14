import { useAuth } from '../hooks/useAuth.ts'
import { hasRole } from '../config/roles.ts'
import type { UserRole } from '../types/auth.ts'
import NotAllowed from './NotAllowed.tsx'

interface RoleGuardProps {
  roles: UserRole[]
  children: React.ReactNode
}

function RoleGuard({ roles, children }: RoleGuardProps) {
  const { user } = useAuth()

  if (!hasRole(user?.role, roles)) {
    return <NotAllowed />
  }

  return <>{children}</>
}

export default RoleGuard
