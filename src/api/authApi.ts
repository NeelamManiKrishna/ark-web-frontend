import type { LoginRequest, AuthResponse, RefreshTokenRequest } from '../types/auth.ts'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export async function login(data: LoginRequest): Promise<AuthResponse> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch {
    throw new Error('Network error: Unable to reach the server')
  }

  if (!response.ok) {
    let message = 'Login failed'
    try {
      const body = await response.json()
      message = body.message || message
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  return response.json() as Promise<AuthResponse>
}

export async function refreshToken(data: RefreshTokenRequest): Promise<AuthResponse> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch {
    throw new Error('Network error: Unable to reach the server')
  }

  if (!response.ok) {
    throw new Error('Session expired. Please login again.')
  }

  return response.json() as Promise<AuthResponse>
}
