import { get, post } from './client.ts'
import type {
  PromotionPreviewResponse,
  PromotionExecuteRequest,
  PromotionExecuteResponse,
} from '../types/promotion.ts'

function basePath(organizationId: string, branchId: string) {
  return `/api/v1/organizations/${organizationId}/branches/${branchId}/promotions`
}

export function previewPromotion(
  organizationId: string,
  branchId: string,
  sourceClassId: string,
  targetAcademicYear: string,
): Promise<PromotionPreviewResponse> {
  const params = new URLSearchParams({ sourceClassId, targetAcademicYear })
  return get(`${basePath(organizationId, branchId)}/preview?${params.toString()}`)
}

export function executePromotion(
  organizationId: string,
  branchId: string,
  data: PromotionExecuteRequest,
): Promise<PromotionExecuteResponse> {
  return post(`${basePath(organizationId, branchId)}/execute`, data)
}
