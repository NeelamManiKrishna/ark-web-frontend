export interface AcademicYearResponse {
  id: string
  organizationId: string
  label: string
  startDate: string
  endDate: string
  current: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateAcademicYearRequest {
  label: string
  startDate: string
  endDate: string
  current?: boolean
}

export interface UpdateAcademicYearRequest {
  startDate?: string
  endDate?: string
  current?: boolean
}

export interface SubjectResponse {
  id: string
  organizationId: string
  code: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface CreateSubjectRequest {
  code: string
  name: string
}

export type UpdateSubjectRequest = Partial<CreateSubjectRequest>
