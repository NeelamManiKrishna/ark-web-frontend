import { get, put } from './client.ts'
import type {
  ClassProgressionRequest,
  ClassProgressionResponse,
} from '../types/classProgression.ts'

function basePath(organizationId: string, branchId: string) {
  return `/api/v1/organizations/${organizationId}/branches/${branchId}/class-progression`
}

export function getClassProgression(
  organizationId: string,
  branchId: string,
): Promise<ClassProgressionResponse> {
  return get(basePath(organizationId, branchId))
}

export function setClassProgression(
  organizationId: string,
  branchId: string,
  data: ClassProgressionRequest,
): Promise<ClassProgressionResponse> {
  return put(basePath(organizationId, branchId), data)
}
