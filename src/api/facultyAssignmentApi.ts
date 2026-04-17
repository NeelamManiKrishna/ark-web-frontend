import { get, post, put, del } from './client.ts'
import type {
  FacultyAssignmentResponse,
  CreateFacultyAssignmentRequest,
  UpdateFacultyAssignmentRequest,
} from '../types/facultyAssignment.ts'
import type { PagedResponse } from '../types/common.ts'

function basePath(organizationId: string, branchId: string) {
  return `/api/v1/organizations/${organizationId}/branches/${branchId}/faculty-assignments`
}

export function createFacultyAssignment(
  organizationId: string,
  branchId: string,
  data: CreateFacultyAssignmentRequest,
): Promise<FacultyAssignmentResponse> {
  return post(basePath(organizationId, branchId), data)
}

export function updateFacultyAssignment(
  organizationId: string,
  branchId: string,
  assignmentId: string,
  data: UpdateFacultyAssignmentRequest,
): Promise<FacultyAssignmentResponse> {
  return put(`${basePath(organizationId, branchId)}/${assignmentId}`, data)
}

export function deleteFacultyAssignment(
  organizationId: string,
  branchId: string,
  assignmentId: string,
): Promise<void> {
  return del(`${basePath(organizationId, branchId)}/${assignmentId}`)
}

export function getFacultyAssignmentById(
  organizationId: string,
  branchId: string,
  assignmentId: string,
): Promise<FacultyAssignmentResponse> {
  return get(`${basePath(organizationId, branchId)}/${assignmentId}`)
}

export function getAssignmentsByBranch(
  organizationId: string,
  branchId: string,
  academicYear: string,
  page = 0,
  size = 10,
  sort?: string,
): Promise<PagedResponse<FacultyAssignmentResponse>> {
  const params = new URLSearchParams({ academicYear, page: String(page), size: String(size) })
  if (sort) params.set('sort', sort)
  return get(`${basePath(organizationId, branchId)}?${params.toString()}`)
}

export function getAssignmentsByClass(
  organizationId: string,
  branchId: string,
  classId: string,
  academicYear: string,
  page = 0,
  size = 10,
  sort?: string,
): Promise<PagedResponse<FacultyAssignmentResponse>> {
  const params = new URLSearchParams({ academicYear, page: String(page), size: String(size) })
  if (sort) params.set('sort', sort)
  return get(`${basePath(organizationId, branchId)}/class/${classId}?${params.toString()}`)
}

export function getAssignmentsByFaculty(
  organizationId: string,
  branchId: string,
  facultyId: string,
  page = 0,
  size = 10,
  sort?: string,
): Promise<PagedResponse<FacultyAssignmentResponse>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (sort) params.set('sort', sort)
  return get(`${basePath(organizationId, branchId)}/faculty/${facultyId}?${params.toString()}`)
}

export function getActiveAssignmentsByFaculty(
  organizationId: string,
  branchId: string,
  facultyId: string,
): Promise<FacultyAssignmentResponse[]> {
  return get(`${basePath(organizationId, branchId)}/faculty/${facultyId}/active`)
}
