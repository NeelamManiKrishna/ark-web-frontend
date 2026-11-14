import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.ts'
import { hasRole } from '../config/roles.ts'
import { viewRoles } from '../config/permissions.ts'
import type { Feature } from '../config/permissions.ts'

interface Tab {
  to: string
  label: string
  feature: Feature
}

function TabBar({ label, tabs }: { label: string; tabs: Tab[] }) {
  const { user } = useAuth()
  const visible = tabs.filter((t) => hasRole(user?.role, viewRoles(t.feature)))
  if (visible.length < 2) return null

  return (
    <nav aria-label={label}>
      <ul className="nav nav-tabs mb-3">
        {visible.map((t) => (
          <li className="nav-item" key={t.to}>
            <NavLink to={t.to} end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

interface ClassTabsProps {
  organizationId?: string
  branchId?: string
  classId?: string
}

/** Sections of one class. Each tab is its own route. */
export function ClassTabs({ organizationId, branchId, classId }: ClassTabsProps) {
  if (!organizationId || !branchId || !classId) return null
  const base = `/organizations/${organizationId}/branches/${branchId}/classes/${classId}`
  return (
    <TabBar
      label="Class sections"
      tabs={[
        { to: `${base}/enrollments`, label: 'Roster', feature: 'enrollments' },
        { to: `${base}/faculty`, label: 'Teachers', feature: 'facultyAssignments' },
        { to: `${base}/results`, label: 'Results', feature: 'examinations' },
        { to: `${base}/enter-marks`, label: 'Enter marks', feature: 'examinations' },
        { to: `${base}/promotions`, label: 'Promotion', feature: 'promotions' },
      ]}
    />
  )
}

interface StudentTabsProps {
  organizationId?: string
  branchId?: string
  studentId?: string
}

/** Sections of one student. */
export function StudentTabs({ organizationId, branchId, studentId }: StudentTabsProps) {
  if (!organizationId || !branchId || !studentId) return null
  const base = `/organizations/${organizationId}/branches/${branchId}/students/${studentId}`
  return (
    <TabBar
      label="Student sections"
      tabs={[
        { to: `${base}/enrollments`, label: 'Enrollments', feature: 'enrollments' },
        { to: `${base}/report-card`, label: 'Report cards', feature: 'students' },
      ]}
    />
  )
}

interface FacultyTabsProps {
  organizationId?: string
  branchId?: string
  facultyId?: string
}

/** Sections of one faculty member. Assignments need a branch (they are branch-scoped). */
export function FacultyTabs({ organizationId, branchId, facultyId }: FacultyTabsProps) {
  if (!organizationId || !facultyId) return null
  const tabs: Tab[] = []
  if (branchId) {
    tabs.push({
      to: `/organizations/${organizationId}/branches/${branchId}/faculty/${facultyId}/assignments`,
      label: 'Assignments',
      feature: 'facultyAssignments',
    })
  }
  tabs.push({
    to: `/organizations/${organizationId}/faculty/${facultyId}/performance${branchId ? `?branchId=${branchId}` : ''}`,
    label: 'Performance',
    feature: 'facultyPerformance',
  })
  return <TabBar label="Faculty sections" tabs={tabs} />
}
