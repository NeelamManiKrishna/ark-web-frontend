export type OrganizationStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export interface OrganizationResponse {
  id: string
  arkId: string
  name: string
  address: string
  contactEmail: string
  contactPhone: string
  website: string
  logoUrl: string
  status: OrganizationStatus
  createdAt: string
  updatedAt: string
}

export interface CreateOrganizationRequest {
  name: string
  address: string
  contactEmail: string
  contactPhone: string
  website: string
  logoUrl: string
}

export interface UpdateOrganizationRequest {
  name?: string
  address?: string
  contactEmail?: string
  contactPhone?: string
  website?: string
  logoUrl?: string
  status?: OrganizationStatus
}
