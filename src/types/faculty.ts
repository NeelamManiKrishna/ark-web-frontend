export type FacultyStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'TERMINATED'

export type FacultyGovtIdType = 'AADHAAR' | 'PAN' | 'PASSPORT' | 'DRIVING_LICENSE' | 'VOTER_ID' | 'OTHER'

export interface FacultyResponse {
  id: string
  arkId: string
  organizationId: string
  branchId: string
  employeeId?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: string
  govtIdType?: FacultyGovtIdType
  govtIdNumber?: string
  address: string
  city: string
  state: string
  zipCode: string
  department: string
  designation: string
  qualifications: string[]
  specializations: string[]
  joiningDate: string
  status: FacultyStatus
  createdAt: string
  updatedAt: string
}

export interface CreateFacultyRequest {
  branchId: string
  employeeId?: string
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
  department: string
  designation: string
  qualifications: string[]
  specializations: string[]
  joiningDate: string
}

export interface UpdateFacultyRequest {
  branchId: string
  employeeId?: string
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
  department: string
  designation: string
  qualifications: string[]
  specializations: string[]
  joiningDate: string
  status: FacultyStatus
}

export interface FacultyFormData {
  branchId: string
  employeeId: string
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
  department: string
  designation: string
  qualifications: string
  specializations: string
  joiningDate: string
}
