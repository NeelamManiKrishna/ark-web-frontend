import type { UserRole } from '../types/auth.ts'

// Which roles can access each feature
export const ROLE_PERMISSIONS = {
  organizations: ['SUPER_ADMIN'] as UserRole[],
  branches: ['SUPER_ADMIN', 'ORG_ADMIN'] as UserRole[],
  classes: ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN', 'USER'] as UserRole[],
  students: ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN', 'USER'] as UserRole[],
  faculty: ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN', 'USER'] as UserRole[],
  users: ['SUPER_ADMIN', 'ORG_ADMIN'] as UserRole[],
  examinations: ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN', 'USER'] as UserRole[],
  enrollments: ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN', 'USER'] as UserRole[],
  facultyAssignments: ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN', 'USER'] as UserRole[],
  facultyPerformance: ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN'] as UserRole[],
  classProgression: ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN'] as UserRole[],
  promotions: ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN'] as UserRole[],
  academicRecords: ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN', 'USER'] as UserRole[],
  reports: ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN', 'USER'] as UserRole[],
  auditLogs: ['SUPER_ADMIN'] as UserRole[],
}

// Which roles can create/edit/delete within a feature
export const WRITE_ROLES = {
  organizations: ['SUPER_ADMIN'] as UserRole[],
  branches: ['SUPER_ADMIN', 'ORG_ADMIN'] as UserRole[],
  classes: ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN'] as UserRole[],
  students: ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN'] as UserRole[],
  faculty: ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN'] as UserRole[],
  users: ['SUPER_ADMIN', 'ORG_ADMIN'] as UserRole[],
  examinations: ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN'] as UserRole[],
  enrollments: ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN'] as UserRole[],
  facultyAssignments: ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN'] as UserRole[],
  classProgression: ['SUPER_ADMIN', 'ORG_ADMIN'] as UserRole[],
  promotions: ['SUPER_ADMIN', 'ORG_ADMIN', 'ADMIN'] as UserRole[],
}

export function hasRole(userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean {
  return !!userRole && allowedRoles.includes(userRole)
}
