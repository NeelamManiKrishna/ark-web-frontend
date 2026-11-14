import { tokenStore } from './tokenStore.ts'
import { refreshToken as refreshTokenApi } from '../api/authApi.ts'

let inflight: Promise<boolean> | null = null

/**
 * Exchange the stored refresh token for a new pair. Refresh tokens rotate (single use),
 * so the new refresh token is stored every time. Concurrent callers share one request.
 * Resolves false when the session can't be refreshed.
 */
export function refreshSession(): Promise<boolean> {
  if (inflight) return inflight

  inflight = (async () => {
    const stored = tokenStore.getRefreshToken()
    if (!stored) return false
    try {
      const auth = await refreshTokenApi({ refreshToken: stored })
      tokenStore.setTokens(auth.accessToken, auth.refreshToken)
      if (auth.user) tokenStore.setUser(auth.user)
      return true
    } catch {
      return false
    }
  })().finally(() => {
    inflight = null
  })

  return inflight
}
