import { describe, expect, it } from 'vitest'
import { PERMISSIONS, viewRoles, writeRoles } from './permissions.ts'
import { ROLE_PERMISSIONS, WRITE_ROLES, hasRole } from './roles.ts'

describe('permission table', () => {
  it('every writer can also view the feature', () => {
    for (const feature of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) {
      for (const role of writeRoles(feature)) {
        expect(viewRoles(feature), `${feature}: ${role}`).toContain(role)
      }
    }
  })

  it('USER is read-only everywhere', () => {
    for (const feature of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) {
      expect(writeRoles(feature)).not.toContain('USER')
    }
  })

  it('mirrors the backend rules for key features', () => {
    expect(viewRoles('organizations')).toEqual(['SUPER_ADMIN'])
    expect(writeRoles('classProgression')).toEqual(['SUPER_ADMIN', 'ORG_ADMIN'])
    expect(writeRoles('promotions')).toContain('ADMIN')
    expect(viewRoles('reports')).not.toContain('USER')
    expect(writeRoles('settings')).toEqual(['SUPER_ADMIN', 'ORG_ADMIN'])
  })

  it('legacy ROLE_PERMISSIONS / WRITE_ROLES are derived from the table', () => {
    expect(ROLE_PERMISSIONS.students).toBe(PERMISSIONS.students.view)
    expect(WRITE_ROLES.students).toBe(PERMISSIONS.students.write)
    expect(WRITE_ROLES.reports).toEqual([])
  })

  it('unknown roles have no access', () => {
    expect(hasRole('PARENT', viewRoles('students'))).toBe(false)
  })
})
