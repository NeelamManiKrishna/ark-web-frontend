export type AcademicClassStatus = 'ACTIVE' | 'INACTIVE' | 'COMPLETED'

export interface AcademicClassResponse {
  id: string
  organizationId: string
  branchId: string
  name: string
  section: string
  academicYear: string
  capacity: number
  description: string
  status: AcademicClassStatus
  createdAt: string
  updatedAt: string
}

export interface CreateAcademicClassRequest {
  name: string
  section: string
  academicYear: string
  capacity: number
  description: string
}

export interface UpdateAcademicClassRequest {
  name: string
  section: string
  academicYear: string
  capacity: number
  description: string
  status: AcademicClassStatus
}
