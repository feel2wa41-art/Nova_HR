import { powerMonitor, ipcMain } from 'electron'
import { ApiService, ApiResponse } from './ApiService'
import { SystemInfoService } from './SystemInfoService'

export interface IdleEvent {
  type: 'IDLE_START' | 'IDLE_END' | 'SYSTEM_WAKE' | 'SYSTEM_SLEEP' | 'SCREEN_LOCK' | 'SCREEN_UNLOCK'
  timestamp: string
  idleDuration?: number // in seconds
  reason?: string
}

export interface IdleSession {
  sessionId: string
  startTime: string
  endTime?: string
  totalIdleTime: number
  events: IdleEvent[]
  processesCapture?: any // Captured when idle is detected
}

export class IdleDetectionService {
  private apiService: ApiService
  private systemInfoService: SystemInfoService
  private idleThreshold: number = 900 // 15 minutes in seconds
  private checkInterval: number = 5000 // Check every 5 seconds
  private idleCheckTimer: NodeJS.Timeout | null = null
  
  private isIdle: boolean = false
  private currentIdleSession: IdleSession | null = null
  private lastActiveTime: number = Date.now()
  
  // Event callbacks
  private onIdleStartCallback?: (session: IdleSession) => void
  private onIdleEndCallback?: (session: IdleSession) => void

  constructor(apiService: ApiService, systemInfoService: SystemInfoService) {
    this.apiService = apiService
    this.systemInfoService = systemInfoService
    this.setupSystemEventListeners()
  }

  private setupSystemEventListeners(): void {
    // System events
    powerMonitor.on('lock-screen', () => {
      this.handleSystemEvent('SCREEN_LOCK', 'Screen locked by user')
    })

    powerMonitor.on('unlock-screen', () => {
      this.handleSystemEvent('SCREEN_UNLOCK', 'Screen unlocked by user')
      this.resetIdleTimer() // Reset idle timer on unlock
    })

    powerMonitor.on('suspend', () => {
      this.handleSystemEvent('SYSTEM_SLEEP', 'System entering sleep mode')
    })

    powerMonitor.on('resume', () => {
      this.handleSystemEvent('SYSTEM_WAKE', 'System resumed from sleep')
      this.resetIdleTimer() // Reset idle timer on resume
    })

    // Monitor user activity to reset idle timer
    powerMonitor.on('user-did-become-active', () => {
      this.resetIdleTimer()
    })

    powerMonitor.on('user-did-resign-active', () => {
      // User became inactive, but don't immediately mark as idle
      // Let the idle detection timer handle it
    })
  }

  private handleSystemEvent(type: IdleEvent['type'], reason: string): void {
    const event: IdleEvent = {
      type,
      timestamp: new Date().toISOString(),
      reason
    }

    console.log(`System event: ${type} - ${reason}`)

    // Add event to current idle session if exists
    if (this.currentIdleSession) {
      this.currentIdleSession.events.push(event)
    }

    // Handle screen unlock or system wake - mark as activity
    if (type === 'SCREEN_UNLOCK' || type === 'SYSTEM_WAKE') {
      if (this.isIdle && this.currentIdleSession) {
        this.endIdleSession()
      }
    }

    // Submit event to server
    this.submitIdleEvent(event)
  }

  private async submitIdleEvent(event: IdleEvent): Promise<void> {
    try {
      await this.apiService.post('/attitude/idle-events', {
        event,
        sessionId: this.currentIdleSession?.sessionId
      })
    } catch (error) {
      console.error('Failed to submit idle event:', error)
    }
  }

  private resetIdleTimer(): void {
    this.lastActiveTime = Date.now()
    
    // If currently idle, end the idle session
    if (this.isIdle && this.currentIdleSession) {
      this.endIdleSession()
    }
  }

