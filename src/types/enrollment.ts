export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED'

export type ExitReason = 'PROMOTED' | 'GRADUATED' | 'HELD_BACK' | 'TRANSFERRED' | 'DROPPED'

export interface StudentEnrollmentResponse {
  id: string
  arkId: string
  organizationId: string
  branchId: string
  studentId: string
  classId: string
  academicYear: string
  enrolledAt: string
  exitedAt: string | null
  exitReason: ExitReason | null
  status: EnrollmentStatus
  createdAt: string
  updatedAt: string
}

export interface CreateEnrollmentRequest {
  studentId: string
  classId: string
  academicYear: string
  enrolledAt?: string
}

export interface CloseEnrollmentRequest {
  exitReason: ExitReason
  exitedAt?: string
}
