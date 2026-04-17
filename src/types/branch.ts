export type BranchStatus = 'ACTIVE' | 'INACTIVE'

export interface BranchResponse {
  id: string
  arkId: string
  organizationId: string
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  contactEmail: string
  contactPhone: string
  status: BranchStatus
  createdAt: string
  updatedAt: string
}

export interface CreateBranchRequest {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  contactEmail: string
  contactPhone: string
}

export interface UpdateBranchRequest {
  name?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  contactEmail?: string
  contactPhone?: string
  status?: BranchStatus
}
