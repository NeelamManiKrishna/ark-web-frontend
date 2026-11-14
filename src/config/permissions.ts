import type { UserRole } from '../types/auth.ts'

/**
 * The single permission table. Routes, the sidebar and `useCanWrite` all read from it.
 * It mirrors the backend rules (@PreAuthorize); the backend is what actually enforces access.
 *
 * - view:  roles that may open the feature
 * - write: roles that may create/edit/delete in it (omitted = read-only feature)
 */
interface FeaturePermission {
  view: UserRole[]
  write?: UserRole[]
}

const SA: UserRole = 'SUPER_ADMIN'
const OA: UserRole = 'ORG_ADMIN'
const AD: UserRole = 'ADMIN'
const US: UserRole = 'USER'

export const PERMISSIONS = {
  organizations: { view: [SA], write: [SA] },
  settings: { view: [SA, OA], write: [SA, OA] },
  branches: { view: [SA, OA], write: [SA, OA] },
  classes: { view: [SA, OA, AD, US], write: [SA, OA, AD] },
  students: { view: [SA, OA, AD, US], write: [SA, OA, AD] },
  faculty: { view: [SA, OA, AD, US], write: [SA, OA, AD] },
  users: { view: [SA, OA], write: [SA, OA] },
  examinations: { view: [SA, OA, AD, US], write: [SA, OA, AD] },
  enrollments: { view: [SA, OA, AD, US], write: [SA, OA, AD] },
  facultyAssignments: { view: [SA, OA, AD, US], write: [SA, OA, AD] },
  facultyPerformance: { view: [SA, OA, AD] },
  classProgression: { view: [SA, OA, AD], write: [SA, OA] },
  promotions: { view: [SA, OA, AD], write: [SA, OA, AD] },
  catalogs: { view: [SA, OA, AD, US], write: [SA, OA] },
  reports: { view: [SA, OA, AD] },
  auditLogs: { view: [SA] },
  orgAudit: { view: [SA, OA] },
} satisfies Record<string, FeaturePermission>

export type Feature = keyof typeof PERMISSIONS

export function viewRoles(feature: Feature): UserRole[] {
  return PERMISSIONS[feature].view
}

export function writeRoles(feature: Feature): UserRole[] {
  const p: FeaturePermission = PERMISSIONS[feature]
  return p.write ?? []
}
