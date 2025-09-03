import React, { useState, useEffect } from 'react'
import { useNotification } from '../contexts/NotificationContext'
import { useSettings } from '../contexts/SettingsContext'

interface Screenshot {
  id: string
  filename: string
  path: string
  timestamp: Date
  size: number
  uploaded: boolean
  metadata?: {
    activeWindow?: string
    resolution?: string
    quality?: number
  }
}

export const ScreenshotsPage: React.FC = () => {
  const { showNotification } = useNotification()
  const { settings, updateSetting } = useSettings()
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    uploaded: 0,
    totalSize: 0
  })

  useEffect(() => {
    loadScreenshots()
    loadStats()
  }, [])

  const loadScreenshots = async () => {
    try {
      setLoading(true)
      const result = await window.electronAPI.screenshot.getHistory()
      if (result.success && result.data) {
        setScreenshots(result.data.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })))
      }
    } catch (error) {
      console.error('Failed to load screenshots:', error)
      showNotification('Error', 'Failed to load screenshot history', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const result = await window.electronAPI.screenshot.getStats()
      if (result) {
        setStats(result)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleTakeScreenshot = async () => {
    try {
      setIsCapturing(true)
      const result = await window.electronAPI.screenshot.take()
      
      if (result.success) {
        showNotification('Screenshot Taken', 'Screenshot captured successfully', 'success')
        loadScreenshots()
        loadStats()
      } else {
        showNotification('Screenshot Failed', result.error || 'Unknown error', 'error')
      }
    } catch (error: any) {
      showNotification('Screenshot Error', error.message, 'error')
    } finally {
      setIsCapturing(false)
    }
  }

  const handleDeleteScreenshot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this screenshot?')) {
      return
    }

    try {
      const result = await window.electronAPI.screenshot.delete(id)
      if (result.success) {
        showNotification('Screenshot Deleted', 'Screenshot deleted successfully', 'success')
        loadScreenshots()
        loadStats()
        if (selectedScreenshot?.id === id) {
          setSelectedScreenshot(null)
        }
      } else {
        showNotification('Delete Failed', result.error || 'Failed to delete screenshot', 'error')
      }
    } catch (error: any) {
      showNotification('Delete Error', error.message, 'error')
    }
  }

  const handleViewScreenshot = async (screenshot: Screenshot) => {
    try {
      const result = await window.electronAPI.screenshot.open(screenshot.path)
      if (!result.success) {
        showNotification('View Failed', 'Failed to open screenshot', 'error')
      }
    } catch (error: any) {
      showNotification('View Error', error.message, 'error')
    }
  }

  const handleRetryUpload = async (id: string) => {
    try {
      const result = await window.electronAPI.screenshot.retryUpload(id)
      if (result.success) {
        showNotification('Upload Successful', 'Screenshot uploaded successfully', 'success')
        loadScreenshots()
        loadStats()
      } else {
        showNotification('Upload Failed', result.error || 'Upload failed', 'error')
      }
    } catch (error: any) {
      showNotification('Upload Error', error.message, 'error')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return date.toLocaleString()
  }

  const handleIntervalChange = async (newInterval: number) => {
    try {
      await updateSetting('screenshotInterval', newInterval * 60 * 1000) // Convert minutes to ms
      showNotification('Settings Updated', 'Screenshot interval updated successfully', 'success')
    } catch (error: any) {
      showNotification('Settings Error', error.message, 'error')
    }
  }

  const handleQualityChange = async (newQuality: number) => {
    try {
      await updateSetting('uploadQuality', newQuality)
      showNotification('Settings Updated', 'Upload quality updated successfully', 'success')
    } catch (error: any) {
      showNotification('Settings Error', error.message, 'error')
    }
  }

  const toggleScreenshotCapture = async () => {
    try {
      await updateSetting('screenshotEnabled', !settings.screenshotEnabled)
      const message = settings.screenshotEnabled ? 'Screenshot capture disabled' : 'Screenshot capture enabled'
      showNotification('Settings Updated', message, 'success')
    } catch (error: any) {
      showNotification('Settings Error', error.message, 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Screenshots</div>
        <div className="page-subtitle">Manage and view captured screenshots</div>
      </div>

      <div className="page-content">
        {/* Controls and Stats */}
        <div className="grid grid-cols-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Quick Actions</div>
            </div>
            <div className="card-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleTakeScreenshot}
                  disabled={isCapturing}
                >
                  {isCapturing ? '📸 Capturing...' : '📸 Take Screenshot Now'}
                </button>
                
                <div className="form-checkbox">
                  <input
                    type="checkbox"
                    id="screenshotEnabled"
                    checked={settings.screenshotEnabled}
                    onChange={toggleScreenshotCapture}
                  />
                  <label htmlFor="screenshotEnabled">
                    Enable automatic screenshot capture
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Statistics</div>
            </div>
            <div className="card-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Screenshots</span>
                  <span style={{ fontWeight: 600 }}>{stats.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Today</span>
                  <span style={{ fontWeight: 600 }}>{stats.today}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Uploaded</span>
                  <span style={{ fontWeight: 600 }}>{stats.uploaded}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Size</span>
                  <span style={{ fontWeight: 600 }}>{formatFileSize(stats.totalSize)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Screenshot Settings</div>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-2">
              <div className="form-group">
                <label className="form-label">Capture Interval (minutes)</label>
                <select
                  className="form-input"
                  value={Math.floor(settings.screenshotInterval / 60000)}
                  onChange={(e) => handleIntervalChange(Number(e.target.value))}
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
                <label className="form-label">Upload Quality (%)</label>
                <select
                  className="form-input"
                  value={settings.uploadQuality}
                  onChange={(e) => handleQualityChange(Number(e.target.value))}
                >
                  <option value={50}>50% (Smaller files)</option>
                  <option value={70}>70% (Balanced)</option>
                  <option value={80}>80% (Good quality)</option>
                  <option value={90}>90% (High quality)</option>
                  <option value={100}>100% (Best quality)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Screenshot List */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Screenshots</div>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading">
                <div className="spinner" />
                <span>Loading screenshots...</span>
              </div>
            ) : screenshots.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
                <div>No screenshots found</div>
                <div style={{ fontSize: '14px', marginTop: '8px' }}>
                  Take your first screenshot using the button above
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                {screenshots.map((screenshot) => (
                  <div
                    key={screenshot.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      border: '1px solid #e9ecef',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedScreenshot(screenshot)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                        {screenshot.filename}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        {formatDate(screenshot.timestamp)} • {formatFileSize(screenshot.size)}
                        {screenshot.metadata?.activeWindow && (
                          <span> • {screenshot.metadata.activeWindow}</span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`status ${screenshot.uploaded ? 'status-success' : 'status-warning'}`}>
                        {screenshot.uploaded ? 'Uploaded' : 'Pending'}
                      </span>
                      
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewScreenshot(screenshot)
                        }}
                      >
                        View
                      </button>
                      
                      {!screenshot.uploaded && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRetryUpload(screenshot.id)
                          }}
                        >
                          Upload
                        </button>
                      )}
                      
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteScreenshot(screenshot.id)
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Screenshot Details */}
        {selectedScreenshot && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Screenshot Details</div>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-2">
                <div>
                  <strong>Filename:</strong> {selectedScreenshot.filename}
                </div>
                <div>
                  <strong>Size:</strong> {formatFileSize(selectedScreenshot.size)}
                </div>
                <div>
                  <strong>Timestamp:</strong> {formatDate(selectedScreenshot.timestamp)}
                </div>
                <div>
                  <strong>Status:</strong> 
                  <span className={`status ${selectedScreenshot.uploaded ? 'status-success' : 'status-warning'}`} style={{ marginLeft: '8px' }}>
                    {selectedScreenshot.uploaded ? 'Uploaded' : 'Pending Upload'}
                  </span>
                </div>
                {selectedScreenshot.metadata?.activeWindow && (
                  <div>
                    <strong>Active Window:</strong> {selectedScreenshot.metadata.activeWindow}
                  </div>
                )}
                {selectedScreenshot.metadata?.resolution && (
                  <div>
                    <strong>Resolution:</strong> {selectedScreenshot.metadata.resolution}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}