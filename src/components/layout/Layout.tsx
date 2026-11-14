import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header.tsx'
import Sidebar from './Sidebar.tsx'
import Footer from './Footer.tsx'
import './Layout.css'

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const toggleSidebar = () => setSidebarOpen((prev) => !prev)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Header isSidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="app-content">
        <main id="main-content" tabIndex={-1} className="container-fluid p-4">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}

export default Layout
