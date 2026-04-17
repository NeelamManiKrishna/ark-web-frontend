import { get, post, put, del } from './client.ts'
import type {
  AcademicClassResponse,
  CreateAcademicClassRequest,
  UpdateAcademicClassRequest,
} from '../types/academicClass.ts'
import type { PagedResponse } from '../types/common.ts'

function basePath(organizationId: string, branchId: string) {
  return `/api/v1/organizations/${organizationId}/branches/${branchId}/classes`
}

export function getAcademicClasses(
  organizationId: string,
  branchId: string,
  page = 0,
  size = 10,
  sort?: string,
): Promise<PagedResponse<AcademicClassResponse>> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', String(size))
  if (sort) params.set('sort', sort)
  return get(`${basePath(organizationId, branchId)}?${params.toString()}`)
}

export function getAcademicClassById(
  organizationId: string,
  branchId: string,
  classId: string,
): Promise<AcademicClassResponse> {
  return get(`${basePath(organizationId, branchId)}/${classId}`)
}

export function createAcademicClass(
  organizationId: string,
  branchId: string,
  data: CreateAcademicClassRequest,
): Promise<AcademicClassResponse> {
  return post(basePath(organizationId, branchId), data)
}

export function updateAcademicClass(
  organizationId: string,
  branchId: string,
  classId: string,
  data: UpdateAcademicClassRequest,
): Promise<AcademicClassResponse> {
  return put(`${basePath(organizationId, branchId)}/${classId}`, data)
}

export function deleteAcademicClass(
  organizationId: string,
  branchId: string,
  classId: string,
): Promise<void> {
  return del(`${basePath(organizationId, branchId)}/${classId}`)
}
