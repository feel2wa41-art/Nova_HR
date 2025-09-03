import React, { useState, useEffect } from 'react'
import { useNotification } from '../contexts/NotificationContext'
import { useSettings } from '../contexts/SettingsContext'

interface ActivityEntry {
  id: string
  timestamp: Date
  application: string
  windowTitle: string
  duration: number
  category: string
  productive: boolean
}

interface AppUsage {
  name: string
  totalTime: number
  sessions: number
  productive: boolean
  category: string
}

export const ActivityPage: React.FC = () => {
  const { showNotification } = useNotification()
  const { settings, updateSetting } = useSettings()
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [appUsage, setAppUsage] = useState<AppUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [stats, setStats] = useState({
    totalActiveTime: 0,
    productiveTime: 0,
    idleTime: 0,
    applicationCount: 0,
    productivityScore: 0
  })
  const [isMonitoring, setIsMonitoring] = useState(false)

  useEffect(() => {
    loadActivityData()
    checkMonitoringStatus()
  }, [selectedDate])

  const loadActivityData = async () => {
    try {
      setLoading(true)
      
      // Load activities for selected date
      const activitiesResult = await window.electronAPI.activity.getHistory(selectedDate)
      if (activitiesResult.success && activitiesResult.data) {
        setActivities(activitiesResult.data.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })))
      }

      // Load app usage summary
      const usageResult = await window.electronAPI.activity.getAppUsage(selectedDate)
      if (usageResult.success && usageResult.data) {
        setAppUsage(usageResult.data)
      }

      // Load stats
      const statsResult = await window.electronAPI.activity.getStats(selectedDate)
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data)
      }
    } catch (error) {
      console.error('Failed to load activity data:', error)
      showNotification('Error', 'Failed to load activity data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const checkMonitoringStatus = async () => {
    try {
      const status = await window.electronAPI.activity.getStatus()
      setIsMonitoring(status.active || false)
    } catch (error) {
      console.error('Failed to check monitoring status:', error)
    }
  }

  const toggleMonitoring = async () => {
    try {
      if (isMonitoring) {
        await window.electronAPI.activity.stop()
        showNotification('Monitoring Stopped', 'Activity monitoring has been stopped', 'warning')
      } else {
        await window.electronAPI.activity.start()
        showNotification('Monitoring Started', 'Activity monitoring is now active', 'success')
      }
      checkMonitoringStatus()
    } catch (error: any) {
      showNotification('Error', `Failed to toggle monitoring: ${error.message}`, 'error')
    }
  }

  const toggleActivityTracking = async () => {
    try {
      await updateSetting('activityTracking', !settings.activityTracking)
      const message = settings.activityTracking ? 'Activity tracking disabled' : 'Activity tracking enabled'
      showNotification('Settings Updated', message, 'success')
    } catch (error: any) {
      showNotification('Settings Error', error.message, 'error')
    }
  }

  const handleIdleThresholdChange = async (newThreshold: number) => {
    try {
      await updateSetting('idleThreshold', newThreshold * 60 * 1000) // Convert minutes to ms
      showNotification('Settings Updated', 'Idle threshold updated successfully', 'success')
    } catch (error: any) {
      showNotification('Settings Error', error.message, 'error')
    }
  }

  const clearActivityData = async () => {
    if (!confirm('Are you sure you want to clear all activity data for this date? This cannot be undone.')) {
      return
    }

    try {
      const result = await window.electronAPI.activity.clearData(selectedDate)
      if (result.success) {
        showNotification('Data Cleared', 'Activity data cleared successfully', 'success')
        loadActivityData()
      } else {
        showNotification('Clear Failed', result.error || 'Failed to clear data', 'error')
      }
    } catch (error: any) {
      showNotification('Clear Error', error.message, 'error')
    }
  }

  const exportActivityData = async () => {
    try {
      const result = await window.electronAPI.activity.exportData(selectedDate)
      if (result.success) {
        showNotification('Export Successful', `Data exported to: ${result.filePath}`, 'success')
      } else {
        showNotification('Export Failed', result.error || 'Failed to export data', 'error')
      }
    } catch (error: any) {
      showNotification('Export Error', error.message, 'error')
    }
  }

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString()
  }

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Development': '#3498db',
      'Communication': '#27ae60',
      'Browser': '#f39c12',
      'Entertainment': '#e74c3c',
      'System': '#9b59b6',
      'Office': '#34495e',
      'Other': '#95a5a6'
    }
    return colors[category] || colors['Other']
  }

  const getProductivityColor = (score: number) => {
    if (score >= 80) return '#27ae60'
    if (score >= 60) return '#f39c12'
    return '#e74c3c'
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Activity Monitoring</div>
        <div className="page-subtitle">Track application usage and productivity</div>
      </div>

      <div className="page-content">
        {/* Controls */}
        <div className="grid grid-cols-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Monitoring Controls</div>
            </div>
            <div className="card-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  className={`btn ${isMonitoring ? 'btn-warning' : 'btn-success'}`}
                  onClick={toggleMonitoring}
                >
                  {isMonitoring ? '⏹️ Stop Monitoring' : '▶️ Start Monitoring'}
                </button>
                
                <div className="form-checkbox">
                  <input
                    type="checkbox"
                    id="activityTracking"
                    checked={settings.activityTracking}
                    onChange={toggleActivityTracking}
                  />
                  <label htmlFor="activityTracking">
                    Enable activity tracking
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">View Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Daily Statistics</div>
            </div>
            <div className="card-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Active Time</span>
                  <span style={{ fontWeight: 600 }}>{formatDuration(stats.totalActiveTime)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Productive Time</span>
                  <span style={{ fontWeight: 600, color: '#27ae60' }}>{formatDuration(stats.productiveTime)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Idle Time</span>
                  <span style={{ fontWeight: 600, color: '#e74c3c' }}>{formatDuration(stats.idleTime)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Applications Used</span>
                  <span style={{ fontWeight: 600 }}>{stats.applicationCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Productivity Score</span>
                  <span style={{ 
                    fontWeight: 600, 
                    color: getProductivityColor(stats.productivityScore) 
                  }}>
                    {stats.productivityScore.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Activity Settings</div>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label className="form-label">Idle Threshold (minutes)</label>
              <select
                className="form-input"
                style={{ maxWidth: '200px' }}
                value={Math.floor(settings.idleThreshold / 60000)}
                onChange={(e) => handleIdleThresholdChange(Number(e.target.value))}
              >
                <option value={1}>1 minute</option>
                <option value={3}>3 minutes</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
              </select>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                Time without activity before marking as idle
              </div>
            </div>
          </div>
        </div>

        {/* Application Usage */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Application Usage</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-sm btn-outline"
                onClick={exportActivityData}
              >
                Export Data
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={clearActivityData}
              >
                Clear Data
              </button>
            </div>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading">
                <div className="spinner" />
                <span>Loading activity data...</span>
              </div>
            ) : appUsage.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                <div>No activity data found</div>
                <div style={{ fontSize: '14px', marginTop: '8px' }}>
                  Start monitoring to see application usage
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {appUsage.map((app, index) => (
                  <div
                    key={app.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      border: '1px solid #e9ecef',
                      borderRadius: '6px'
                    }}
                  >
                    <div style={{ 
                      width: '4px', 
                      height: '40px', 
                      backgroundColor: getCategoryColor(app.category),
                      borderRadius: '2px',
                      marginRight: '12px'
                    }} />
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 500 }}>{app.name}</span>
                        <span className={`status ${app.productive ? 'status-success' : 'status-warning'}`}>
                          {app.productive ? 'Productive' : 'Unproductive'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        {app.category} • {app.sessions} sessions
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatDuration(app.totalTime)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Activity</div>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading">
                <div className="spinner" />
                <span>Loading recent activity...</span>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏰</div>
                <div>No activity recorded</div>
                <div style={{ fontSize: '14px', marginTop: '8px' }}>
                  Activity will appear here when monitoring is active
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' }}>
                {activities.slice(0, 50).map((activity) => (
                  <div
                    key={activity.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      backgroundColor: activity.productive ? '#f8f9fa' : '#fff3cd'
                    }}
                  >
                    <div style={{ 
                      width: '3px', 
                      height: '24px', 
                      backgroundColor: getCategoryColor(activity.category),
                      borderRadius: '2px',
                      marginRight: '8px'
                    }} />
                    
                    <div style={{ fontSize: '12px', color: '#6c757d', minWidth: '60px' }}>
                      {formatTime(activity.timestamp)}
                    </div>
                    
                    <div style={{ flex: 1, marginLeft: '12px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>
                        {activity.application}
                      </div>
                      {activity.windowTitle && (
                        <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                          {activity.windowTitle.length > 50 
                            ? activity.windowTitle.substring(0, 50) + '...' 
                            : activity.windowTitle}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ fontSize: '12px', fontWeight: 500 }}>
                      {formatDuration(activity.duration)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}