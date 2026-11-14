import { get, downloadFile } from './client.ts'

export interface Report {
  title: string
  academicYear: string
  columns: string[]
  rows: Record<string, string | number | boolean | null>[]
}

export type ReportKind = 'enrollment' | 'performance'

function path(organizationId: string, kind: ReportKind, academicYear: string, branchId?: string, format?: 'csv') {
  const params = new URLSearchParams()
  params.set('academicYear', academicYear)
  if (branchId) params.set('branchId', branchId)
  if (format) params.set('format', format)
  return `/api/v1/organizations/${organizationId}/reports/${kind}?${params.toString()}`
}

export function getReport(
  organizationId: string,
  kind: ReportKind,
  academicYear: string,
  branchId?: string,
): Promise<Report> {
  return get(path(organizationId, kind, academicYear, branchId))
}

export function downloadReportCsv(
  organizationId: string,
  kind: ReportKind,
  academicYear: string,
  branchId?: string,
): Promise<void> {
  return downloadFile(path(organizationId, kind, academicYear, branchId, 'csv'), `${kind}-${academicYear}.csv`)
}
