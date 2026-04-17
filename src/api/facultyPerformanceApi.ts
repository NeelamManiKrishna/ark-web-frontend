import { get } from './client.ts'
import type {
  FacultyPerformanceResponse,
  FacultyClassPerformanceResponse,
  FacultySubjectPerformanceResponse,
} from '../types/facultyPerformance.ts'

function basePath(organizationId: string, facultyId: string) {
  return `/api/v1/organizations/${organizationId}/faculty/${facultyId}/performance`
}

export function getFacultyPerformance(
  organizationId: string,
  facultyId: string,
  academicYear?: string,
): Promise<FacultyPerformanceResponse> {
  const params = new URLSearchParams()
  if (academicYear) params.set('academicYear', academicYear)
  const qs = params.toString()
  return get(`${basePath(organizationId, facultyId)}${qs ? `?${qs}` : ''}`)
}

export function getFacultyClassPerformance(
  organizationId: string,
  facultyId: string,
  classId: string,
  academicYear: string,
): Promise<FacultyClassPerformanceResponse> {
  const params = new URLSearchParams({ academicYear })
  return get(`${basePath(organizationId, facultyId)}/class/${classId}?${params.toString()}`)
}

export function getFacultySubjectPerformance(
  organizationId: string,
  facultyId: string,
  subjectName: string,
  academicYear?: string,
): Promise<FacultySubjectPerformanceResponse> {
  const params = new URLSearchParams()
  if (academicYear) params.set('academicYear', academicYear)
  const qs = params.toString()
  return get(`${basePath(organizationId, facultyId)}/subject/${encodeURIComponent(subjectName)}${qs ? `?${qs}` : ''}`)
}
