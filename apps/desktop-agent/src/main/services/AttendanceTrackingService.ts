import { powerMonitor, app } from 'electron'
import Store from 'electron-store'
import { ApiService, ApiResponse } from './ApiService'
import { SystemInfoService } from './SystemInfoService'

export interface AttendanceSession {
  sessionId: string
  startTime: string
  endTime?: string
  location: 'OFFICE' | 'REMOTE' | 'UNKNOWN'
  network: {
    ssid?: string
    bssid?: string
    ip?: string
    mac?: string
  }
  events: AttendanceEvent[]
  totalHours?: number
  breakTime?: number
  workStartTime?: string
  workEndTime?: string
}

export interface AttendanceEvent {
  type: 'WORK_START' | 'WORK_END' | 'BREAK_START' | 'BREAK_END' | 
        'SCREEN_LOCK' | 'SCREEN_UNLOCK' | 'SYSTEM_SUSPEND' | 'SYSTEM_RESUME' |
        'LOCATION_CHANGE' | 'NETWORK_CHANGE' | 'APP_START' | 'APP_EXIT'
  timestamp: string
  duration?: number // in seconds
  metadata?: any
}

export interface WorkingHoursPolicy {
  minimumWorkHours: number // 4 hours
  standardWorkHours: number // 8 hours
  overtimeThreshold: number // 10 hours
  maxDailyHours: number // 12 hours
  workStartTimeRange: { earliest: string; latest: string } // '07:00' - '10:00'
  workEndTimeRange: { earliest: string; latest: string } // '16:00' - '22:00'
  autoDetectLocation: boolean
  officeNetworks: string[]
  homeNetworks: string[]
}

export class AttendanceTrackingService {
  private apiService: ApiService
  private systemInfoService: SystemInfoService
  private store: Store

  private currentSession: AttendanceSession | null = null
  private isWorkingHours: boolean = false
  private lastNetworkCheck: string | null = null
  private workingHoursPolicy: WorkingHoursPolicy

  constructor(apiService: ApiService, systemInfoService: SystemInfoService, store: Store) {
    this.apiService = apiService
    this.systemInfoService = systemInfoService
    this.store = store

    // Default working hours policy
    this.workingHoursPolicy = {
      minimumWorkHours: 4,
      standardWorkHours: 8,
      overtimeThreshold: 10,
      maxDailyHours: 12,
      workStartTimeRange: { earliest: '07:00', latest: '10:00' },
      workEndTimeRange: { earliest: '16:00', latest: '22:00' },
      autoDetectLocation: true,
      officeNetworks: ['Office_WiFi', 'Company_5G', 'Office_LAN', 'Corporate_WiFi'],
      homeNetworks: ['Home_Network', 'Home_WiFi']
    }

    this.loadWorkingHoursPolicy()
    this.setupSystemEventListeners()
  }

  private loadWorkingHoursPolicy(): void {
    const savedPolicy = this.store.get('workingHoursPolicy') as WorkingHoursPolicy
    if (savedPolicy) {
      this.workingHoursPolicy = { ...this.workingHoursPolicy, ...savedPolicy }
    }
  }

  private saveWorkingHoursPolicy(): void {
    this.store.set('workingHoursPolicy', this.workingHoursPolicy)
  }

  private setupSystemEventListeners(): void {
    // Screen lock/unlock events
    powerMonitor.on('lock-screen', () => {
      this.handleSessionEvent('SCREEN_LOCK', 'Screen locked by user')
    })

    powerMonitor.on('unlock-screen', async () => {
      await this.handleSessionEvent('SCREEN_UNLOCK', 'Screen unlocked by user')
      await this.checkAndStartWorkSession()
    })

    // System suspend/resume events
    powerMonitor.on('suspend', () => {
      this.handleSessionEvent('SYSTEM_SUSPEND', 'System entering sleep mode')
    })

    powerMonitor.on('resume', async () => {
      await this.handleSessionEvent('SYSTEM_RESUME', 'System resumed from sleep')
      await this.checkAndStartWorkSession()
    })

    // App lifecycle events
    app.on('before-quit', async () => {
      await this.handleSessionEvent('APP_EXIT', 'Application is closing')
      await this.endWorkSession()
    })
  }

