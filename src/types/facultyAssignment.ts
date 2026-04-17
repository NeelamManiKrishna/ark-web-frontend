export type AssignmentType = 'SUBJECT_TEACHER' | 'CLASS_TEACHER' | 'BOTH'

export type AssignmentStatus = 'ACTIVE' | 'COMPLETED'

export interface FacultyAssignmentResponse {
  id: string
  arkId: string
  organizationId: string
  branchId: string
  facultyId: string
  classId: string
  subjectName: string | null
  academicYear: string
  assignmentType: AssignmentType
  status: AssignmentStatus
  createdAt: string
  updatedAt: string
}

export interface CreateFacultyAssignmentRequest {
  facultyId: string
  classId: string
  academicYear: string
  assignmentType: AssignmentType
  subjectName?: string
}

export interface UpdateFacultyAssignmentRequest {
  assignmentType?: AssignmentType
  status?: AssignmentStatus
}
