import { get, post, put, del } from './client.ts'
import type {
  UserResponse,
  CreateUserRequest,
  UpdateUserRequest,
} from '../types/user.ts'
import type { PagedResponse } from '../types/common.ts'

function basePath(organizationId: string) {
  return `/api/v1/organizations/${organizationId}/users`
}

export function getUsers(
  organizationId: string,
  page = 0,
  size = 10,
  branchId?: string,
  sort?: string,
): Promise<PagedResponse<UserResponse>> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', String(size))
  if (branchId) params.set('branchId', branchId)
  if (sort) params.set('sort', sort)
  return get(`${basePath(organizationId)}?${params.toString()}`)
}

export function getUserById(
  organizationId: string,
  userId: string,
): Promise<UserResponse> {
  return get(`${basePath(organizationId)}/${userId}`)
}

export function createUser(
  organizationId: string,
  data: CreateUserRequest,
): Promise<UserResponse> {
  return post(basePath(organizationId), data)
}

export function updateUser(
  organizationId: string,
  userId: string,
  data: UpdateUserRequest,
): Promise<UserResponse> {
  return put(`${basePath(organizationId)}/${userId}`, data)
}

export function deleteUser(
  organizationId: string,
  userId: string,
): Promise<void> {
  return del(`${basePath(organizationId)}/${userId}`)
}
