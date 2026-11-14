import { describe, expect, it } from 'vitest'
import { hasRole, ROLE_PERMISSIONS } from './roles.ts'

describe('hasRole', () => {
  it('allows a listed role', () => {
    expect(hasRole('ADMIN', ROLE_PERMISSIONS.students)).toBe(true)
  })

  it('rejects an unlisted role', () => {
    expect(hasRole('USER', ROLE_PERMISSIONS.organizations)).toBe(false)
  })

  it('rejects a missing role', () => {
    expect(hasRole(undefined, ROLE_PERMISSIONS.students)).toBe(false)
  })
})
