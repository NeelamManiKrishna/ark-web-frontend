import type { ExitReason } from '../types/enrollment.ts'
import type { AssignmentType } from '../types/facultyAssignment.ts'

export const EXIT_REASON_OPTIONS: { value: ExitReason; label: string }[] = [
  { value: 'PROMOTED', label: 'Promoted' },
  { value: 'GRADUATED', label: 'Graduated' },
  { value: 'HELD_BACK', label: 'Held Back' },
  { value: 'TRANSFERRED', label: 'Transferred' },
  { value: 'DROPPED', label: 'Dropped' },
]

export const ASSIGNMENT_TYPE_OPTIONS: { value: AssignmentType; label: string }[] = [
  { value: 'SUBJECT_TEACHER', label: 'Subject Teacher' },
  { value: 'CLASS_TEACHER', label: 'Class Teacher' },
  { value: 'BOTH', label: 'Both' },
]

export const STUDENT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'GRADUATED', label: 'Graduated' },
  { value: 'TRANSFERRED', label: 'Transferred' },
  { value: 'DROPPED', label: 'Dropped' },
] as const

export const FACULTY_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'RESIGNED', label: 'Resigned' },
  { value: 'TERMINATED', label: 'Terminated' },
] as const

export const ORGANIZATION_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
] as const

export const BRANCH_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
] as const

export const CLASS_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'COMPLETED', label: 'Completed' },
] as const

export const ENROLLMENT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
] as const

export const ASSIGNMENT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
] as const

export const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
] as const

export const GOVT_ID_TYPE_OPTIONS = [
  { value: 'AADHAAR', label: 'Aadhaar' },
  { value: 'PAN', label: 'PAN' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENSE', label: 'Driving License' },
  { value: 'VOTER_ID', label: 'Voter ID' },
  { value: 'OTHER', label: 'Other' },
] as const

export const PROMOTION_ACTIONS = ['PROMOTE', 'HOLD_BACK', 'GRADUATE'] as const