  private generateSessionId(): string {
    return `WORK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async getCurrentNetworkInfo(): Promise<AttendanceSession['network']> {
    try {
      const networkInfo = await this.systemInfoService.getNetworkInfo()
      return {
        ssid: networkInfo.current.ssid,
        bssid: networkInfo.current.bssid,
        ip: networkInfo.interface.ip4,
        mac: networkInfo.interface.mac
      }
    } catch (error) {
      console.error('Failed to get network info for attendance:', error)
      return {}
    }
  }

  private determineLocation(networkInfo: AttendanceSession['network']): 'OFFICE' | 'REMOTE' | 'UNKNOWN' {
    if (!networkInfo.ssid) return 'UNKNOWN'

    const ssidUpper = networkInfo.ssid.toUpperCase()
    
    // Check office networks
    const isOffice = this.workingHoursPolicy.officeNetworks.some(pattern =>
      ssidUpper.includes(pattern.toUpperCase())
    )
    
    if (isOffice) return 'OFFICE'

    // Check home networks  
    const isHome = this.workingHoursPolicy.homeNetworks.some(pattern =>
      ssidUpper.includes(pattern.toUpperCase())
    )

    return isHome ? 'REMOTE' : 'UNKNOWN'
  }

  private isWorkingTime(): boolean {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`

    // Check if current time is within working hours range
    const earliestStart = this.workingHoursPolicy.workStartTimeRange.earliest
    const latestEnd = this.workingHoursPolicy.workEndTimeRange.latest

    return currentTime >= earliestStart && currentTime <= latestEnd
  }

  // Start work session
  private async startWorkSession(triggerInfo: {
    type: 'APP_START' | 'SCREEN_UNLOCK' | 'SYSTEM_RESUME' | 'MANUAL'
    timestamp: Date
    networkInfo: AttendanceSession['network']
  }): Promise<void> {
    if (this.currentSession) {
      console.log('Work session already active')
      return
    }

    const sessionId = this.generateSessionId()
    const location = this.determineLocation(triggerInfo.networkInfo)

    this.currentSession = {
      sessionId,
      startTime: triggerInfo.timestamp.toISOString(),
      location,
      network: triggerInfo.networkInfo,
      events: [{
        type: 'WORK_START',
        timestamp: triggerInfo.timestamp.toISOString(),
        metadata: {
          trigger: triggerInfo.type,
          detectedLocation: location,
          networkSSID: triggerInfo.networkInfo.ssid
        }
      }]
    }

    this.isWorkingHours = true

    console.log(`Work session started: ${sessionId} at ${location}`)

    // Save current session locally
    this.saveCurrentSession()

    // Submit to server
    try {
      await this.apiService.checkIn({
        sessionId,
        timestamp: triggerInfo.timestamp.toISOString(),
        location,
        network: triggerInfo.networkInfo,
        triggerType: triggerInfo.type
      })
      console.log('Check-in submitted to server successfully')
    } catch (error) {
      console.error('Failed to submit check-in:', error)
    }
  }

