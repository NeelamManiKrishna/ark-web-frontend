import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import RoleGuard from './RoleGuard.tsx'
import { AuthContext } from '../context/authContextValue.ts'
import type { AuthContextValue } from '../context/authContextValue.ts'
import type { UserRole } from '../types/auth.ts'

function renderWithRole(role: UserRole | null, allowed: UserRole[]) {
  const value: AuthContextValue = {
    user: role ? { id: '1', fullName: 'T', email: 't@t.t', role, organizationId: 'o' } : null,
    scope: null,
    accessToken: role ? 't' : null,
    isAuthenticated: !!role,
    sessionNotice: null,
    clearSessionNotice: () => {},
    loginSuccess: () => {},
    logout: async () => {},
    logoutAll: async () => {},
  }
  return render(
    <MemoryRouter>
      <AuthContext value={value}>
        <RoleGuard roles={allowed}>
          <p>secret</p>
        </RoleGuard>
      </AuthContext>
    </MemoryRouter>,
  )
}

describe('RoleGuard', () => {
  it('renders children for an allowed role', () => {
    renderWithRole('ORG_ADMIN', ['SUPER_ADMIN', 'ORG_ADMIN'])
    expect(screen.getByText('secret')).toBeInTheDocument()
  })

  it('shows Not allowed for a disallowed role', () => {
    renderWithRole('USER', ['SUPER_ADMIN'])
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
    expect(screen.getByText('Not allowed')).toBeInTheDocument()
  })

  it('treats an unknown role as disallowed, not as an error', () => {
    renderWithRole('PARENT', ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN', 'USER'])
    expect(screen.getByText('Not allowed')).toBeInTheDocument()
  })

  it('shows Not allowed when signed out', () => {
    renderWithRole(null, ['USER'])
    expect(screen.getByText('Not allowed')).toBeInTheDocument()
  })
})
