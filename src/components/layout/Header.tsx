import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.ts'
import './Header.css'

interface HeaderProps {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
}

function Header({ isSidebarOpen, onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const initials = user
    ? user.fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="sidebar-toggle"
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          aria-expanded={isSidebarOpen}
        >
          <div className={`hamburger ${isSidebarOpen ? 'active' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
        <Link className="header-brand" to="/">
          <span className="brand-icon">A</span>
          <span className="brand-text">ARK</span>
        </Link>
      </div>
      <div className="header-right">
        {user && (
          <>
            <span className="header-user-name">{user.fullName}</span>
            <span className="header-user-role">{user.role.replace(/_/g, ' ')}</span>
          </>
        )}
        <div className="profile-avatar" title={user?.fullName}>{initials}</div>
        <button
          className="btn btn-sm btn-outline-light header-logout"
          onClick={handleLogout}
          title="Sign out"
        >
          Logout
        </button>
      </div>
    </header>
  )
}

export default Header
