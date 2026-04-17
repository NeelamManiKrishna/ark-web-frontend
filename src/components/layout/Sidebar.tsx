import { useCallback, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.ts'
import { ROLE_PERMISSIONS, hasRole } from '../../config/roles.ts'
import type { UserRole } from '../../types/auth.ts'
import './Sidebar.css'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  to: string
  label: string
  icon: string
  roles?: UserRole[]
}

const MOBILE_BREAKPOINT = 992

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth()
  const orgId = user?.organizationId
  const branchId = user?.branchId
  const role = user?.role

  const navItems = useMemo((): NavItem[] => {
    const items: NavItem[] = [
      { to: '/', label: 'Dashboard', icon: '\u2302' },
    ]

    // Super Admin: Organizations (drill-down to branches/students/etc)
    items.push(
      { to: '/organizations', label: 'Organizations', icon: '\u2616', roles: ROLE_PERMISSIONS.organizations },
    )

    // Org Admin: manages all branches, students, faculty, users in their org
    if (role === 'ORG_ADMIN' && orgId) {
      items.push(
        { to: `/organizations/${orgId}/branches`, label: 'Branches', icon: '\u2616', roles: ROLE_PERMISSIONS.branches },
        { to: `/organizations/${orgId}/students`, label: 'Students', icon: '\u2630', roles: ROLE_PERMISSIONS.students },
        { to: `/organizations/${orgId}/faculty`, label: 'Faculty', icon: '\u263A', roles: ROLE_PERMISSIONS.faculty },
        { to: `/organizations/${orgId}/users`, label: 'Users', icon: '\u263A', roles: ROLE_PERMISSIONS.users },
      )
    }

    // Admin: manages students, faculty, classes, examinations within their org/branch
    if (role === 'ADMIN' && orgId) {
      if (branchId) {
        items.push(
          { to: `/organizations/${orgId}/branches/${branchId}/classes`, label: 'Classes', icon: '\u2616', roles: ROLE_PERMISSIONS.classes },
          { to: `/organizations/${orgId}/branches/${branchId}/students`, label: 'Students', icon: '\u2630', roles: ROLE_PERMISSIONS.students },
          { to: `/organizations/${orgId}/branches/${branchId}/examinations`, label: 'Examinations', icon: '\u2637', roles: ROLE_PERMISSIONS.examinations },
        )
      }
      items.push(
        { to: `/organizations/${orgId}/faculty`, label: 'Faculty', icon: '\u263A', roles: ROLE_PERMISSIONS.faculty },
      )
    }

    // User: read-only access to faculty (students accessed via branch > classes drill-down)
    if (role === 'USER' && orgId) {
      if (branchId) {
        items.push(
          { to: `/organizations/${orgId}/branches/${branchId}/students`, label: 'Students', icon: '\u2630', roles: ROLE_PERMISSIONS.students },
        )
      }
      items.push(
        { to: `/organizations/${orgId}/faculty`, label: 'Faculty', icon: '\u263A', roles: ROLE_PERMISSIONS.faculty },
      )
    }

    items.push(
      { to: '/academic-records', label: 'Academic Records', icon: '\u2630', roles: ROLE_PERMISSIONS.academicRecords },
      { to: '/reports', label: 'Reports', icon: '\u2637', roles: ROLE_PERMISSIONS.reports },
      { to: '/audit-logs', label: 'Audit Logs', icon: '\u2618', roles: ROLE_PERMISSIONS.auditLogs },
    )

    return items
  }, [role, orgId, branchId])

  const visibleItems = useMemo(
    () => navItems.filter((item) => !item.roles || hasRole(user?.role, item.roles)),
    [navItems, user?.role],
  )

  const handleNavClick = useCallback(() => {
    if (window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches) {
      onClose()
    }
  }, [onClose])

  return (
    <>
      <div
        className={`sidebar-overlay d-lg-none ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />
      <nav className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-nav">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              className="sidebar-link"
              to={item.to}
              end={item.to === '/'}
              onClick={handleNavClick}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span className="sidebar-link-text">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}

export default Sidebar