  // End work session
  private async endWorkSession(triggerInfo?: {
    type: 'APP_EXIT' | 'SYSTEM_SHUTDOWN' | 'MANUAL'
    timestamp: Date
  }): Promise<void> {
    if (!this.currentSession) {
      console.log('No active work session to end')
      return
    }

    const endTime = (triggerInfo?.timestamp || new Date()).toISOString()
    const startTime = new Date(this.currentSession.startTime)
    const totalMinutes = Math.floor((new Date(endTime).getTime() - startTime.getTime()) / (1000 * 60))
    const totalHours = parseFloat((totalMinutes / 60).toFixed(2))

    // Add end event
    this.currentSession.events.push({
      type: 'WORK_END',
      timestamp: endTime,
      duration: totalMinutes * 60, // in seconds
      metadata: {
        trigger: triggerInfo?.type || 'AUTO',
        totalHours,
        location: this.currentSession.location
      }
    })

    this.currentSession.endTime = endTime
    this.currentSession.totalHours = totalHours
    this.currentSession.workEndTime = endTime

    console.log(`Work session ended: ${this.currentSession.sessionId}, duration: ${totalHours}h`)

    // Submit to server
    try {
      await this.apiService.checkOut({
        sessionId: this.currentSession.sessionId,
        timestamp: endTime,
        totalHours,
        location: this.currentSession.location,
        events: this.currentSession.events
      })
      console.log('Check-out submitted to server successfully')
    } catch (error) {
      console.error('Failed to submit check-out:', error)
      // Save for offline sync
      this.saveOfflineRecord('check-out', this.currentSession)
    }

    // Clear current session
    this.isWorkingHours = false
    this.currentSession = null
    this.clearCurrentSession()
  }

  private async handleSessionEvent(
    eventType: AttendanceEvent['type'], 
    metadata: string
  ): Promise<void> {
    const event: AttendanceEvent = {
      type: eventType,
      timestamp: new Date().toISOString(),
      metadata: { description: metadata }
    }

    // Add to current session if exists
    if (this.currentSession) {
      this.currentSession.events.push(event)
      this.saveCurrentSession()
    }

    // Submit event to server
    try {
      await this.apiService.post('/attitude/attendance-events', {
        sessionId: this.currentSession?.sessionId,
        event
      })
    } catch (error) {
      console.error('Failed to submit attendance event:', error)
    }

    console.log(`Attendance event: ${eventType} - ${metadata}`)
  }

  // Check if we should start work session
  private async checkAndStartWorkSession(): Promise<void> {
    try {
      // Don't start if already working
      if (this.currentSession && this.isWorkingHours) {
        return
      }

      // Check if it's working hours
      const isWorkTime = this.isWorkingTime()
      if (!isWorkTime) {
        console.log('Outside working hours, not starting work session')
        return
      }

      // Get current network info
      const networkInfo = await this.getCurrentNetworkInfo()

      // Check for location/network changes
      const currentNetworkId = networkInfo.ssid || networkInfo.ip || 'unknown'
      if (this.lastNetworkCheck !== currentNetworkId) {
        this.lastNetworkCheck = currentNetworkId

        // Determine if this network indicates work location
        const location = this.determineLocation(networkInfo)
        
        if (location !== 'UNKNOWN' || !this.workingHoursPolicy.autoDetectLocation) {
          await this.startWorkSession({
            type: 'SCREEN_UNLOCK',
            timestamp: new Date(),
            networkInfo
          })
        }
      }
    } catch (error) {
      console.error('Error checking work session start:', error)
    }
  }

  // Handle app start
  async handleAppStart(): Promise<void> {
    console.log('Handling app start for attendance tracking...')

    // Try to restore previous session
    const restoredSession = this.loadCurrentSession()
    if (restoredSession) {
      console.log('Restored previous work session:', restoredSession.sessionId)
      this.currentSession = restoredSession
      this.isWorkingHours = true
      
      // Add app start event
      await this.handleSessionEvent('APP_START', 'Application started - session restored')
    }

    // Check if we should start a new session
    await this.checkAndStartWorkSession()

    // Sync any offline records
    await this.syncOfflineRecords()
  }

  // Public methods

