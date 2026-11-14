import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.ts'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, sessionNotice } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    // Keep the deep link only when the session ended on its own (expiry), not after an explicit logout.
    const state = sessionNotice ? { from: location } : undefined
    return <Navigate to="/login" replace state={state} />
  }

  return <>{children}</>
}

export default ProtectedRoute
