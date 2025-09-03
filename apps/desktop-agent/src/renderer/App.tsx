import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ScreenshotsPage } from './pages/ScreenshotsPage'
import { ActivityPage } from './pages/ActivityPage'
import { AttendancePage } from './pages/AttendancePage'
import { SettingsPage } from './pages/SettingsPage'
import { StatisticsPage } from './pages/StatisticsPage'
import { LoadingScreen } from './components/LoadingScreen'
import { useAuth } from './contexts/AuthContext'
import { useSettings } from './contexts/SettingsContext'
import { useNotification } from './contexts/NotificationContext'

export const App: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading, initialize } = useAuth()
  const { settings, loading: settingsLoading } = useSettings()
  const { showNotification } = useNotification()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing Nova HR Desktop Agent...')
        
        // Initialize authentication
        await initialize()
        
        // Wait a bit for all services to initialize
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setIsInitialized(true)
        console.log('App initialized successfully')
        
        if (isAuthenticated) {
          showNotification('Welcome Back', `Hello ${user?.name || 'User'}!`)
        }
      } catch (error) {
        console.error('Failed to initialize app:', error)
        showNotification('Initialization Error', 'Failed to initialize the application')
      }
    }

    initializeApp()
  }, [initialize, isAuthenticated, user?.name, showNotification])

  // Handle IPC events from main process
  useEffect(() => {
    const handleNavigate = (path: string) => {
      console.log('Navigate to:', path)
      // This would be handled by React Router
    }

    const handleTakeScreenshot = () => {
      window.electronAPI.screenshot.take().then(() => {
        showNotification('Screenshot Taken', 'Screenshot captured successfully')
      }).catch((error) => {
        showNotification('Screenshot Failed', `Failed to capture screenshot: ${error.message}`)
      })
    }

    const handleToggleAttendance = () => {
      // Handle attendance toggle
      console.log('Toggle attendance requested')
    }

    const handleShowAbout = () => {
      showNotification('About Nova HR', 'Desktop Agent v1.0.0 - Employee productivity monitoring solution')
    }

    const handleNotification = ({ title, body }: { title: string; body: string }) => {
      showNotification(title, body)
    }

    // Register event listeners
    window.electronAPI?.on('navigate-to', handleNavigate)
    window.electronAPI?.on('tray:take-screenshot', handleTakeScreenshot)
    window.electronAPI?.on('tray:toggle-attendance', handleToggleAttendance)
    window.electronAPI?.on('tray:show-about', handleShowAbout)
    window.electronAPI?.on('notification:show', handleNotification)

    return () => {
      // Cleanup event listeners
      window.electronAPI?.off('navigate-to', handleNavigate)
      window.electronAPI?.off('tray:take-screenshot', handleTakeScreenshot)
      window.electronAPI?.off('tray:toggle-attendance', handleToggleAttendance)
      window.electronAPI?.off('tray:show-about', handleShowAbout)
      window.electronAPI?.off('notification:show', handleNotification)
    }
  }, [showNotification])

  // Handle tray events
  useEffect(() => {
    const handleTrayToggleMonitoring = async (enabled: boolean) => {
      try {
        if (enabled) {
          await window.electronAPI.activity.start()
          showNotification('Monitoring Started', 'Activity monitoring is now active')
        } else {
          window.electronAPI.activity.stop()
          showNotification('Monitoring Stopped', 'Activity monitoring has been stopped')
        }
      } catch (error) {
        showNotification('Error', `Failed to toggle monitoring: ${error.message}`)
      }
    }

    const handleTrayToggleScreenshots = (enabled: boolean) => {
      console.log('Screenshot capture toggled:', enabled)
      // Update settings
    }

    const handleTrayToggleActivity = (enabled: boolean) => {
      console.log('Activity tracking toggled:', enabled)
      // Update settings
    }

    window.electronAPI?.on('tray:toggle-monitoring', handleTrayToggleMonitoring)
    window.electronAPI?.on('tray:toggle-screenshots', handleTrayToggleScreenshots)
    window.electronAPI?.on('tray:toggle-activity', handleTrayToggleActivity)

    return () => {
      window.electronAPI?.off('tray:toggle-monitoring', handleTrayToggleMonitoring)
      window.electronAPI?.off('tray:toggle-screenshots', handleTrayToggleScreenshots)
      window.electronAPI?.off('tray:toggle-activity', handleTrayToggleActivity)
    }
  }, [showNotification])

  // Show loading screen while initializing
  if (!isInitialized || authLoading || settingsLoading) {
    return <LoadingScreen />
  }

  // Protected route component
  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }
    return <>{children}</>
  }

  // Public route component (redirect if authenticated)
  const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (isAuthenticated) {
      return <Navigate to="/dashboard" replace />
    }
    return <>{children}</>
  }

  return (
    <div className="app">
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="screenshots" element={<ScreenshotsPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

// App metadata for debugging
if (process.env.NODE_ENV === 'development') {
  ;(window as any).__APP_INFO = {
    name: 'Nova HR Desktop Agent',
    version: '1.0.0',
    platform: window.process?.platform,
    arch: window.process?.arch,
    nodeVersion: window.process?.versions?.node,
    electronVersion: window.process?.versions?.electron,
    buildDate: new Date().toISOString()
  }
}