export interface SourceClassInfo {
  id: string
  name: string
  section: string
  academicYear: string
  branchId: string
  status: string
}

export interface PromotionCandidate {
  studentId: string
  studentArkId: string
  firstName: string
  lastName: string
  rollNumber: string
  recommendation: string
  hasFailingResults: boolean
  failedSubjects: string[]
  examSummary: string
  hasExamData: boolean
}

export interface PromotionPreviewResponse {
  sourceClass: SourceClassInfo
  targetClassName: string
  targetAcademicYear: string
  totalEligible: number
  totalRecommendedPromote: number
  totalRecommendedHoldBack: number
  totalRecommendedGraduate: number
  totalNoExamData: number
  candidates: PromotionCandidate[]
  terminalClass: boolean
}

export interface StudentOverride {
  studentId: string
  action: string
  reason?: string
}

export interface PromotionExecuteRequest {
  sourceClassId: string
  targetAcademicYear: string
  targetSection?: string
  studentOverrides?: StudentOverride[]
}

export interface PromotionSummary {
  totalProcessed: number
  promoted: number
  graduated: number
  heldBack: number
}

export interface PromotionRecordDto {
  studentId: string
  studentArkId: string
  studentName: string
  promotionType: string
  reason: string
  targetClassId: string
}

export interface PromotionExecuteResponse {
  sourceClassId: string
  sourceClassName: string
  targetClassId: string
  targetClassName: string
  sourceAcademicYear: string
  targetAcademicYear: string
  summary: PromotionSummary
  records: PromotionRecordDto[]
}
