import { beforeEach, describe, expect, it } from 'vitest'
import { getTokenExpiry, tokenStore } from './tokenStore.ts'

function jwt(payload: object): string {
  return `h.${btoa(JSON.stringify(payload))}.s`
}

describe('tokenStore', () => {
  beforeEach(() => localStorage.clear())

  it('stores and reads tokens, user and scope', () => {
    tokenStore.setTokens('a', 'r')
    tokenStore.setUser({ id: '1', fullName: 'A B', email: 'a@b.c', role: 'ADMIN', organizationId: 'o' })
    tokenStore.setScope({ role: 'ADMIN', organizationId: 'o', branchIds: ['b'], studentIds: [] })
    expect(tokenStore.getAccessToken()).toBe('a')
    expect(tokenStore.getRefreshToken()).toBe('r')
    expect(tokenStore.getUser()?.id).toBe('1')
    expect(tokenStore.getScope()?.branchIds).toEqual(['b'])
  })

  it('clear removes everything', () => {
    tokenStore.setTokens('a', 'r')
    tokenStore.setScope({ role: 'USER', organizationId: null, branchIds: [], studentIds: [] })
    tokenStore.clear()
    expect(tokenStore.getAccessToken()).toBeNull()
    expect(tokenStore.getRefreshToken()).toBeNull()
    expect(tokenStore.getScope()).toBeNull()
  })

  it('returns null for corrupt JSON', () => {
    localStorage.setItem('ark_user', '{oops')
    expect(tokenStore.getUser()).toBeNull()
  })

  it('recognises auth storage keys', () => {
    expect(tokenStore.isAuthKey('ark_access_token')).toBe(true)
    expect(tokenStore.isAuthKey(null)).toBe(true)
    expect(tokenStore.isAuthKey('theme')).toBe(false)
  })

  it('reads token expiry', () => {
    expect(getTokenExpiry(jwt({ exp: 1000 }))).toBe(1_000_000)
    expect(getTokenExpiry('garbage')).toBeNull()
  })
})
