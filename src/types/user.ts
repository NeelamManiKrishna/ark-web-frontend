import type { UserRole } from './auth.ts'

export type { UserRole }

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED'

export interface UserResponse {
  id: string
  fullName: string
  email: string
  role: UserRole
  organizationId: string
  branchId: string
  department: string
  status: UserStatus
  createdAt: string
  updatedAt: string
}

export interface CreateUserRequest {
  fullName: string
  email: string
  password: string
  role: UserRole
  branchId: string
  department: string
}

export interface UpdateUserRequest {
  fullName: string
  email: string
  password?: string
  role: UserRole
  branchId: string
  department: string
  status: UserStatus
}

export interface UserFormData {
  fullName: string
  email: string
  password: string
  role: string
  branchId: string
  department: string
}
