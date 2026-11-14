import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import type { AccessScope, UserInfo, AuthResponse } from '../types/auth.ts'
import { getMe, logoutRequest, logoutAllRequest } from '../api/accountApi.ts'
import { tokenStore, getTokenExpiry } from '../auth/tokenStore.ts'
import { refreshSession } from '../auth/refreshSession.ts'
import { onSessionExpired } from '../auth/authEvents.ts'
import { AuthContext } from './authContextValue.ts'

const REFRESH_BUFFER_MS = 60_000 // Refresh 1 minute before expiry
const MIN_REFRESH_GAP_MS = 10_000 // Guard against refresh loops with very short tokens
const MAX_TIMER_MS = 2_000_000_000 // setTimeout limit is ~24.8 days

const EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.'

/** Fallback scope when /auth/me is unavailable: derived from the login user. */
function scopeFromUser(user: UserInfo): AccessScope {
  return {
    role: user.role,
    organizationId: user.role === 'SUPER_ADMIN' ? null : user.organizationId,
    branchIds: user.branchId ? [user.branchId] : [],
    studentIds: [],
    allBranches: user.role === 'SUPER_ADMIN' || user.role === 'ORG_ADMIN',
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(tokenStore.getUser)
  const [scope, setScope] = useState<AccessScope | null>(tokenStore.getScope)
  const [accessToken, setAccessToken] = useState<string | null>(tokenStore.getAccessToken)
  const [sessionNotice, setSessionNotice] = useState<string | null>(null)

  const hadSessionRef = useRef(!!user)
  const lastRefreshRef = useRef(0)

  useEffect(() => {
    hadSessionRef.current = !!accessToken
  }, [accessToken])

  const resetState = useCallback(() => {
    setUser(null)
    setScope(null)
    setAccessToken(null)
  }, [])

  const syncFromStore = useCallback(() => {
    setAccessToken(tokenStore.getAccessToken())
    setUser(tokenStore.getUser())
    setScope(tokenStore.getScope())
  }, [])

  const expire = useCallback(
    (message: string) => {
      tokenStore.clear()
      resetState()
      setSessionNotice(message)
    },
    [resetState],
  )

  const loginSuccess = useCallback((auth: AuthResponse) => {
    tokenStore.clear() // drop any stale scope from a previous user
    tokenStore.setTokens(auth.accessToken, auth.refreshToken)
    tokenStore.setUser(auth.user)
    setUser(auth.user)
    setScope(null)
    setAccessToken(auth.accessToken)
    setSessionNotice(null)
  }, [])

  const endSession = useCallback(
    async (serverCall: () => Promise<void>) => {
      try {
        await serverCall()
      } catch {
        // Best effort: always sign out locally
      }
      tokenStore.clear()
      resetState()
      setSessionNotice(null)
    },
    [resetState],
  )

  const logout = useCallback(() => {
    const refresh = tokenStore.getRefreshToken()
    return endSession(() => (refresh ? logoutRequest(refresh) : Promise.resolve()))
  }, [endSession])

  const logoutAll = useCallback(() => endSession(logoutAllRequest), [endSession])

  const clearSessionNotice = useCallback(() => setSessionNotice(null), [])

  // The HTTP client signals a dead session through an event so the router (not a page reload) reacts.
  useEffect(() => onSessionExpired((message) => expire(message)), [expire])

  // Cross-tab: follow sign-in, refresh and sign-out done in another tab.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!tokenStore.isAuthKey(e.key)) return
      if (!tokenStore.getAccessToken()) {
        const hadSession = hadSessionRef.current
        resetState()
        setSessionNotice(hadSession ? 'You were signed out in another tab.' : null)
      } else {
        syncFromStore()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [resetState, syncFromStore])

  // Keep the access token fresh: refresh shortly before it expires. Client-initiated refreshes
  // update the store too, so the timer re-reads the stored token each time it fires.
  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const run = () => {
      if (cancelled) return
      const token = tokenStore.getAccessToken()
      if (!token) return
      const expiry = getTokenExpiry(token)
      if (!expiry) return

      let wait = expiry - Date.now() - REFRESH_BUFFER_MS
      const sinceRefresh = Date.now() - lastRefreshRef.current
      if (wait <= 0 && sinceRefresh < MIN_REFRESH_GAP_MS) wait = MIN_REFRESH_GAP_MS - sinceRefresh

      if (wait > 0) {
        timer = setTimeout(run, Math.min(wait, MAX_TIMER_MS))
        return
      }
      lastRefreshRef.current = Date.now()
      refreshSession().then((ok) => {
        if (cancelled) return
        if (ok) syncFromStore() // new token state re-runs this effect
        else expire(EXPIRED_MESSAGE)
      })
    }

    run()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [accessToken, syncFromStore, expire])

  // Load the access scope (GET /auth/me) once signed in.
  useEffect(() => {
    if (!accessToken || scope) return
    let cancelled = false
    getMe()
      .then((me) => {
        if (cancelled) return
        tokenStore.setScope(me.scope)
        tokenStore.setUser(me.user)
        setScope(me.scope)
        setUser(me.user)
      })
      .catch(() => {
        // /auth/me unavailable (older backend, network): fall back to the login user. Not persisted.
        if (cancelled) return
        const stored = tokenStore.getUser()
        if (stored) setScope(scopeFromUser(stored))
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, scope])

  const value = useMemo(
    () => ({
      user,
      scope,
      accessToken,
      isAuthenticated: !!user && !!accessToken,
      sessionNotice,
      clearSessionNotice,
      loginSuccess,
      logout,
      logoutAll,
    }),
    [user, scope, accessToken, sessionNotice, clearSessionNotice, loginSuccess, logout, logoutAll],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
