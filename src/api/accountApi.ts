import { get, post } from './client.ts'
import type { ChangePasswordRequest, MeResponse } from '../types/auth.ts'
import {
  USE_MOCK_AUTH,
  mockGetMe,
  mockNoop,
  mockChangePassword,
} from './mock/mockAccount.ts'

// Authenticated account endpoints (contract A1).

export function getMe(): Promise<MeResponse> {
  return USE_MOCK_AUTH ? mockGetMe() : get<MeResponse>('/api/v1/auth/me')
}

export function logoutRequest(refreshToken: string): Promise<void> {
  return USE_MOCK_AUTH ? mockNoop() : post<void>('/api/v1/auth/logout', { refreshToken })
}

export function logoutAllRequest(): Promise<void> {
  return USE_MOCK_AUTH ? mockNoop() : post<void>('/api/v1/auth/logout-all', {})
}

export function changePassword(data: ChangePasswordRequest): Promise<void> {
  return USE_MOCK_AUTH ? mockChangePassword(data) : post<void>('/api/v1/auth/change-password', data)
}
