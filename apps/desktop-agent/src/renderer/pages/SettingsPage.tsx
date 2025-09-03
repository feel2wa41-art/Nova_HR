import React, { useState } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'

export const SettingsPage: React.FC = () => {
  const { settings, updateSetting, resetSettings, loading } = useSettings()
  const { user, logout } = useAuth()
  const { showNotification } = useNotification()
  const [activeTab, setActiveTab] = useState<'general' | 'monitoring' | 'notifications' | 'about'>('general')
  const [isResetting, setIsResetting] = useState(false)

  const handleSettingChange = async (key: keyof typeof settings, value: any) => {
    try {
      await updateSetting(key, value)
      showNotification('Settings Updated', `${key} updated successfully`, 'success')
    } catch (error: any) {
      showNotification('Settings Error', error.message, 'error')
    }
  }

  const handleResetSettings = async () => {
    if (!confirm('Are you sure you want to reset all settings to default? This cannot be undone.')) {
      return
    }

    try {
      setIsResetting(true)
      await resetSettings()
      showNotification('Settings Reset', 'All settings have been reset to default values', 'success')
    } catch (error: any) {
      showNotification('Reset Error', error.message, 'error')
    } finally {
      setIsResetting(false)
    }
  }

  const handleExportSettings = async () => {
    try {
      const result = await window.electronAPI.settings.export()
      if (result.success) {
        showNotification('Export Successful', `Settings exported to: ${result.filePath}`, 'success')
      } else {
        showNotification('Export Failed', result.error || 'Failed to export settings', 'error')
      }
    } catch (error: any) {
      showNotification('Export Error', error.message, 'error')
    }
  }

  const handleImportSettings = async () => {
    try {
      const result = await window.electronAPI.settings.import()
      if (result.success) {
        showNotification('Import Successful', 'Settings imported successfully', 'success')
        // Reload the page to reflect new settings
        window.location.reload()
      } else if (result.cancelled) {
        // User cancelled, no need to show error
      } else {
        showNotification('Import Failed', result.error || 'Failed to import settings', 'error')
      }
    } catch (error: any) {
      showNotification('Import Error', error.message, 'error')
    }
  }

  const handleOpenLogFolder = async () => {
    try {
      await window.electronAPI.app.openLogFolder()
    } catch (error: any) {
      showNotification('Error', 'Failed to open log folder', 'error')
    }
  }

  const handleOpenDataFolder = async () => {
    try {
      await window.electronAPI.app.openDataFolder()
    } catch (error: any) {
      showNotification('Error', 'Failed to open data folder', 'error')
    }
  }

  const handleCheckForUpdates = async () => {
    try {
      const result = await window.electronAPI.app.checkForUpdates()
      if (result.available) {
        showNotification('Update Available', `Version ${result.version} is available`, 'info')
      } else {
        showNotification('Up to Date', 'You are running the latest version', 'success')
      }
    } catch (error: any) {
      showNotification('Update Check Failed', error.message, 'error')
    }
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60))
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return `${hours}h ${remainingMinutes}m`
    }
    return `${minutes}m`
  }

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'monitoring', label: 'Monitoring', icon: '👁️' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'about', label: 'About', icon: 'ℹ️' }
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Settings</div>
        <div className="page-subtitle">Configure Nova HR Desktop Agent preferences</div>
      </div>

      <div className="page-content">
        <div className="grid grid-cols-4">
          {/* Sidebar */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div className="card-content" style={{ padding: '12px' }}>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                    style={{
                      background: activeTab === tab.id ? 'rgba(52, 152, 219, 0.1)' : 'transparent',
                      border: 'none',
                      borderLeft: activeTab === tab.id ? '3px solid #3498db' : '3px solid transparent',
                      borderRadius: '0',
                      textAlign: 'left',
                      color: activeTab === tab.id ? '#3498db' : '#495057',
                      fontWeight: activeTab === tab.id ? '500' : 'normal'
                    }}
                    onClick={() => setActiveTab(tab.id as any)}
                  >
                    <span className="nav-icon">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div style={{ gridColumn: '2 / -1' }}>
            {activeTab === 'general' && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">General Settings</div>
                </div>
                <div className="card-content">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-group">
                      <label className="form-label">Language</label>
                      <select
                        className="form-input"
                        style={{ maxWidth: '200px' }}
                        value={settings.language}
                        onChange={(e) => handleSettingChange('language', e.target.value)}
                        disabled={loading}
                      >
                        <option value="ko">한국어 (Korean)</option>
                        <option value="en">English</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Theme</label>
                      <select
                        className="form-input"
                        style={{ maxWidth: '200px' }}
                        value={settings.theme}
                        onChange={(e) => handleSettingChange('theme', e.target.value)}
                        disabled={loading}
                      >
                        <option value="system">System Default</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </div>

                    <div className="form-checkbox">
                      <input
                        type="checkbox"
                        id="startMinimized"
                        checked={settings.startMinimized}
                        onChange={(e) => handleSettingChange('startMinimized', e.target.checked)}
                        disabled={loading}
                      />
                      <label htmlFor="startMinimized">
                        Start minimized to system tray
                      </label>
                    </div>

                    <div className="form-checkbox">
                      <input
                        type="checkbox"
                        id="autoStart"
                        checked={settings.autoStart}
                        onChange={(e) => handleSettingChange('autoStart', e.target.checked)}
                        disabled={loading}
                      />
                      <label htmlFor="autoStart">
                        Start automatically with Windows
                      </label>
                    </div>

                    <div className="form-checkbox">
                      <input
                        type="checkbox"
                        id="autoCheckIn"
                        checked={settings.autoCheckIn}
                        onChange={(e) => handleSettingChange('autoCheckIn', e.target.checked)}
                        disabled={loading}
                      />
                      <label htmlFor="autoCheckIn">
                        Auto check-in when application starts
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'monitoring' && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Monitoring Settings</div>
                </div>
                <div className="card-content">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-checkbox">
                      <input
                        type="checkbox"
                        id="screenshotEnabled"
                        checked={settings.screenshotEnabled}
                        onChange={(e) => handleSettingChange('screenshotEnabled', e.target.checked)}
                        disabled={loading}
                      />
                      <label htmlFor="screenshotEnabled">
                        Enable screenshot capture
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Screenshot Interval ({formatDuration(settings.screenshotInterval)})
                      </label>
                      <select
                        className="form-input"
                        style={{ maxWidth: '200px' }}
                        value={Math.floor(settings.screenshotInterval / 60000)}
                        onChange={(e) => handleSettingChange('screenshotInterval', Number(e.target.value) * 60000)}
                        disabled={loading || !settings.screenshotEnabled}
                      >
                        <option value={1}>1 minute</option>
                        <option value={5}>5 minutes</option>
                        <option value={10}>10 minutes</option>
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Upload Quality ({settings.uploadQuality}%)</label>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        step="10"
                        value={settings.uploadQuality}
                        onChange={(e) => handleSettingChange('uploadQuality', Number(e.target.value))}
                        disabled={loading || !settings.screenshotEnabled}
                        style={{ width: '200px' }}
                      />
                      <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                        Higher quality means larger file sizes
                      </div>
                    </div>

                    <div className="form-checkbox">
                      <input
                        type="checkbox"
                        id="activityTracking"
                        checked={settings.activityTracking}
                        onChange={(e) => handleSettingChange('activityTracking', e.target.checked)}
                        disabled={loading}
                      />
                      <label htmlFor="activityTracking">
                        Enable activity tracking
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Idle Threshold ({formatDuration(settings.idleThreshold)})
                      </label>
                      <select
                        className="form-input"
                        style={{ maxWidth: '200px' }}
                        value={Math.floor(settings.idleThreshold / 60000)}
                        onChange={(e) => handleSettingChange('idleThreshold', Number(e.target.value) * 60000)}
                        disabled={loading || !settings.activityTracking}
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
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Notification Settings</div>
                </div>
                <div className="card-content">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-checkbox">
                      <input
                        type="checkbox"
                        id="notificationsEnabled"
                        checked={settings.notificationsEnabled}
                        onChange={(e) => handleSettingChange('notificationsEnabled', e.target.checked)}
                        disabled={loading}
                      />
                      <label htmlFor="notificationsEnabled">
                        Enable desktop notifications
                      </label>
                    </div>

                    <div style={{ marginLeft: '24px' }}>
                      <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '12px' }}>
                        Notification Types:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '14px', color: settings.notificationsEnabled ? '#495057' : '#6c757d' }}>
                          • Screenshot capture status
                        </div>
                        <div style={{ fontSize: '14px', color: settings.notificationsEnabled ? '#495057' : '#6c757d' }}>
                          • Activity monitoring alerts
                        </div>
                        <div style={{ fontSize: '14px', color: settings.notificationsEnabled ? '#495057' : '#6c757d' }}>
                          • Attendance reminders
                        </div>
                        <div style={{ fontSize: '14px', color: settings.notificationsEnabled ? '#495057' : '#6c757d' }}>
                          • System errors and warnings
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <>
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Application Information</div>
                  </div>
                  <div className="card-content">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50' }}>
                          Nova HR Desktop Agent
                        </div>
                        <div style={{ fontSize: '16px', color: '#6c757d' }}>
                          Version 1.0.0
                        </div>
                      </div>

                      <div className="grid grid-cols-2">
                        <div>
                          <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>
                            User Information:
                          </div>
                          <div style={{ fontSize: '14px' }}>
                            <div><strong>Name:</strong> {user?.name}</div>
                            <div><strong>Email:</strong> {user?.email}</div>
                            <div><strong>Role:</strong> {user?.role}</div>
                            {user?.company && (
                              <div><strong>Company:</strong> {user.company.name}</div>
                            )}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>
                            System Information:
                          </div>
                          <div style={{ fontSize: '14px' }}>
                            <div><strong>Platform:</strong> {window.process?.platform || 'Unknown'}</div>
                            <div><strong>Arch:</strong> {window.process?.arch || 'Unknown'}</div>
                            <div><strong>Node:</strong> {window.process?.versions?.node || 'Unknown'}</div>
                            <div><strong>Electron:</strong> {window.process?.versions?.electron || 'Unknown'}</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid #e9ecef', paddingTop: '16px' }}>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-outline"
                            onClick={handleCheckForUpdates}
                          >
                            Check for Updates
                          </button>
                          <button
                            className="btn btn-outline"
                            onClick={handleOpenLogFolder}
                          >
                            Open Log Folder
                          </button>
                          <button
                            className="btn btn-outline"
                            onClick={handleOpenDataFolder}
                          >
                            Open Data Folder
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Settings Management</div>
                  </div>
                  <div className="card-content">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>
                          Export and import your settings to backup or transfer to another device.
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button
                            className="btn btn-outline"
                            onClick={handleExportSettings}
                          >
                            Export Settings
                          </button>
                          <button
                            className="btn btn-outline"
                            onClick={handleImportSettings}
                          >
                            Import Settings
                          </button>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid #e9ecef', paddingTop: '16px' }}>
                        <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>
                          Reset all settings to their default values. This cannot be undone.
                        </div>
                        <button
                          className="btn btn-danger"
                          onClick={handleResetSettings}
                          disabled={isResetting}
                        >
                          {isResetting ? 'Resetting...' : 'Reset All Settings'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}