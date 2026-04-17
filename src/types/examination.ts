export type ExamType = 'MIDTERM' | 'FINAL' | 'QUARTERLY' | 'HALF_YEARLY' | 'UNIT_TEST' | 'SUPPLEMENTARY'
export type ExamStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type ExamSubjectStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
export type ExamResultStatus = 'PASS' | 'FAIL' | 'ABSENT' | 'WITHHELD'

export interface ExaminationResponse {
  id: string
  arkId: string
  organizationId: string
  branchId: string
  name: string
  academicYear: string
  examType: ExamType
  startDate: string
  endDate: string
  description: string
  status: ExamStatus
  createdAt: string
  updatedAt: string
}

export interface CreateExaminationRequest {
  name: string
  academicYear: string
  examType: ExamType
  startDate: string
  endDate: string
  description: string
}

export interface UpdateExaminationRequest {
  name?: string
  academicYear?: string
  examType?: ExamType
  startDate?: string
  endDate?: string
  description?: string
  status?: ExamStatus
}

export interface ExamSubjectResponse {
  id: string
  examinationId: string
  organizationId: string
  branchId: string
  classId: string
  subjectName: string
  subjectCode: string
  maxMarks: number
  passingMarks: number
  examDate: string
  status: ExamSubjectStatus
  createdAt: string
  updatedAt: string
}

export interface CreateExamSubjectRequest {
  classId: string
  subjectName: string
  subjectCode: string
  maxMarks: number
  passingMarks: number
  examDate: string
}

export interface UpdateExamSubjectRequest {
  subjectName?: string
  subjectCode?: string
  maxMarks?: number
  passingMarks?: number
  examDate?: string
  status?: ExamSubjectStatus
}

export interface ExamResultResponse {
  id: string
  examinationId: string
  examSubjectId: string
  organizationId: string
  branchId: string
  classId: string
  studentId: string
  marksObtained: number
  grade: string
  remarks: string
  status: ExamResultStatus
  createdAt: string
  updatedAt: string
}

export interface CreateExamResultRequest {
  studentId: string
  marksObtained: number
  remarks: string
}

export interface UpdateExamResultRequest {
  marksObtained?: number
  remarks?: string
  status?: ExamResultStatus
}
