import { get, post, put, del } from './client.ts'
import type {
  ExaminationResponse,
  CreateExaminationRequest,
  UpdateExaminationRequest,
  ExamSubjectResponse,
  CreateExamSubjectRequest,
  UpdateExamSubjectRequest,
  ExamResultResponse,
  CreateExamResultRequest,
  UpdateExamResultRequest,
} from '../types/examination.ts'
import type { PagedResponse } from '../types/common.ts'

// ── Examinations ──

function examBasePath(organizationId: string) {
  return `/api/v1/organizations/${organizationId}`
}

export function getExaminations(
  organizationId: string,
  branchId: string,
  page = 0,
  size = 10,
  academicYear?: string,
  sort?: string,
): Promise<PagedResponse<ExaminationResponse>> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', String(size))
  if (academicYear) params.set('academicYear', academicYear)
  if (sort) params.set('sort', sort)
  return get(`${examBasePath(organizationId)}/branches/${branchId}/examinations?${params.toString()}`)
}

export function createExamination(
  organizationId: string,
  branchId: string,
  data: CreateExaminationRequest,
): Promise<ExaminationResponse> {
  return post(`${examBasePath(organizationId)}/branches/${branchId}/examinations`, data)
}

export function getExaminationById(
  organizationId: string,
  examId: string,
): Promise<ExaminationResponse> {
  return get(`${examBasePath(organizationId)}/examinations/${examId}`)
}

export function updateExamination(
  organizationId: string,
  examId: string,
  data: UpdateExaminationRequest,
): Promise<ExaminationResponse> {
  return put(`${examBasePath(organizationId)}/examinations/${examId}`, data)
}

export function deleteExamination(
  organizationId: string,
  examId: string,
): Promise<void> {
  return del(`${examBasePath(organizationId)}/examinations/${examId}`)
}

// ── Exam Subjects ──

export function getExamSubjects(
  organizationId: string,
  examId: string,
  page = 0,
  size = 10,
  sort?: string,
): Promise<PagedResponse<ExamSubjectResponse>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (sort) params.set('sort', sort)
  return get(`${examBasePath(organizationId)}/examinations/${examId}/subjects?${params.toString()}`)
}

export function createExamSubject(
  organizationId: string,
  examId: string,
  data: CreateExamSubjectRequest,
): Promise<ExamSubjectResponse> {
  return post(`${examBasePath(organizationId)}/examinations/${examId}/subjects`, data)
}

export function updateExamSubject(
  organizationId: string,
  examId: string,
  subjectId: string,
  data: UpdateExamSubjectRequest,
): Promise<ExamSubjectResponse> {
  return put(`${examBasePath(organizationId)}/examinations/${examId}/subjects/${subjectId}`, data)
}

export function deleteExamSubject(
  organizationId: string,
  examId: string,
  subjectId: string,
): Promise<void> {
  return del(`${examBasePath(organizationId)}/examinations/${examId}/subjects/${subjectId}`)
}

// ── Exam Results ──

export function getExamResults(
  organizationId: string,
  examId: string,
  subjectId: string,
  page = 0,
  size = 10,
  sort?: string,
): Promise<PagedResponse<ExamResultResponse>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (sort) params.set('sort', sort)
  return get(`${examBasePath(organizationId)}/examinations/${examId}/subjects/${subjectId}/results?${params.toString()}`)
}

export function createExamResult(
  organizationId: string,
  examId: string,
  subjectId: string,
  data: CreateExamResultRequest,
): Promise<ExamResultResponse> {
  return post(`${examBasePath(organizationId)}/examinations/${examId}/subjects/${subjectId}/results`, data)
}

export function updateExamResult(
  organizationId: string,
  examId: string,
  resultId: string,
  data: UpdateExamResultRequest,
): Promise<ExamResultResponse> {
  return put(`${examBasePath(organizationId)}/examinations/${examId}/results/${resultId}`, data)
}

export function getClassExamResults(
  organizationId: string,
  examId: string,
  classId: string,
  page = 0,
  size = 10,
  sort?: string,
): Promise<PagedResponse<ExamResultResponse>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (sort) params.set('sort', sort)
  return get(`${examBasePath(organizationId)}/examinations/${examId}/classes/${classId}/results?${params.toString()}`)
}

export function getStudentExamResults(
  organizationId: string,
  examId: string,
  studentId: string,
): Promise<ExamResultResponse[]> {
  return get(`${examBasePath(organizationId)}/examinations/${examId}/students/${studentId}/results`)
}
