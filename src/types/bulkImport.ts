export interface RowError {
  row: number
  message: string
}

export interface BulkImportResponse {
  entityType: string
  totalRows: number
  successCount: number
  failureCount: number
  errors: RowError[]
}
