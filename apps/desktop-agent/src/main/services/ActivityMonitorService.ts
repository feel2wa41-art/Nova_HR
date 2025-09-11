import Store from 'electron-store'
import { powerMonitor } from 'electron'
import { ApiService } from './ApiService'

export interface AppWhitelistItem {
  id: string
  app_name: string
  category: string
  is_productive: boolean
  description?: string
  company_id: string
}

export interface ApplicationUsage {
  appName: string
  title: string
  execName: string
  pid: number
  startTime: number
  endTime?: number
  duration: number
  isProductive: boolean
  url?: string
  memoryUsage?: number
  cpuUsage?: number
}

export interface ActivitySession {
  id: string
  startTime: number
  endTime?: number
  duration: number
  totalActiveTime: number
  totalIdleTime: number
  applications: ApplicationUsage[]
  breaks: IdlePeriod[]
}

export interface IdlePeriod {
  startTime: number
  endTime: number
  duration: number
  reason: 'idle' | 'locked' | 'suspend' | 'shutdown'
}

export interface ActivityStats {
  totalWorkTime: number
  activeTime: number
  idleTime: number
  breakTime: number
  productivityScore: number
  topApplications: Array<{
    name: string
    duration: number
    percentage: number
  }>
  hourlyActivity: Array<{
    hour: number
    activeMinutes: number
    idleMinutes: number
  }>
}

export class ActivityMonitorService {
  private apiService: ApiService
  private store: Store<any>
  private monitoringInterval: NodeJS.Timeout | null = null
  private currentSession: ActivitySession | null = null
  private currentApp: ApplicationUsage | null = null
  private isMonitoring = false
  private lastActivity = Date.now()
  private idleThreshold = 300000 // 5 minutes
  private uploadInterval = 30000 // 30 seconds
  private appWhitelist: AppWhitelistItem[] = []
  private lastWhitelistUpdate = 0
  private whitelistUpdateInterval = 3600000 // 1 hour

  constructor(apiService: ApiService, store: Store<any>) {
    this.apiService = apiService
    this.store = store
    this.setupPowerMonitor()
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('Activity monitoring is already active')
      return
    }

    console.log('Starting activity monitoring...')
    
    // Update app whitelist before starting monitoring
    await this.updateAppWhitelist()
    
    this.isMonitoring = true
    this.lastActivity = Date.now()

    // Start new session
    this.currentSession = {
      id: `session-${Date.now()}`,
      startTime: Date.now(),
      duration: 0,
      totalActiveTime: 0,
      totalIdleTime: 0,
      applications: [],
      breaks: []
    }

    // Start monitoring active window
    this.monitoringInterval = setInterval(async () => {
      await this.checkActiveWindow()
      await this.checkIdleTime()
    }, 5000) // Check every 5 seconds

    // Upload data periodically
    setInterval(async () => {
      await this.uploadActivityData()
    }, this.uploadInterval)