  // Get current attendance status
  getCurrentStatus(): {
    isWorking: boolean
    currentSession: AttendanceSession | null
    todayHours: number
    location: string
    sessionDuration: string
  } {
    let sessionDuration = '0:00'
    let todayHours = 0

    if (this.currentSession) {
      const now = new Date()
      const startTime = new Date(this.currentSession.startTime)
      const durationMs = now.getTime() - startTime.getTime()
      const hours = Math.floor(durationMs / (1000 * 60 * 60))
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
      sessionDuration = `${hours}:${minutes.toString().padStart(2, '0')}`
      todayHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2))
    }

    return {
      isWorking: this.isWorkingHours && !!this.currentSession,
      currentSession: this.currentSession,
      todayHours,
      location: this.currentSession?.location || 'UNKNOWN',
      sessionDuration
    }
  }

  // Manual check-in
  async manualCheckIn(): Promise<ApiResponse> {
    try {
      const networkInfo = await this.getCurrentNetworkInfo()
      
      await this.startWorkSession({
        type: 'MANUAL',
        timestamp: new Date(),
        networkInfo
      })

      return { success: true, data: { message: 'Check-in successful' } }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Manual check-out
  async manualCheckOut(): Promise<ApiResponse> {
    try {
      await this.endWorkSession({
        type: 'MANUAL',
        timestamp: new Date()
      })

      return { success: true, data: { message: 'Check-out successful' } }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Update working hours policy
  updateWorkingHoursPolicy(policy: Partial<WorkingHoursPolicy>): void {
    this.workingHoursPolicy = { ...this.workingHoursPolicy, ...policy }
    this.saveWorkingHoursPolicy()
    console.log('Working hours policy updated')
  }

  getWorkingHoursPolicy(): WorkingHoursPolicy {
    return { ...this.workingHoursPolicy }
  }

  // Save/load current session (for app restart)
  private saveCurrentSession(): void {
    if (this.currentSession) {
      this.store.set('currentAttendanceSession', this.currentSession)
    }
  }

  private loadCurrentSession(): AttendanceSession | null {
    const saved = this.store.get('currentAttendanceSession') as AttendanceSession
    if (saved) {
      // Check if session is from today
      const sessionDate = new Date(saved.startTime)
      const today = new Date()
      
      if (sessionDate.toDateString() === today.toDateString()) {
        return saved
      } else {
        // Session is from previous day, clear it
        this.clearCurrentSession()
      }
    }
    return null
  }

  private clearCurrentSession(): void {
    this.store.delete('currentAttendanceSession')
  }

  // Offline record management
  private saveOfflineRecord(type: 'check-in' | 'check-out', data: any): void {
    const offlineRecords = this.store.get('offlineAttendanceRecords', []) as any[]
    offlineRecords.push({
      type,
      data,
      timestamp: new Date().toISOString()
    })
    this.store.set('offlineAttendanceRecords', offlineRecords)
  }

  private async syncOfflineRecords(): Promise<void> {
    const offlineRecords = this.store.get('offlineAttendanceRecords', []) as any[]
    
    if (offlineRecords.length === 0) {
      return
    }

    console.log(`Syncing ${offlineRecords.length} offline attendance records...`)

    const syncedRecords = []
    for (const record of offlineRecords) {
      try {
        if (record.type === 'check-in') {
          await this.apiService.checkIn(record.data)
        } else if (record.type === 'check-out') {
          await this.apiService.checkOut(record.data)
        }
        syncedRecords.push(record)
        console.log('Synced offline record:', record.type)
      } catch (error) {
        console.error('Failed to sync offline record:', record.type, error)
      }
    }

    // Remove synced records
    const remainingRecords = offlineRecords.filter(record => !syncedRecords.includes(record))
    this.store.set('offlineAttendanceRecords', remainingRecords)

    if (syncedRecords.length > 0) {
      console.log(`Successfully synced ${syncedRecords.length} offline records`)
    }
  }

  // Get attendance statistics
  async getAttendanceStats(days: number = 7): Promise<ApiResponse> {
    try {
      return await this.apiService.get('/attendance/stats', { days })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Stop attendance tracking
  stopTracking(): void {
    if (this.currentSession) {
      this.endWorkSession({
        type: 'MANUAL',
        timestamp: new Date()
      })
    }
    console.log('Attendance tracking stopped')
  }
}