  private generateSessionId(): string {
    return `IDLE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async startIdleSession(): Promise<void> {
    if (this.isIdle || this.currentIdleSession) {
      return // Already in idle session
    }

    const sessionId = this.generateSessionId()
    const startTime = new Date().toISOString()

    console.log(`Starting idle session: ${sessionId}`)

    // Capture current processes when idle is detected
    let processesCapture = null
    try {
      processesCapture = await this.systemInfoService.getRunningProcesses()
    } catch (error) {
      console.error('Failed to capture processes during idle start:', error)
    }

    this.currentIdleSession = {
      sessionId,
      startTime,
      totalIdleTime: 0,
      events: [{
        type: 'IDLE_START',
        timestamp: startTime,
        reason: `No activity detected for ${this.idleThreshold} seconds`
      }],
      processesCapture
    }

    this.isIdle = true

    // Callback
    if (this.onIdleStartCallback) {
      this.onIdleStartCallback(this.currentIdleSession)
    }

    // Submit to server
    try {
      await this.apiService.post('/attitude/idle-sessions', {
        action: 'start',
        session: this.currentIdleSession
      })
    } catch (error) {
      console.error('Failed to submit idle session start:', error)
    }

    // Automatically capture processes (as requested in the requirements)
    if (processesCapture && processesCapture.length > 0) {
      try {
        await this.systemInfoService.collectAndSubmitProcesses()
        console.log('Automatic process capture triggered by idle detection')
      } catch (error) {
        console.error('Failed to auto-capture processes during idle:', error)
      }
    }
  }

  private async endIdleSession(): Promise<void> {
    if (!this.isIdle || !this.currentIdleSession) {
      return // Not in idle session
    }

    const endTime = new Date().toISOString()
    const startTime = new Date(this.currentIdleSession.startTime).getTime()
    const totalIdleTime = Math.floor((new Date(endTime).getTime() - startTime) / 1000)

    console.log(`Ending idle session: ${this.currentIdleSession.sessionId}, duration: ${totalIdleTime}s`)

    // Update session
    this.currentIdleSession.endTime = endTime
    this.currentIdleSession.totalIdleTime = totalIdleTime
    this.currentIdleSession.events.push({
      type: 'IDLE_END',
      timestamp: endTime,
      idleDuration: totalIdleTime,
      reason: 'User activity detected'
    })

    // Callback
    if (this.onIdleEndCallback) {
      this.onIdleEndCallback(this.currentIdleSession)
    }

    // Submit to server
    try {
      await this.apiService.post('/attitude/idle-sessions', {
        action: 'end',
        session: this.currentIdleSession
      })
    } catch (error) {
      console.error('Failed to submit idle session end:', error)
    }

    // Reset state
    this.isIdle = false
    this.currentIdleSession = null
  }

  // Start idle detection
  startIdleDetection(thresholdSeconds: number = 900): void {
    this.idleThreshold = thresholdSeconds
    
    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer)
    }

    console.log(`Starting idle detection with ${thresholdSeconds}s threshold`)

    this.lastActiveTime = Date.now()
    
    this.idleCheckTimer = setInterval(async () => {
      try {
        const idleTime = powerMonitor.getSystemIdleTime()
        const currentTime = Date.now()
        
        // Check if system has been idle for the threshold duration
        if (idleTime >= this.idleThreshold && !this.isIdle) {
          console.log(`System idle detected: ${idleTime}s (threshold: ${this.idleThreshold}s)`)
          await this.startIdleSession()
        }
        
        // Also check our internal timer as backup
        const timeSinceLastActivity = (currentTime - this.lastActiveTime) / 1000
        if (timeSinceLastActivity >= this.idleThreshold && !this.isIdle) {
          console.log(`Backup idle detection: ${timeSinceLastActivity}s since last activity`)
          await this.startIdleSession()
        }

        // Update last check time if user is active
        if (idleTime < 10) { // If idle time is less than 10 seconds, consider user active
          this.lastActiveTime = currentTime
        }

      } catch (error) {
        console.error('Error in idle detection check:', error)
      }
    }, this.checkInterval)
  }

  // Stop idle detection
  stopIdleDetection(): void {
    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer)
      this.idleCheckTimer = null
      console.log('Stopped idle detection')
    }

    // End current session if active
    if (this.currentIdleSession) {
      this.endIdleSession()
    }
  }

  // Get current idle status
  getIdleStatus(): {
    isIdle: boolean
    currentSession: IdleSession | null
    idleThreshold: number
    lastActiveTime: string
  } {
    return {
      isIdle: this.isIdle,
      currentSession: this.currentIdleSession,
      idleThreshold: this.idleThreshold,
      lastActiveTime: new Date(this.lastActiveTime).toISOString()
    }
  }

  // Set idle threshold
  setIdleThreshold(seconds: number): void {
    this.idleThreshold = seconds
    console.log(`Idle threshold updated to ${seconds}s`)
  }

  // Set callback for idle start
  onIdleStart(callback: (session: IdleSession) => void): void {
    this.onIdleStartCallback = callback
  }

  // Set callback for idle end
  onIdleEnd(callback: (session: IdleSession) => void): void {
    this.onIdleEndCallback = callback
  }

  // Manual idle trigger (for testing)
  async triggerIdleManually(): Promise<void> {
    console.log('Manually triggering idle session')
    await this.startIdleSession()
  }

  // Manual idle end (for testing)
  async endIdleManually(): Promise<void> {
    console.log('Manually ending idle session')
    if (this.currentIdleSession) {
      await this.endIdleSession()
    }
  }

  // Get idle statistics
  async getIdleStats(days: number = 7): Promise<ApiResponse> {
    try {
      return await this.apiService.get('/attitude/idle-stats', { days })
    } catch (error: any) {
      console.error('Failed to get idle stats:', error)
      return {
        success: false,
        error: error.message || 'Failed to get idle statistics'
      }
    }
  }

  // Force process capture (triggered by idle or manual)
  async captureProcessesOnIdle(): Promise<void> {
    try {
      console.log('Capturing processes due to idle state')
      const result = await this.systemInfoService.collectAndSubmitProcesses()
      
      if (result.success) {
        console.log('Process capture completed successfully')
      } else {
        console.error('Process capture failed:', result.error)
      }
    } catch (error) {
      console.error('Error during idle process capture:', error)
    }
  }

  // Get system idle time (wrapper for powerMonitor)
  getSystemIdleTime(): number {
    try {
      return powerMonitor.getSystemIdleTime()
    } catch (error) {
      console.error('Failed to get system idle time:', error)
      return 0
    }
  }
}