    console.log('Activity monitoring started')
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return
    }

    console.log('Stopping activity monitoring...')
    this.isMonitoring = false

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    // End current app usage
    if (this.currentApp) {
      this.currentApp.endTime = Date.now()
      this.currentApp.duration = this.currentApp.endTime - this.currentApp.startTime
      if (this.currentSession) {
        this.currentSession.applications.push(this.currentApp)
      }
      this.currentApp = null
    }

    // End current session
    if (this.currentSession) {
      this.currentSession.endTime = Date.now()
      this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime
      
      // Final upload
      this.uploadActivityData()
    }

    console.log('Activity monitoring stopped')
  }

  private async checkActiveWindow(): Promise<void> {
    try {
      // Fallback activity tracking without active-win
      const win = {
        title: 'Unknown Application',
        owner: { name: 'System', processId: 0, path: 'system' }
      }

      if (!win) {
        this.handleAppSwitch(null)
        return
      }

      const currentTime = Date.now()
      this.lastActivity = currentTime

      // Check if app has changed
      if (!this.currentApp || 
          this.currentApp.appName !== win.owner.name ||
          this.currentApp.title !== win.title) {
        
        const newApp = this.createApplicationUsage(
          win.owner.name,
          win.title,
          win.owner.path || win.owner.name,
          win.owner.processId
        )
        
        // Add additional properties
        newApp.url = (win as any).url || ''
        newApp.memoryUsage = await this.getMemoryUsage(win.owner.processId)
        newApp.cpuUsage = 0 // Would need additional monitoring for CPU usage

        this.handleAppSwitch(newApp)
      }
    } catch (error) {
      console.warn('Failed to get active window:', error)
    }
  }

  private handleAppSwitch(newApp: ApplicationUsage | null): void {
    const currentTime = Date.now()

    // End current app usage
    if (this.currentApp) {
      this.currentApp.endTime = currentTime
      this.currentApp.duration = currentTime - this.currentApp.startTime
      
      if (this.currentSession) {
        this.currentSession.applications.push({ ...this.currentApp })
        this.currentSession.totalActiveTime += this.currentApp.duration
      }
    }

    // Start new app usage
    this.currentApp = newApp
  }

  private async checkIdleTime(): Promise<void> {
    const currentTime = Date.now()
    const idleTime = currentTime - this.lastActivity

    if (idleTime > this.idleThreshold) {
      // User is idle
      if (this.currentApp) {
        // End current app and start idle period
        this.handleAppSwitch(null)
        
        if (this.currentSession) {
          const idlePeriod: IdlePeriod = {
            startTime: this.lastActivity,
            endTime: currentTime,
            duration: idleTime,
            reason: 'idle'
          }
          this.currentSession.breaks.push(idlePeriod)
          this.currentSession.totalIdleTime += idleTime
        }
      }
    }
  }

  private setupPowerMonitor(): void {
    powerMonitor.on('suspend', () => {
      console.log('System is going to sleep')
      if (this.currentSession) {
        const idlePeriod: IdlePeriod = {
          startTime: Date.now(),
          endTime: 0,
          duration: 0,
          reason: 'suspend'
        }
        this.currentSession.breaks.push(idlePeriod)
      }
    })

    powerMonitor.on('resume', () => {
      console.log('System has resumed')
      const currentTime = Date.now()
      
      if (this.currentSession && this.currentSession.breaks.length > 0) {
        const lastBreak = this.currentSession.breaks[this.currentSession.breaks.length - 1]
        if (lastBreak.reason === 'suspend' && lastBreak.endTime === 0) {
          lastBreak.endTime = currentTime
          lastBreak.duration = currentTime - lastBreak.startTime
          this.currentSession.totalIdleTime += lastBreak.duration
        }
      }
      
      this.lastActivity = currentTime
    })

    powerMonitor.on('lock-screen', () => {
      console.log('Screen is locked')
      if (this.currentApp) {
        this.handleAppSwitch(null)
      }
    })

    powerMonitor.on('unlock-screen', () => {
      console.log('Screen is unlocked')
      this.lastActivity = Date.now()
    })
  }

  private async getMemoryUsage(_processId: number): Promise<number> {
    try {
      // const process = await import('process')
      // This would need platform-specific implementation
      // For now, return 0
      return 0
    } catch (error) {
      return 0
    }
  }

  private async uploadActivityData(): Promise<void> {
    if (!this.currentSession || this.currentSession.applications.length === 0) {
      return
    }

    try {
      const activityData = {
        sessionId: this.currentSession.id,
        startTime: this.currentSession.startTime,
        endTime: Date.now(),
        applications: this.currentSession.applications.slice(),
        breaks: this.currentSession.breaks.slice(),
        totalActiveTime: this.currentSession.totalActiveTime,
        totalIdleTime: this.currentSession.totalIdleTime
      }

      const result = await this.apiService.submitActivity(activityData)
      
      if (result.success) {
        // Clear uploaded data to avoid duplicates
        this.currentSession.applications = []
        this.currentSession.breaks = []
        console.log('Activity data uploaded successfully')
      } else {
        console.warn('Failed to upload activity data:', result.error)
      }
    } catch (error) {
      console.error('Error uploading activity data:', error)
    }
  }

  async getStats(period?: 'today' | 'week' | 'month'): Promise<ActivityStats | null> {
    try {
      const params = period ? { period } : undefined
      const response = await this.apiService.getActivityStats(params)
      
      if (response.success) {
        return response.data as ActivityStats
      } else {
        console.warn('Failed to get activity stats:', response.error)
        return null
      }
    } catch (error) {
      console.error('Error getting activity stats:', error)
      return null
    }
  }

  async getLocalStats(): Promise<ActivityStats> {
    const sessions = this.getStoredSessions()
    
    if (sessions.length === 0) {
      return {
        totalWorkTime: 0,
        activeTime: 0,
        idleTime: 0,
        breakTime: 0,
        productivityScore: 0,
        topApplications: [],
        hourlyActivity: []
      }
    }

    // Aggregate data from sessions
    const totalWorkTime = sessions.reduce((total, session) => total + session.duration, 0)
    const activeTime = sessions.reduce((total, session) => total + session.totalActiveTime, 0)
    const idleTime = sessions.reduce((total, session) => total + session.totalIdleTime, 0)
    const breakTime = idleTime // For simplicity

    // Calculate top applications
    const appUsage = new Map<string, number>()
    sessions.forEach(session => {
      session.applications.forEach(app => {
        const current = appUsage.get(app.appName) || 0
        appUsage.set(app.appName, current + app.duration)
      })
    })

    const topApplications = Array.from(appUsage.entries())
      .map(([name, duration]) => ({
        name,
        duration,
        percentage: (duration / activeTime) * 100
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)

    // Calculate productivity score (simple metric)
    const productivityScore = activeTime > 0 ? (activeTime / totalWorkTime) * 100 : 0

    // Generate hourly activity (simplified)
    const hourlyActivity = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      activeMinutes: 0,
      idleMinutes: 0
    }))

    return {
      totalWorkTime,
      activeTime,
      idleTime,
      breakTime,
      productivityScore: Math.round(productivityScore),
      topApplications,
      hourlyActivity
    }
  }

  private getStoredSessions(): ActivitySession[] {
    return this.store.get('activitySessions', []) as ActivitySession[]
  }

  private _storeSession(session: ActivitySession): void {
    const sessions = this.getStoredSessions()
    sessions.push(session)
    
    // Keep only last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
    const recentSessions = sessions.filter(s => s.startTime > thirtyDaysAgo)
    
    this.store.set('activitySessions', recentSessions)
    // const _storeSession = this.store.get('currentSession') as any
  }

  getCurrentSession(): ActivitySession | null {
    return this.currentSession
  }

  getCurrentApp(): ApplicationUsage | null {
    return this.currentApp
  }

  isMonitoringActive(): boolean {
    return this.isMonitoring
  }

  getLastActivity(): number {
    return this.lastActivity
  }

  getIdleTime(): number {
    return Date.now() - this.lastActivity
  }

  isUserIdle(): boolean {
    return this.getIdleTime() > this.idleThreshold
  }

  // Configuration methods
  setIdleThreshold(minutes: number): void {
    this.idleThreshold = minutes * 60 * 1000
  }

  setUploadInterval(seconds: number): void {
    this.uploadInterval = seconds * 1000
  }

  // Get productivity insights
  getProductivityInsights(): {
    mostProductiveHour: number
    leastProductiveHour: number
    averageSessionTime: number
    topDistractingApps: string[]
    focusScore: number
  } {
    const sessions = this.getStoredSessions()
    
    if (sessions.length === 0) {
      return {
        mostProductiveHour: 9,
        leastProductiveHour: 15,
        averageSessionTime: 0,
        topDistractingApps: [],
        focusScore: 0
      }
    }

    // Calculate insights (simplified implementation)
    const averageSessionTime = sessions.reduce((total, s) => total + s.duration, 0) / sessions.length
    
    // Mock data for now - would implement actual analysis
    return {
      mostProductiveHour: 10,
      leastProductiveHour: 14,
      averageSessionTime,
      topDistractingApps: ['Social Media', 'Entertainment', 'Games'],
      focusScore: 75
    }
  }

  // App Whitelist Management
  async updateAppWhitelist(): Promise<boolean> {
    try {
      const currentTime = Date.now()
      
      // Check if we need to update (every hour or on first load)
      if (currentTime - this.lastWhitelistUpdate < this.whitelistUpdateInterval && this.appWhitelist.length > 0) {
        return true
      }

      console.log('Fetching app whitelist from server...')
      const response = await this.apiService.getAppWhitelist()
      
      if (response.success && Array.isArray(response.data)) {
        this.appWhitelist = response.data
        this.lastWhitelistUpdate = currentTime
        
        // Cache whitelist locally
        this.store.set('appWhitelist', this.appWhitelist)
        this.store.set('lastWhitelistUpdate', this.lastWhitelistUpdate)
        
        console.log(`Updated app whitelist with ${this.appWhitelist.length} apps`)
        return true
      } else {
        console.warn('Failed to fetch app whitelist:', response.error)
        
        // Try to load from local cache
        const cachedWhitelist = this.store.get('appWhitelist', []) as AppWhitelistItem[]
        if (cachedWhitelist.length > 0) {
          this.appWhitelist = cachedWhitelist
          this.lastWhitelistUpdate = this.store.get('lastWhitelistUpdate', 0) as number
          console.log('Using cached app whitelist')
          return true
        }
        
        return false
      }
    } catch (error) {
      console.error('Error updating app whitelist:', error)
      
      // Try to load from local cache
      const cachedWhitelist = this.store.get('appWhitelist', []) as AppWhitelistItem[]
      if (cachedWhitelist.length > 0) {
        this.appWhitelist = cachedWhitelist
        this.lastWhitelistUpdate = this.store.get('lastWhitelistUpdate', 0) as number
        console.log('Using cached app whitelist due to error')
        return true
      }
      
      return false
    }
  }

  private isAppProductive(appName: string, execName?: string): boolean {
    if (this.appWhitelist.length === 0) {
      // If no whitelist is available, default to false (unproductive)
      return false
    }

    // Clean app name for comparison
    const cleanAppName = this.cleanAppName(appName)
    const cleanExecName = execName ? this.cleanAppName(execName) : ''

    // Check if app is in whitelist
    const whitelistItem = this.appWhitelist.find(item => {
      const cleanWhitelistName = this.cleanAppName(item.app_name)
      return cleanWhitelistName === cleanAppName || 
             (cleanExecName && cleanWhitelistName === cleanExecName) ||
             cleanWhitelistName.includes(cleanAppName) ||
             cleanAppName.includes(cleanWhitelistName)
    })

    if (whitelistItem) {
      console.log(`App "${appName}" found in whitelist as "${whitelistItem.app_name}" - Productive: ${whitelistItem.is_productive}`)
      return whitelistItem.is_productive
    }

    console.log(`App "${appName}" not found in whitelist - Marking as unproductive`)
    return false
  }

  private cleanAppName(appName: string): string {
    return appName
      .toLowerCase()
      .replace(/\.exe$/i, '')
      .replace(/[^\w\s]/g, '')
      .trim()
  }

  private createApplicationUsage(appName: string, title: string, execName: string, pid: number): ApplicationUsage {
    const isProductive = this.isAppProductive(appName, execName)
    
    return {
      appName,
      title,
      execName,
      pid,
      startTime: Date.now(),
      duration: 0,
      isProductive,
      memoryUsage: 0,
      cpuUsage: 0
    }
  }

  getAppWhitelist(): AppWhitelistItem[] {
    return [...this.appWhitelist]
  }

  forceWhitelistUpdate(): Promise<boolean> {
    this.lastWhitelistUpdate = 0
    return this.updateAppWhitelist()
  }
}