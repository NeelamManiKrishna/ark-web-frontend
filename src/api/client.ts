import { tokenStore } from '../auth/tokenStore.ts'
import { refreshSession } from '../auth/refreshSession.ts'
import { emitSessionExpired } from '../auth/authEvents.ts'
import { toApiError } from '../auth/apiError.ts'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const REQUEST_TIMEOUT = 30000
const MAX_RETRIES = 2
const RETRY_DELAYS = [1000, 3000]

const RETRYABLE_STATUSES = new Set([408, 429, 502, 503, 504])

/** End the session without a page reload: the auth context reacts and the router navigates. */
function endSession() {
  tokenStore.clear()
  emitSessionExpired()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const token = tokenStore.getAccessToken()
    const incomingHeaders = (options?.headers ?? {}) as Record<string, string>
    // Only set Content-Type if not explicitly provided (multipart needs browser to set it)
    const headers: Record<string, string> = {
      ...(!('Content-Type' in incomingHeaders) && { 'Content-Type': 'application/json' }),
      ...incomingHeaders,
    }
    // Remove empty Content-Type (used by postMultipart to let browser set boundary)
    if (headers['Content-Type'] === '') delete headers['Content-Type']
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    let response: Response
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      })
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof DOMException && err.name === 'AbortError') {
        lastError = new Error('Request timed out. Please check your connection and try again.')
      } else {
        lastError = new Error('Network error: Unable to reach the server. Please check your connection.')
      }
      // Retry on network errors
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS[attempt])
        continue
      }
      throw lastError
    } finally {
      clearTimeout(timeoutId)
    }

    // Handle 401 — attempt token refresh once (shared, rotating refresh token)
    if (response.status === 401 && attempt === 0) {
      const refreshed = await refreshSession()
      if (refreshed) continue // Retry with new token
      endSession()
      throw new Error('Session expired. Please login again.')
    }

    // Handle retryable statuses
    if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_RETRIES) {
      const retryAfter = response.headers.get('Retry-After')
      const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : RETRY_DELAYS[attempt]
      await sleep(Math.min(delay, 10000))
      continue
    }

    if (!response.ok) {
      let parsed = null
      try {
        parsed = await response.json()
      } catch {
        // Body is empty or not JSON
      }
      throw toApiError(response.status, parsed)
    }

    const text = await response.text()
    return (text ? JSON.parse(text) : undefined) as T
  }

  throw lastError ?? new Error('Request failed after retries.')
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path)
}

export function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

export function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
}

export function del<T = void>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' })
}

export function postMultipart<T>(path: string, file: File, fieldName = 'file'): Promise<T> {
  const formData = new FormData()
  formData.append(fieldName, file)
  // Empty Content-Type signals request() to omit it — browser sets multipart boundary
  return request<T>(path, { method: 'POST', body: formData, headers: { 'Content-Type': '' } })
}

/** Download an authenticated file. Rejects with an ApiError/Error when the request fails. */
export async function downloadFile(path: string, fallbackName = 'download'): Promise<void> {
  const token = tokenStore.getAccessToken()
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } catch {
    throw new Error('Network error: Unable to reach the server. Please check your connection.')
  }
  if (!res.ok) {
    let parsed = null
    try {
      parsed = await res.json()
    } catch {
      // Body is empty or not JSON
    }
    throw toApiError(res.status, parsed)
  }

  const disposition = res.headers.get('Content-Disposition') ?? ''
  const match = /filename="?([^";]+)"?/i.exec(disposition)
  const filename = match?.[1] ?? path.split('?')[0].split('/').pop() ?? fallbackName

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
