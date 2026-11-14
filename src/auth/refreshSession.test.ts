import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tokenStore } from './tokenStore.ts'

vi.mock('../api/authApi.ts', () => ({ refreshToken: vi.fn() }))

import { refreshToken } from '../api/authApi.ts'
import { refreshSession } from './refreshSession.ts'

const user = { id: '1', fullName: 'A', email: 'a@b.c', role: 'USER', organizationId: 'o' }
const mockRefresh = vi.mocked(refreshToken)

describe('refreshSession', () => {
  beforeEach(() => {
    localStorage.clear()
    mockRefresh.mockReset()
  })

  it('returns false without calling the API when there is no refresh token', async () => {
    expect(await refreshSession()).toBe(false)
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('shares one request between concurrent callers', async () => {
    tokenStore.setTokens('a1', 'r1')
    mockRefresh.mockResolvedValue({ accessToken: 'a2', refreshToken: 'r2', user })
    const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()])
    expect(results).toEqual([true, true, true])
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('stores the rotated refresh token every time', async () => {
    tokenStore.setTokens('a1', 'r1')
    mockRefresh.mockResolvedValueOnce({ accessToken: 'a2', refreshToken: 'r2', user })
    mockRefresh.mockResolvedValueOnce({ accessToken: 'a3', refreshToken: 'r3', user })

    await refreshSession()
    expect(mockRefresh).toHaveBeenLastCalledWith({ refreshToken: 'r1' })
    expect(tokenStore.getRefreshToken()).toBe('r2')

    await refreshSession()
    expect(mockRefresh).toHaveBeenLastCalledWith({ refreshToken: 'r2' })
    expect(tokenStore.getAccessToken()).toBe('a3')
    expect(tokenStore.getRefreshToken()).toBe('r3')
  })

  it('returns false and keeps tokens when the refresh is rejected', async () => {
    tokenStore.setTokens('a1', 'r1')
    mockRefresh.mockRejectedValue(new Error('revoked'))
    expect(await refreshSession()).toBe(false)
    expect(tokenStore.getRefreshToken()).toBe('r1')
  })
})
