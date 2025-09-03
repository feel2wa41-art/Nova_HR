import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { useSettings } from '../contexts/SettingsContext'

interface AttendanceRecord {
  id: string
  date: string
  check_in_time?: Date
  check_out_time?: Date
  status: 'present' | 'absent' | 'late' | 'early_leave'
  working_hours: number
  location?: string
  notes?: string
  approved: boolean
}

interface AttendanceStatus {
  isCheckedIn: boolean
  todayRecord?: AttendanceRecord
  currentLocation?: {
    latitude: number
    longitude: number
    accuracy: number
  }
  workLocation?: {
    name: string
    address: string
    radius: number
  }
}

export const AttendancePage: React.FC = () => {
  const { user } = useAuth()
  const { showNotification } = useNotification()
  const { settings, updateSetting } = useSettings()
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>({
    isCheckedIn: false
  })
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [processingCheckIn, setProcessingCheckIn] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    loadAttendanceData()
    
    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Refresh attendance status every minute
    const statusInterval = setInterval(() => {
      loadCurrentStatus()
    }, 60000)

    return () => {
      clearInterval(timeInterval)
      clearInterval(statusInterval)
    }
  }, [selectedMonth])

  const loadAttendanceData = async () => {
    try {
      setLoading(true)
      
      // Load current status
      await loadCurrentStatus()
      
      // Load attendance history for selected month
      const historyResult = await window.electronAPI.api.get(`/attendance/history?month=${selectedMonth}`)
      if (historyResult.success && historyResult.data) {
        setAttendanceHistory(historyResult.data.map((record: any) => ({
          ...record,
          check_in_time: record.check_in_time ? new Date(record.check_in_time) : undefined,
          check_out_time: record.check_out_time ? new Date(record.check_out_time) : undefined
        })))
      }
    } catch (error) {
      console.error('Failed to load attendance data:', error)
      showNotification('Error', 'Failed to load attendance data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentStatus = async () => {
    try {
      const statusResult = await window.electronAPI.api.get('/attendance/status')
      if (statusResult.success && statusResult.data) {
        setAttendanceStatus(statusResult.data)
      }
    } catch (error) {
      console.error('Failed to load attendance status:', error)
    }
  }

  const handleCheckIn = async () => {
    try {
      setProcessingCheckIn(true)
      
      // Get current location
      const locationResult = await window.electronAPI.location.getCurrentPosition()
      if (!locationResult.success) {
        showNotification('Location Error', 'Failed to get current location', 'error')
        return
      }

      // Check in with location
      const checkInResult = await window.electronAPI.api.post('/attendance/check-in', {
        location: locationResult.data,
        timestamp: new Date().toISOString()
      })

      if (checkInResult.success) {
        showNotification('Check In Successful', 'You have been checked in successfully', 'success')
        loadAttendanceData()
      } else {
        showNotification('Check In Failed', checkInResult.error || 'Failed to check in', 'error')
      }
    } catch (error: any) {
      showNotification('Check In Error', error.message, 'error')
    } finally {
      setProcessingCheckIn(false)
    }
  }

  const handleCheckOut = async () => {
    try {
      setProcessingCheckIn(true)
      
      // Get current location
      const locationResult = await window.electronAPI.location.getCurrentPosition()
      if (!locationResult.success) {
        showNotification('Location Error', 'Failed to get current location', 'error')
        return
      }

      // Check out with location
      const checkOutResult = await window.electronAPI.api.post('/attendance/check-out', {
        location: locationResult.data,
        timestamp: new Date().toISOString()
      })

      if (checkOutResult.success) {
        showNotification('Check Out Successful', 'You have been checked out successfully', 'success')
        loadAttendanceData()
      } else {
        showNotification('Check Out Failed', checkOutResult.error || 'Failed to check out', 'error')
      }
    } catch (error: any) {
      showNotification('Check Out Error', error.message, 'error')
    } finally {
      setProcessingCheckIn(false)
    }
  }

  const toggleAutoCheckIn = async () => {
    try {
      await updateSetting('autoCheckIn', !settings.autoCheckIn)
      const message = settings.autoCheckIn ? 'Auto check-in disabled' : 'Auto check-in enabled'
      showNotification('Settings Updated', message, 'success')
    } catch (error: any) {
      showNotification('Settings Error', error.message, 'error')
    }
  }

  const formatTime = (date?: Date) => {
    if (!date) return '--:--'
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    return `${h}h ${m}m`
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'present': '#27ae60',
      'absent': '#e74c3c',
      'late': '#f39c12',
      'early_leave': '#e67e22'
    }
    return colors[status] || '#6c757d'
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'present': 'Present',
      'absent': 'Absent',
      'late': 'Late',
      'early_leave': 'Early Leave'
    }
    return labels[status] || status
  }

  const calculateWorkingTime = () => {
    if (!attendanceStatus.todayRecord?.check_in_time) return 0
    
    const checkIn = attendanceStatus.todayRecord.check_in_time
    const checkOut = attendanceStatus.todayRecord.check_out_time || new Date()
    
    return Math.max(0, (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60))
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Attendance</div>
        <div className="page-subtitle">Manage your attendance and working hours</div>
      </div>

      <div className="page-content">
        {/* Current Status */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Today's Attendance</div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              {currentTime.toLocaleDateString()} • {currentTime.toLocaleTimeString()}
            </div>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-2">
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Status</div>
                    <span className={`status`} style={{ 
                      backgroundColor: attendanceStatus.isCheckedIn ? '#d4edda' : '#f8d7da',
                      color: attendanceStatus.isCheckedIn ? '#155724' : '#721c24'
                    }}>
                      {attendanceStatus.isCheckedIn ? 'Checked In' : 'Checked Out'}
                    </span>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Check In Time</div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>
                      {formatTime(attendanceStatus.todayRecord?.check_in_time)}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Check Out Time</div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>
                      {formatTime(attendanceStatus.todayRecord?.check_out_time)}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Working Time</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#27ae60' }}>
                      {formatDuration(calculateWorkingTime())}
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  className={`btn btn-lg ${attendanceStatus.isCheckedIn ? 'btn-warning' : 'btn-success'}`}
                  onClick={attendanceStatus.isCheckedIn ? handleCheckOut : handleCheckIn}
                  disabled={processingCheckIn}
                  style={{ width: '100%' }}
                >
                  {processingCheckIn ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                      Processing...
                    </div>
                  ) : attendanceStatus.isCheckedIn ? (
                    '🚪 Check Out'
                  ) : (
                    '🚪 Check In'
                  )}
                </button>
                
                <div className="form-checkbox">
                  <input
                    type="checkbox"
                    id="autoCheckIn"
                    checked={settings.autoCheckIn}
                    onChange={toggleAutoCheckIn}
                  />
                  <label htmlFor="autoCheckIn">
                    Enable auto check-in when app starts
                  </label>
                </div>
                
                {attendanceStatus.workLocation && (
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    <div style={{ marginBottom: '4px' }}>📍 Work Location:</div>
                    <div>{attendanceStatus.workLocation.name}</div>
                    <div>{attendanceStatus.workLocation.address}</div>
                    <div>Radius: {attendanceStatus.workLocation.radius}m</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Attendance History */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Attendance History</div>
            <div>
              <input
                type="month"
                className="form-input"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                max={new Date().toISOString().slice(0, 7)}
                style={{ width: '150px' }}
              />
            </div>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading">
                <div className="spinner" />
                <span>Loading attendance history...</span>
              </div>
            ) : attendanceHistory.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
                <div>No attendance records found</div>
                <div style={{ fontSize: '14px', marginTop: '8px' }}>
                  Your attendance records will appear here
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Check In</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Check Out</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Working Hours</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceHistory.map((record) => (
                      <tr key={record.id} style={{ borderBottom: '1px solid #f8f9fa' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 500 }}>
                            {new Date(record.date).toLocaleDateString()}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {formatTime(record.check_in_time)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {formatTime(record.check_out_time)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>
                          {formatDuration(record.working_hours)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span 
                            className="status"
                            style={{ 
                              backgroundColor: getStatusColor(record.status) + '20',
                              color: getStatusColor(record.status)
                            }}
                          >
                            {getStatusLabel(record.status)}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#6c757d' }}>
                          {record.location || '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="grid grid-cols-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Monthly Summary</div>
            </div>
            <div className="card-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Working Days</span>
                  <span style={{ fontWeight: 600 }}>
                    {attendanceHistory.filter(r => r.status === 'present' || r.status === 'late').length}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Late Days</span>
                  <span style={{ fontWeight: 600, color: '#f39c12' }}>
                    {attendanceHistory.filter(r => r.status === 'late').length}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Absent Days</span>
                  <span style={{ fontWeight: 600, color: '#e74c3c' }}>
                    {attendanceHistory.filter(r => r.status === 'absent').length}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Hours</span>
                  <span style={{ fontWeight: 600, color: '#27ae60' }}>
                    {formatDuration(attendanceHistory.reduce((sum, r) => sum + r.working_hours, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Current Location</div>
            </div>
            <div className="card-content">
              {attendanceStatus.currentLocation ? (
                <div style={{ fontSize: '12px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Coordinates:</strong><br />
                    Lat: {attendanceStatus.currentLocation.latitude.toFixed(6)}<br />
                    Lng: {attendanceStatus.currentLocation.longitude.toFixed(6)}
                  </div>
                  <div>
                    <strong>Accuracy:</strong> ±{attendanceStatus.currentLocation.accuracy.toFixed(0)}m
                  </div>
                </div>
              ) : (
                <div className="text-muted">
                  <div style={{ marginBottom: '8px' }}>📍 Location not available</div>
                  <div style={{ fontSize: '12px' }}>
                    Enable location services for accurate attendance tracking
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}