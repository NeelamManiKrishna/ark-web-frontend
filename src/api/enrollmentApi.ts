import { get, post, put } from './client.ts'
import type {
  StudentEnrollmentResponse,
  CreateEnrollmentRequest,
  CloseEnrollmentRequest,
} from '../types/enrollment.ts'
import type { PagedResponse } from '../types/common.ts'

function basePath(organizationId: string, branchId: string) {
  return `/api/v1/organizations/${organizationId}/branches/${branchId}/enrollments`
}

export function createEnrollment(
  organizationId: string,
  branchId: string,
  data: CreateEnrollmentRequest,
): Promise<StudentEnrollmentResponse> {
  return post(basePath(organizationId, branchId), data)
}

export function closeEnrollment(
  organizationId: string,
  branchId: string,
  enrollmentId: string,
  data: CloseEnrollmentRequest,
): Promise<StudentEnrollmentResponse> {
  return put(`${basePath(organizationId, branchId)}/${enrollmentId}/close`, data)
}

export function getEnrollmentsByBranch(
  organizationId: string,
  branchId: string,
  academicYear: string,
  page = 0,
  size = 10,
  sort?: string,
): Promise<PagedResponse<StudentEnrollmentResponse>> {
  const params = new URLSearchParams({ academicYear, page: String(page), size: String(size) })
  if (sort) params.set('sort', sort)
  return get(`${basePath(organizationId, branchId)}?${params.toString()}`)
}

export function getEnrollmentsByClass(
  organizationId: string,
  branchId: string,
  classId: string,
  page = 0,
  size = 10,
  sort?: string,
): Promise<PagedResponse<StudentEnrollmentResponse>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (sort) params.set('sort', sort)
  return get(`${basePath(organizationId, branchId)}/class/${classId}?${params.toString()}`)
}

export function getActiveEnrollment(
  organizationId: string,
  branchId: string,
  studentId: string,
): Promise<StudentEnrollmentResponse> {
  return get(`${basePath(organizationId, branchId)}/student/${studentId}/active`)
}

export function getEnrollmentHistory(
  organizationId: string,
  branchId: string,
  studentId: string,
): Promise<StudentEnrollmentResponse[]> {
  return get(`${basePath(organizationId, branchId)}/student/${studentId}/history`)
}
