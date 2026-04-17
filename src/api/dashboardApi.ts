import { get } from './client.ts'
import type { PlatformDashboardResponse, OrgDashboardResponse, BranchDashboardResponse } from '../types/dashboard.ts'

export function getPlatformDashboard(): Promise<PlatformDashboardResponse> {
  return get('/api/v1/dashboard/platform')
}

export function getOrgDashboard(organizationId: string): Promise<OrgDashboardResponse> {
  return get(`/api/v1/dashboard/organization/${organizationId}`)
}

export function getBranchDashboard(organizationId: string, branchId: string): Promise<BranchDashboardResponse> {
  return get(`/api/v1/dashboard/organization/${organizationId}/branch/${branchId}`)
}
