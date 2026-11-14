import { describe, expect, it } from 'vitest'
import { getRedirectTarget } from './redirect.ts'

describe('getRedirectTarget', () => {
  it('returns the saved location with search and hash', () => {
    expect(getRedirectTarget({ from: { pathname: '/reports', search: '?a=1', hash: '#x' } })).toBe('/reports?a=1#x')
  })

  it('falls back to the dashboard', () => {
    expect(getRedirectTarget(null)).toBe('/')
    expect(getRedirectTarget({})).toBe('/')
    expect(getRedirectTarget({ from: { pathname: '/login' } })).toBe('/')
  })

  it('rejects non-local targets', () => {
    expect(getRedirectTarget({ from: { pathname: '//evil.example.com' } })).toBe('/')
    expect(getRedirectTarget({ from: { pathname: 'https://evil.example.com' } })).toBe('/')
  })
})
