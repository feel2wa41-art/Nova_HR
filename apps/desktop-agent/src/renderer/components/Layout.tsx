import React from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'

export const Layout: React.FC = () => {
  const { user, logout } = useAuth()
  const { showNotification } = useNotification()
  const location = useLocation()

  const handleLogout = async () => {
    try {
      await logout()
      showNotification('Logged Out', 'You have been logged out successfully')
    } catch (error) {
      showNotification('Logout Error', 'Failed to logout properly', 'error')
    }
  }

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/attendance', label: 'Attendance', icon: '🕐' },
    { path: '/screenshots', label: 'Screenshots', icon: '📸' },
    { path: '/activity', label: 'Activity', icon: '📈' },
    { path: '/statistics', label: 'Statistics', icon: '📋' },
    { path: '/settings', label: 'Settings', icon: '⚙️' }
  ]

  return (
    <div className="layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">Nova HR</div>
          <div className="sidebar-subtitle">Desktop Agent</div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ marginBottom: '12px', fontSize: '14px', opacity: 0.9 }}>
            <div style={{ fontWeight: 600 }}>{user?.name}</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>{user?.email}</div>
            {user?.company && (
              <div style={{ fontSize: '11px', opacity: 0.6 }}>{user.company.name}</div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-outline"
            style={{ 
              width: '100%', 
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.8)',
              borderColor: 'rgba(255, 255, 255, 0.3)'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  )
}