import { get, post, put, del } from './client.ts'
import type {
  StudentResponse,
  CreateStudentRequest,
  UpdateStudentRequest,
} from '../types/student.ts'
import type { PagedResponse } from '../types/common.ts'

function basePath(organizationId: string) {
  return `/api/v1/organizations/${organizationId}/students`
}

export function getStudents(
  organizationId: string,
  page = 0,
  size = 10,
  branchId?: string,
  classId?: string,
  sort?: string,
): Promise<PagedResponse<StudentResponse>> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', String(size))
  if (branchId) params.set('branchId', branchId)
  if (classId) params.set('classId', classId)
  if (sort) params.set('sort', sort)
  return get(`${basePath(organizationId)}?${params.toString()}`)
}

export function getStudentById(
  organizationId: string,
  studentId: string,
): Promise<StudentResponse> {
  return get(`${basePath(organizationId)}/${studentId}`)
}

export function createStudent(
  organizationId: string,
  data: CreateStudentRequest,
): Promise<StudentResponse> {
  return post(basePath(organizationId), data)
}

export function updateStudent(
  organizationId: string,
  studentId: string,
  data: UpdateStudentRequest,
): Promise<StudentResponse> {
  return put(`${basePath(organizationId)}/${studentId}`, data)
}

export function deleteStudent(
  organizationId: string,
  studentId: string,
): Promise<void> {
  return del(`${basePath(organizationId)}/${studentId}`)
}
