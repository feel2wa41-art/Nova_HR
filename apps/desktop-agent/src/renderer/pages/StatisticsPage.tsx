import React, { useState, useEffect } from 'react'
import { useNotification } from '../contexts/NotificationContext'

interface StatisticsData {
  productivity: {
    score: number
    trend: 'up' | 'down' | 'stable'
    weeklyData: number[]
  }
  activity: {
    totalTime: number
    productiveTime: number
    idleTime: number
    appCount: number
    topApps: Array<{
      name: string
      time: number
      category: string
      productive: boolean
    }>
  }
  screenshots: {
    totalCount: number
    uploadedCount: number
    failedCount: number
    avgSize: number
    dailyCounts: number[]
  }
  attendance: {
    workingDays: number
    totalHours: number
    avgHours: number
    lateCount: number
    attendanceRate: number
    punctualityRate: number
  }
}

export const StatisticsPage: React.FC = () => {
  const { showNotification } = useNotification()
  const [stats, setStats] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('week')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'productivity' | 'activity' | 'attendance'>('all')

  useEffect(() => {
    loadStatistics()
  }, [selectedPeriod])

  const loadStatistics = async () => {
    try {
      setLoading(true)
      
      const result = await window.electronAPI.api.get(`/statistics?period=${selectedPeriod}`)
      if (result.success && result.data) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Failed to load statistics:', error)
      showNotification('Error', 'Failed to load statistics', 'error')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async () => {
    try {
      const result = await window.electronAPI.statistics.exportReport(selectedPeriod)
      if (result.success) {
        showNotification('Export Successful', `Report exported to: ${result.filePath}`, 'success')
      } else {
        showNotification('Export Failed', result.error || 'Failed to export report', 'error')
      }
    } catch (error: any) {
      showNotification('Export Error', error.message, 'error')
    }
  }

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getProductivityColor = (score: number) => {
    if (score >= 80) return '#27ae60'
    if (score >= 60) return '#f39c12'
    return '#e74c3c'
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '📈'
      case 'down': return '📉'
      default: return '➡️'
    }
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title">Statistics</div>
          <div className="page-subtitle">Performance insights and analytics</div>
        </div>
        <div className="page-content">
          <div className="loading">
            <div className="spinner" />
            <span>Loading statistics...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title">Statistics</div>
          <div className="page-subtitle">Performance insights and analytics</div>
        </div>
        <div className="page-content">
          <div className="text-center text-muted" style={{ padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <div>No statistics available</div>
            <div style={{ fontSize: '14px', marginTop: '8px' }}>
              Statistics will be generated once you start using the application
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Statistics</div>
        <div className="page-subtitle">Performance insights and analytics</div>
      </div>

      <div className="page-content">
        {/* Controls */}
        <div className="card">
          <div className="card-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div>
                  <label className="form-label" style={{ marginBottom: '4px' }}>Time Period</label>
                  <select
                    className="form-input"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as any)}
                    style={{ minWidth: '120px' }}
                  >
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                  </select>
                </div>
                
                <div>
                  <label className="form-label" style={{ marginBottom: '4px' }}>Category</label>
                  <select
                    className="form-input"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as any)}
                    style={{ minWidth: '120px' }}
                  >
                    <option value="all">All Categories</option>
                    <option value="productivity">Productivity</option>
                    <option value="activity">Activity</option>
                    <option value="attendance">Attendance</option>
                  </select>
                </div>
              </div>
              
              <button
                className="btn btn-outline"
                onClick={exportReport}
              >
                📊 Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Productivity Overview */}
        {(selectedCategory === 'all' || selectedCategory === 'productivity') && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                📈 Productivity Overview
                <span style={{ marginLeft: '8px', fontSize: '16px' }}>
                  {getTrendIcon(stats.productivity.trend)}
                </span>
              </div>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-3">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: getProductivityColor(stats.productivity.score) }}>
                    {stats.productivity.score.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>Productivity Score</div>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
                    {formatDuration(stats.activity.productiveTime)}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>Productive Time</div>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
                    {stats.activity.appCount}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>Apps Used</div>
                </div>
              </div>
              
              {/* Weekly productivity chart placeholder */}
              <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '12px' }}>Weekly Productivity Trend</div>
                <div style={{ display: 'flex', alignItems: 'end', gap: '4px', height: '60px' }}>
                  {stats.productivity.weeklyData.map((value, index) => (
                    <div
                      key={index}
                      style={{
                        flex: 1,
                        backgroundColor: getProductivityColor(value),
                        height: `${(value / 100) * 60}px`,
                        borderRadius: '2px',
                        minHeight: '4px'
                      }}
                      title={`Day ${index + 1}: ${value.toFixed(0)}%`}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Details */}
        {(selectedCategory === 'all' || selectedCategory === 'activity') && (
          <>
            <div className="grid grid-cols-2">
              <div className="card">
                <div className="card-header">
                  <div className="card-title">⏰ Time Distribution</div>
                </div>
                <div className="card-content">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Total Active Time</span>
                      <span style={{ fontWeight: 600 }}>{formatDuration(stats.activity.totalTime)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Productive Time</span>
                      <span style={{ fontWeight: 600, color: '#27ae60' }}>
                        {formatDuration(stats.activity.productiveTime)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Idle Time</span>
                      <span style={{ fontWeight: 600, color: '#e74c3c' }}>
                        {formatDuration(stats.activity.idleTime)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Productivity Ratio</span>
                      <span style={{ fontWeight: 600, color: getProductivityColor(stats.productivity.score) }}>
                        {((stats.activity.productiveTime / stats.activity.totalTime) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-title">📸 Screenshot Statistics</div>
                </div>
                <div className="card-content">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Total Screenshots</span>
                      <span style={{ fontWeight: 600 }}>{stats.screenshots.totalCount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Successfully Uploaded</span>
                      <span style={{ fontWeight: 600, color: '#27ae60' }}>
                        {stats.screenshots.uploadedCount}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Failed Uploads</span>
                      <span style={{ fontWeight: 600, color: '#e74c3c' }}>
                        {stats.screenshots.failedCount}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Average Size</span>
                      <span style={{ fontWeight: 600 }}>
                        {formatFileSize(stats.screenshots.avgSize)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Applications */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">🏆 Top Applications</div>
              </div>
              <div className="card-content">
                {stats.activity.topApps.length === 0 ? (
                  <div className="text-center text-muted" style={{ padding: '20px' }}>
                    No application data available
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stats.activity.topApps.map((app, index) => (
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
                          fontSize: '20px',
                          marginRight: '12px',
                          width: '30px',
                          textAlign: 'center'
                        }}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 500 }}>{app.name}</span>
                            <span className={`status ${app.productive ? 'status-success' : 'status-warning'}`}>
                              {app.category}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            {app.productive ? 'Productive' : 'Unproductive'} • {formatDuration(app.time)}
                          </div>
                        </div>
                        
                        <div style={{ 
                          width: '60px', 
                          height: '6px', 
                          backgroundColor: '#e9ecef', 
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${Math.min(100, (app.time / stats.activity.totalTime) * 100)}%`,
                            height: '100%',
                            backgroundColor: app.productive ? '#27ae60' : '#f39c12'
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Attendance Summary */}
        {(selectedCategory === 'all' || selectedCategory === 'attendance') && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">👥 Attendance Summary</div>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-3">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3498db' }}>
                    {stats.attendance.workingDays}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>Working Days</div>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#27ae60' }}>
                    {stats.attendance.attendanceRate.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>Attendance Rate</div>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f39c12' }}>
                    {stats.attendance.punctualityRate.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>Punctuality Rate</div>
                </div>
              </div>
              
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-around' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>
                    {formatDuration(stats.attendance.totalHours * 1000 * 60 * 60)}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>Total Hours</div>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>
                    {formatDuration(stats.attendance.avgHours * 1000 * 60 * 60)}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>Avg. Daily Hours</div>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#e74c3c' }}>
                    {stats.attendance.lateCount}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>Late Days</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}