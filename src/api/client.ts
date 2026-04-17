const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const STORAGE_KEY_TOKEN = 'ark_access_token'
const STORAGE_KEY_REFRESH = 'ark_refresh_token'
const STORAGE_KEY_USER = 'ark_user'
const REQUEST_TIMEOUT = 30000
const MAX_RETRIES = 2
const RETRY_DELAYS = [1000, 3000]

const ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input and try again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'A conflict occurred. The record may have been modified by another user.',
  422: 'The submitted data is invalid. Please review and correct it.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'An unexpected server error occurred. Please try again later.',
  502: 'The server is temporarily unavailable. Please try again later.',
  503: 'The service is currently unavailable. Please try again later.',
}

const RETRYABLE_STATUSES = new Set([408, 429, 502, 503, 504])

let refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const storedRefresh = localStorage.getItem(STORAGE_KEY_REFRESH)
    if (!storedRefresh) return false

    try {
      const response = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefresh }),
      })

      if (!response.ok) return false

      const data = await response.json()
      localStorage.setItem(STORAGE_KEY_TOKEN, data.accessToken)
      localStorage.setItem(STORAGE_KEY_REFRESH, data.refreshToken)
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user))
      return true
    } catch {
      return false
    }
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

function clearAuth() {
  localStorage.removeItem(STORAGE_KEY_TOKEN)
  localStorage.removeItem(STORAGE_KEY_REFRESH)
  localStorage.removeItem(STORAGE_KEY_USER)
  window.location.href = '/login'
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN)
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

    // Handle 401 — attempt token refresh once
    if (response.status === 401 && attempt === 0) {
      const refreshed = await tryRefreshToken()
      if (refreshed) continue // Retry with new token
      clearAuth()
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
      // Try to extract a meaningful message from the response body
      let serverMessage = ''
      try {
        const body = await response.json()
        serverMessage = body.message || body.error || ''
      } catch {
        // If JSON parsing fails, ignore the body
      }

      // Use server message for 400/422 (validation errors), otherwise use friendly defaults
      const isValidationError = response.status === 400 || response.status === 422
      if (isValidationError && serverMessage) {
        throw new Error(serverMessage)
      }

      throw new Error(ERROR_MESSAGES[response.status] || 'Something went wrong. Please try again.')
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

export function downloadFile(path: string): void {
  const token = localStorage.getItem(STORAGE_KEY_TOKEN)
  const url = `${BASE_URL}${path}`
  const a = document.createElement('a')
  // Use fetch to add auth header, then trigger download
  fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then((res) => res.blob())
    .then((blob) => {
      a.href = URL.createObjectURL(blob)
      a.download = path.split('/').pop() ?? 'sample.csv'
      a.click()
      URL.revokeObjectURL(a.href)
    })
}
