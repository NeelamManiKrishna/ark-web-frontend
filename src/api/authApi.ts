import type { LoginRequest, AuthResponse, RefreshTokenRequest } from '../types/auth.ts'
import { toApiError } from '../auth/apiError.ts'

// Public (no bearer token) auth calls. Kept free of client.ts so token refresh can use it without a cycle.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

async function postPublic<T>(path: string, body: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Network error: Unable to reach the server')
  }

  if (!response.ok) {
    let parsed = null
    try {
      parsed = await response.json()
    } catch {
      // ignore parse errors
    }
    throw toApiError(response.status, parsed)
  }

  return response.json() as Promise<T>
}

export function login(data: LoginRequest): Promise<AuthResponse> {
  return postPublic('/api/v1/auth/login', data)
}

export function refreshToken(data: RefreshTokenRequest): Promise<AuthResponse> {
  return postPublic('/api/v1/auth/refresh', data)
}
