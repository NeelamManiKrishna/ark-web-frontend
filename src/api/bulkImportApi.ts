import { postMultipart, downloadFile } from './client.ts'
import type { BulkImportResponse } from '../types/bulkImport.ts'

function basePath(organizationId: string) {
  return `/api/v1/organizations/${organizationId}/bulk-import`
}

export function importStudents(
  organizationId: string,
  file: File,
): Promise<BulkImportResponse> {
  return postMultipart(`${basePath(organizationId)}/students`, file)
}

export function importFaculty(
  organizationId: string,
  file: File,
): Promise<BulkImportResponse> {
  return postMultipart(`${basePath(organizationId)}/faculty`, file)
}

export function importAcademicClasses(
  organizationId: string,
  file: File,
): Promise<BulkImportResponse> {
  return postMultipart(`${basePath(organizationId)}/academic-classes`, file)
}

export function importBranches(
  organizationId: string,
  file: File,
): Promise<BulkImportResponse> {
  return postMultipart(`${basePath(organizationId)}/branches`, file)
}

export function downloadSampleCsv(organizationId: string, entityType: string): void {
  downloadFile(`${basePath(organizationId)}/samples/${entityType}`)
}
