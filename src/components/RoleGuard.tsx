import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.ts'
import type { UserRole } from '../types/auth.ts'

interface RoleGuardProps {
  roles: UserRole[]
  children: React.ReactNode
}

function RoleGuard({ roles, children }: RoleGuardProps) {
  const { user } = useAuth()

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default RoleGuard
