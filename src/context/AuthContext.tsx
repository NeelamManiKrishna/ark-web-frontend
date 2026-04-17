import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import type { UserInfo, AuthResponse } from '../types/auth.ts'
import { refreshToken as refreshTokenApi } from '../api/authApi.ts'
import { AuthContext } from './authContextValue.ts'

const STORAGE_KEY_TOKEN = 'ark_access_token'
const STORAGE_KEY_REFRESH = 'ark_refresh_token'
const STORAGE_KEY_USER = 'ark_user'
const REFRESH_BUFFER_MS = 60_000 // Refresh 1 minute before expiry

function getStoredUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER)
    return raw ? (JSON.parse(raw) as UserInfo) : null
  } catch {
    return null
  }
}

function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(getStoredUser)
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY_TOKEN),
  )
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loginSuccess = useCallback((auth: AuthResponse) => {
    setUser(auth.user)
    setAccessToken(auth.accessToken)
    localStorage.setItem(STORAGE_KEY_TOKEN, auth.accessToken)
    localStorage.setItem(STORAGE_KEY_REFRESH, auth.refreshToken)
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(auth.user))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setAccessToken(null)
    localStorage.removeItem(STORAGE_KEY_TOKEN)
    localStorage.removeItem(STORAGE_KEY_REFRESH)
    localStorage.removeItem(STORAGE_KEY_USER)
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  // Use refs for stable access in the scheduled refresh callback
  const loginSuccessRef = useRef(loginSuccess)
  const logoutRef = useRef(logout)
  const scheduleRefreshRef = useRef<(token: string) => void>(() => {})

  useEffect(() => { loginSuccessRef.current = loginSuccess }, [loginSuccess])
  useEffect(() => { logoutRef.current = logout }, [logout])

  const scheduleRefresh = useCallback((token: string) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }

    const expiry = getTokenExpiry(token)
    if (!expiry) return

    const delay = Math.max(expiry - Date.now() - REFRESH_BUFFER_MS, 0)

    refreshTimerRef.current = setTimeout(() => {
      const storedRefresh = localStorage.getItem(STORAGE_KEY_REFRESH)
      if (!storedRefresh) {
        logoutRef.current()
        return
      }
      refreshTokenApi({ refreshToken: storedRefresh })
        .then((auth) => {
          loginSuccessRef.current(auth)
          scheduleRefreshRef.current(auth.accessToken)
        })
        .catch(() => logoutRef.current())
    }, delay)
  }, [])

  useEffect(() => {
    scheduleRefreshRef.current = scheduleRefresh
  }, [scheduleRefresh])

  // On mount: check token and schedule refresh
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN)
    const storedRefresh = localStorage.getItem(STORAGE_KEY_REFRESH)
    if (!token || !storedRefresh) return

    const expiry = getTokenExpiry(token)
    if (!expiry) return

    if (expiry - Date.now() < REFRESH_BUFFER_MS) {
      // Token expires soon or already expired — refresh immediately
      refreshTokenApi({ refreshToken: storedRefresh })
        .then((auth) => {
          loginSuccessRef.current(auth)
          scheduleRefresh(auth.accessToken)
        })
        .catch(() => logoutRef.current())
    } else {
      scheduleRefresh(token)
    }

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [scheduleRefresh])

  // Re-schedule whenever token changes (e.g., after login)
  useEffect(() => {
    if (accessToken) {
      scheduleRefresh(accessToken)
    }
  }, [accessToken, scheduleRefresh])

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated: !!user && !!accessToken,
      loginSuccess,
      logout,
    }),
    [user, accessToken, loginSuccess, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
