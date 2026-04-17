import { get, post, put, del } from './client.ts'
import type {
  BranchResponse,
  CreateBranchRequest,
  UpdateBranchRequest,
} from '../types/branch.ts'
import type { PagedResponse } from '../types/common.ts'

function basePath(organizationId: string) {
  return `/api/v1/organizations/${organizationId}/branches`
}

export function getBranches(
  organizationId: string,
  page = 0,
  size = 10,
  sort?: string,
): Promise<PagedResponse<BranchResponse>> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', String(size))
  if (sort) params.set('sort', sort)
  return get(`${basePath(organizationId)}?${params.toString()}`)
}

export function getBranchById(
  organizationId: string,
  branchId: string,
): Promise<BranchResponse> {
  return get(`${basePath(organizationId)}/${branchId}`)
}

export function createBranch(
  organizationId: string,
  data: CreateBranchRequest,
): Promise<BranchResponse> {
  return post(basePath(organizationId), data)
}

export function updateBranch(
  organizationId: string,
  branchId: string,
  data: UpdateBranchRequest,
): Promise<BranchResponse> {
  return put(`${basePath(organizationId)}/${branchId}`, data)
}

export function deleteBranch(
  organizationId: string,
  branchId: string,
): Promise<void> {
  return del(`${basePath(organizationId)}/${branchId}`)
}
