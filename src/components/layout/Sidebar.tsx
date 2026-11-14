import { useEffect, useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.ts'
import { hasRole } from '../../config/roles.ts'
import { viewRoles } from '../../config/permissions.ts'
import type { Feature } from '../../config/permissions.ts'
import './Sidebar.css'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  to: string
  label: string
  icon: string
  feature?: Feature
}

interface NavGroup {
  heading?: string
  items: NavItem[]
}

const MOBILE_BREAKPOINT = 992

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, scope } = useAuth()
  const location = useLocation()
  const orgId = user?.organizationId
  const role = user?.role
  // Branch-limited roles (ADMIN, USER) work inside their single branch.
  const branchId = scope && !scope.allBranches && scope.branchIds.length === 1 ? scope.branchIds[0] : user?.branchId
  const isOrgWide = role === 'SUPER_ADMIN' || role === 'ORG_ADMIN'

  const groups = useMemo((): NavGroup[] => {
    const org = orgId ? `/organizations/${orgId}` : ''
    const branch = orgId && branchId ? `${org}/branches/${branchId}` : ''

    const people: NavItem[] = []
    if (isOrgWide && orgId) {
      people.push({ to: `${org}/students`, label: 'Students', icon: '\u{1F393}', feature: 'students' })
    } else if (branch) {
      people.push({ to: `${branch}/students`, label: 'Students', icon: '\u{1F393}', feature: 'students' })
    }
    if (orgId) {
      people.push({ to: `${org}/faculty`, label: 'Faculty', icon: '\u{1F9D1}‍\u{1F3EB}', feature: 'faculty' })
    }
    if (role === 'ORG_ADMIN' && orgId) {
      people.push({ to: `${org}/users`, label: 'Users', icon: '\u{1F465}', feature: 'users' })
    }

    const academics: NavItem[] = []
    if (branch) {
      academics.push(
        { to: `${branch}/classes`, label: 'Classes', icon: '\u{1F3EB}', feature: 'classes' },
        { to: `${branch}/examinations`, label: 'Examinations', icon: '\u{1F4DD}', feature: 'examinations' },
      )
    }
    if (role === 'ORG_ADMIN' && orgId) {
      academics.push({ to: `${org}/branches`, label: 'Branches & classes', icon: '\u{1F3EB}', feature: 'branches' })
    }

    const reports: NavItem[] = [
      {
        to: role === 'SUPER_ADMIN' || !orgId ? '/reports' : `${org}/reports`,
        label: 'Reports',
        icon: '\u{1F4CA}',
        feature: 'reports',
      },
    ]

    const admin: NavItem[] = [
      { to: '/organizations', label: 'Organizations', icon: '\u{1F3E2}', feature: 'organizations' },
    ]
    if (role === 'ORG_ADMIN' && orgId) {
      admin.push(
        { to: `${org}/settings`, label: 'Settings', icon: '⚙️', feature: 'settings' },
        { to: `${org}/audit-logs`, label: 'Audit log', icon: '\u{1F50D}', feature: 'orgAudit' },
      )
    }
    admin.push({ to: '/audit-logs', label: 'Audit logs', icon: '\u{1F50D}', feature: 'auditLogs' })

    return [
      { items: [{ to: '/', label: 'Dashboard', icon: '\u{1F3E0}' }] },
      { heading: 'People', items: people },
      { heading: 'Academics', items: academics },
      { heading: 'Reports', items: reports },
      { heading: 'Admin', items: admin },
    ]
  }, [role, orgId, branchId, isOrgWide])

  const visibleGroups = useMemo(
    () =>
      groups
        .map((g) => ({
          ...g,
          items: g.items.filter((item) => !item.feature || hasRole(role, viewRoles(item.feature))),
        }))
        .filter((g) => g.items.length > 0),
    [groups, role],
  )

  // Close the drawer on navigation (mobile only).
  useEffect(() => {
    if (window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches) {
      onClose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  return (
    <>
      <div
        className={`sidebar-overlay d-lg-none ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <nav className={`app-sidebar ${isOpen ? 'open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-nav">
          {visibleGroups.map((group, i) => (
            <div key={group.heading ?? i} className="sidebar-group">
              {group.heading && <div className="sidebar-group-heading">{group.heading}</div>}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  className="sidebar-link"
                  to={item.to}
                  end={item.to === '/'}
                >
                  <span className="sidebar-link-icon" aria-hidden="true">{item.icon}</span>
                  <span className="sidebar-link-text">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      </nav>
    </>
  )
}

export default Sidebar
