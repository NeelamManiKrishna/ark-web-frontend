import { get, post, put, del } from './client.ts'
import type {
  FacultyResponse,
  CreateFacultyRequest,
  UpdateFacultyRequest,
} from '../types/faculty.ts'
import type { PagedResponse } from '../types/common.ts'

function basePath(organizationId: string) {
  return `/api/v1/organizations/${organizationId}/faculty`
}

export function getFaculty(
  organizationId: string,
  page = 0,
  size = 10,
  branchId?: string,
  department?: string,
  sort?: string,
): Promise<PagedResponse<FacultyResponse>> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', String(size))
  if (branchId) params.set('branchId', branchId)
  if (department) params.set('department', department)
  if (sort) params.set('sort', sort)
  return get(`${basePath(organizationId)}?${params.toString()}`)
}

export function getFacultyById(
  organizationId: string,
  facultyId: string,
): Promise<FacultyResponse> {
  return get(`${basePath(organizationId)}/${facultyId}`)
}

export function createFaculty(
  organizationId: string,
  data: CreateFacultyRequest,
): Promise<FacultyResponse> {
  return post(basePath(organizationId), data)
}

export function updateFaculty(
  organizationId: string,
  facultyId: string,
  data: UpdateFacultyRequest,
): Promise<FacultyResponse> {
  return put(`${basePath(organizationId)}/${facultyId}`, data)
}

export function deleteFaculty(
  organizationId: string,
  facultyId: string,
): Promise<void> {
  return del(`${basePath(organizationId)}/${facultyId}`)
}
