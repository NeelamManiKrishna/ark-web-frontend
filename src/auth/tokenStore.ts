import type { AccessScope, UserInfo } from '../types/auth.ts'

// The only module that touches auth storage keys.
const KEY_TOKEN = 'ark_access_token'
const KEY_REFRESH = 'ark_refresh_token'
const KEY_USER = 'ark_user'
const KEY_SCOPE = 'ark_scope'

const AUTH_KEYS = [KEY_TOKEN, KEY_REFRESH, KEY_USER, KEY_SCOPE]

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export const tokenStore = {
  getAccessToken: (): string | null => localStorage.getItem(KEY_TOKEN),
  getRefreshToken: (): string | null => localStorage.getItem(KEY_REFRESH),
  getUser: (): UserInfo | null => readJson<UserInfo>(KEY_USER),
  getScope: (): AccessScope | null => readJson<AccessScope>(KEY_SCOPE),

  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(KEY_TOKEN, accessToken)
    localStorage.setItem(KEY_REFRESH, refreshToken)
  },
  setUser(user: UserInfo) {
    localStorage.setItem(KEY_USER, JSON.stringify(user))
  },
  setScope(scope: AccessScope) {
    localStorage.setItem(KEY_SCOPE, JSON.stringify(scope))
  },

  clear() {
    AUTH_KEYS.forEach((k) => localStorage.removeItem(k))
  },

  /** True when a storage event concerns auth data (key null = storage.clear()). */
  isAuthKey: (key: string | null): boolean => key === null || AUTH_KEYS.includes(key),
}

/** Expiry of a JWT access token in epoch ms, or null if unreadable. */
export function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}
