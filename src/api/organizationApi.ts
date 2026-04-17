import { get, post, put, del } from './client.ts'
import type {
  OrganizationResponse,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from '../types/organization.ts'
import type { PagedResponse } from '../types/common.ts'

const BASE = '/api/v1/organizations'

export function getOrganizations(page = 0, size = 10, sort?: string): Promise<PagedResponse<OrganizationResponse>> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', String(size))
  if (sort) params.set('sort', sort)
  return get(`${BASE}?${params.toString()}`)
}

export function getOrganizationById(id: string): Promise<OrganizationResponse> {
  return get(`${BASE}/${id}`)
}

export function createOrganization(data: CreateOrganizationRequest): Promise<OrganizationResponse> {
  return post(BASE, data)
}

export function updateOrganization(id: string, data: UpdateOrganizationRequest): Promise<OrganizationResponse> {
  return put(`${BASE}/${id}`, data)
}

export function deleteOrganization(id: string): Promise<void> {
  return del(`${BASE}/${id}`)
}
