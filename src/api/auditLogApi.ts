import { get } from './client.ts'
import type { AuditLogResponse } from '../types/auditLog.ts'
import type { PagedResponse } from '../types/common.ts'

export function getAuditLogs(
  page = 0,
  size = 20,
  organizationId?: string,
  action?: string,
  entityType?: string,
  userId?: string,
  sort?: string,
): Promise<PagedResponse<AuditLogResponse>> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', String(size))
  if (organizationId) params.set('organizationId', organizationId)
  if (action) params.set('action', action)
  if (entityType) params.set('entityType', entityType)
  if (userId) params.set('userId', userId)
  if (sort) params.set('sort', sort)
  return get(`/api/v1/audit-logs?${params.toString()}`)
}
