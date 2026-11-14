import { get, post, put, del } from './client.ts'
import type {
  AcademicYearResponse,
  CreateAcademicYearRequest,
  UpdateAcademicYearRequest,
  SubjectResponse,
  CreateSubjectRequest,
  UpdateSubjectRequest,
} from '../types/catalog.ts'
import type { PagedResponse } from '../types/common.ts'

function base(organizationId: string) {
  return `/api/v1/organizations/${organizationId}`
}

function listQuery(page: number, size: number, q?: string, sort?: string) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', String(size))
  if (q) params.set('q', q)
  if (sort) params.set('sort', sort)
  return params.toString()
}

// ---- academic years ----
export function getAcademicYears(
  organizationId: string,
  page = 0,
  size = 20,
  q?: string,
  sort?: string,
): Promise<PagedResponse<AcademicYearResponse>> {
  return get(`${base(organizationId)}/academic-years?${listQuery(page, size, q, sort)}`)
}

export function createAcademicYear(
  organizationId: string,
  data: CreateAcademicYearRequest,
): Promise<AcademicYearResponse> {
  return post(`${base(organizationId)}/academic-years`, data)
}

export function updateAcademicYear(
  organizationId: string,
  id: string,
  data: UpdateAcademicYearRequest,
): Promise<AcademicYearResponse> {
  return put(`${base(organizationId)}/academic-years/${id}`, data)
}

export function deleteAcademicYear(organizationId: string, id: string): Promise<void> {
  return del(`${base(organizationId)}/academic-years/${id}`)
}

// ---- subjects ----
export function getSubjects(
  organizationId: string,
  page = 0,
  size = 20,
  q?: string,
  sort?: string,
): Promise<PagedResponse<SubjectResponse>> {
  return get(`${base(organizationId)}/subjects?${listQuery(page, size, q, sort)}`)
}

export function createSubject(organizationId: string, data: CreateSubjectRequest): Promise<SubjectResponse> {
  return post(`${base(organizationId)}/subjects`, data)
}

export function updateSubject(
  organizationId: string,
  id: string,
  data: UpdateSubjectRequest,
): Promise<SubjectResponse> {
  return put(`${base(organizationId)}/subjects/${id}`, data)
}

export function deleteSubject(organizationId: string, id: string): Promise<void> {
  return del(`${base(organizationId)}/subjects/${id}`)
}
