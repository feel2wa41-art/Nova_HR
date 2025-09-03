import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { useNotification } from '../contexts/NotificationContext'

interface SystemStatus {
  screenshotService: boolean
  activityMonitoring: boolean
  apiConnection: boolean
  lastScreenshot?: Date
  lastActivity?: Date
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const { settings } = useSettings()
  const { showNotification } = useNotification()
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    screenshotService: false,
    activityMonitoring: false,
    apiConnection: false
  })
  const [stats, setStats] = useState({
    screenshotsToday: 0,
    workingHours: '0h 0m',
    activeApps: 0,
    idleTime: 0
  })

  useEffect(() => {
    loadSystemStatus()
    loadStats()

    // Refresh status every 30 seconds
    const interval = setInterval(() => {
      loadSystemStatus()
      loadStats()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const loadSystemStatus = async () => {
    try {
      // Check service status
      const screenshotStatus = await window.electronAPI.screenshot.getStatus()
      const activityStatus = await window.electronAPI.activity.getStatus()
      const apiStatus = await window.electronAPI.api.ping()

      setSystemStatus({
        screenshotService: screenshotStatus.active,
        activityMonitoring: activityStatus.active,
        apiConnection: apiStatus.success,
        lastScreenshot: screenshotStatus.lastCapture ? new Date(screenshotStatus.lastCapture) : undefined,
        lastActivity: activityStatus.lastUpdate ? new Date(activityStatus.lastUpdate) : undefined
      })
    } catch (error) {
      console.error('Failed to load system status:', error)
    }
  }

  const loadStats = async () => {
    try {
      const screenshotStats = await window.electronAPI.screenshot.getStats()
      const activityStats = await window.electronAPI.activity.getStats()

      setStats({
        screenshotsToday: screenshotStats.todayCount || 0,
        workingHours: formatDuration(activityStats.workingTimeMs || 0),
        activeApps: activityStats.appCount || 0,
        idleTime: activityStats.idleTimeMs || 0
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const handleTakeScreenshot = async () => {
    try {
      await window.electronAPI.screenshot.take()
      showNotification('Screenshot Taken', 'Screenshot captured successfully', 'success')
      loadStats() // Refresh stats
    } catch (error: any) {
      showNotification('Screenshot Failed', error.message, 'error')
    }
  }

  const toggleActivityMonitoring = async () => {
    try {
      if (systemStatus.activityMonitoring) {
        await window.electronAPI.activity.stop()
        showNotification('Monitoring Stopped', 'Activity monitoring has been stopped', 'warning')
      } else {
        await window.electronAPI.activity.start()
        showNotification('Monitoring Started', 'Activity monitoring is now active', 'success')
      }
      loadSystemStatus()
    } catch (error: any) {
      showNotification('Error', `Failed to toggle monitoring: ${error.message}`, 'error')
    }
  }

  const formatTime = (date?: Date) => {
    if (!date) return 'Never'
    return date.toLocaleTimeString()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">Welcome back, {user?.name}</div>
      </div>

      <div className="page-content">
        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Quick Actions</div>
          </div>
          <div className="card-content">
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={handleTakeScreenshot}
              >
                📸 Take Screenshot
              </button>
              <button
                className={`btn ${systemStatus.activityMonitoring ? 'btn-warning' : 'btn-success'}`}
                onClick={toggleActivityMonitoring}
              >
                {systemStatus.activityMonitoring ? '⏹️ Stop Monitoring' : '▶️ Start Monitoring'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => window.electronAPI.app.openSettings()}
              >
                ⚙️ Settings
              </button>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="grid grid-cols-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title">System Status</div>
            </div>
            <div className="card-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Screenshot Service</span>
                  <span className={`status ${systemStatus.screenshotService ? 'status-success' : 'status-danger'}`}>
                    {systemStatus.screenshotService ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Activity Monitoring</span>
                  <span className={`status ${systemStatus.activityMonitoring ? 'status-success' : 'status-danger'}`}>
                    {systemStatus.activityMonitoring ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>API Connection</span>
                  <span className={`status ${systemStatus.apiConnection ? 'status-success' : 'status-danger'}`}>
                    {systemStatus.apiConnection ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Today's Statistics</div>
            </div>
            <div className="card-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Screenshots Taken</span>
                  <span style={{ fontWeight: 600 }}>{stats.screenshotsToday}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Working Hours</span>
                  <span style={{ fontWeight: 600 }}>{stats.workingHours}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Active Applications</span>
                  <span style={{ fontWeight: 600 }}>{stats.activeApps}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Idle Time</span>
                  <span style={{ fontWeight: 600 }}>{formatDuration(stats.idleTime)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Activity</div>
          </div>
          <div className="card-content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e9ecef' }}>
                <span>Last Screenshot</span>
                <span className="text-muted">{formatTime(systemStatus.lastScreenshot)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e9ecef' }}>
                <span>Last Activity Update</span>
                <span className="text-muted">{formatTime(systemStatus.lastActivity)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span>Screenshot Interval</span>
                <span className="text-muted">{Math.floor(settings.screenshotInterval / 1000 / 60)} minutes</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Information */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">User Information</div>
          </div>
          <div className="card-content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Name</span>
                <span style={{ fontWeight: 500 }}>{user?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Email</span>
                <span style={{ fontWeight: 500 }}>{user?.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Role</span>
                <span style={{ fontWeight: 500 }}>{user?.role}</span>
              </div>
              {user?.company && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Company</span>
                  <span style={{ fontWeight: 500 }}>{user.company.name}</span>
                </div>
              )}
              {user?.employee_profile?.department && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Department</span>
                  <span style={{ fontWeight: 500 }}>{user.employee_profile.department}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}