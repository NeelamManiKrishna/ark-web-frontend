export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'DROPPED'

export type GovtIdType = 'AADHAAR' | 'PAN' | 'PASSPORT' | 'DRIVING_LICENSE' | 'VOTER_ID' | 'OTHER'

export interface StudentResponse {
  id: string
  arkId: string
  organizationId: string
  branchId: string
  classId: string
  rollNumber?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: string
  govtIdType?: GovtIdType
  govtIdNumber?: string
  address: string
  city: string
  state: string
  zipCode: string
  guardianName: string
  guardianPhone: string
  guardianEmail: string
  enrollmentDate: string
  status: StudentStatus
  createdAt: string
  updatedAt: string
}

export interface CreateStudentRequest {
  branchId: string
  classId: string
  academicYear: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: string
  govtIdType: string
  govtIdNumber: string
  address: string
  city: string
  state: string
  zipCode: string
  guardianName: string
  guardianPhone: string
  guardianEmail: string
  enrollmentDate: string
}

export interface UpdateStudentRequest {
  branchId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: string
  govtIdType?: string
  govtIdNumber?: string
  address: string
  city: string
  state: string
  zipCode: string
  guardianName: string
  guardianPhone: string
  guardianEmail: string
  enrollmentDate: string
  status: StudentStatus
}
