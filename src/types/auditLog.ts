export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGIN_FAILED' | 'LOGOUT' | 'REGISTER'

export interface AuditLogResponse {
  id: string
  action: AuditAction
  entityType: string
  entityId: string
  entityName: string
  organizationId: string
  performedBy: string
  performedByEmail: string
  performedByRole: string
  details: string
  timestamp: string
}
