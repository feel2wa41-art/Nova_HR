import { app, BrowserWindow, Menu, Tray, nativeImage, dialog, shell, ipcMain, globalShortcut } from 'electron'
import { join } from 'node:path'
import { electronApp, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { autoUpdater } from 'electron-updater'
import { ScreenshotService } from './services/ScreenshotService'
import { ActivityMonitorService } from './services/ActivityMonitorService'
import { SystemInfoService } from './services/SystemInfoService'
import { IdleDetectionService } from './services/IdleDetectionService'
import { AutoLaunchService } from './services/AutoLaunchService'
import { SecureCredentialService } from './services/SecureCredentialService'
import { ApiService } from './services/ApiService'
import { AuthService } from './services/AuthService'
import { Logger } from './utils/logger'
// import { TrayService } from './services/TrayService' // Unused

// Define app icon - try multiple possible paths
const possibleIconPaths = [
  join(__dirname, '../logo/logo.png'),
  join(__dirname, '../src/logo/logo.png'),
  join(__dirname, '../../logo/logo.png'),
  join(__dirname, '../../src/logo/logo.png')
]

let icon: Electron.NativeImage
let iconFound = false

for (const iconPath of possibleIconPaths) {
  try {
    Logger.log('Trying icon path:', iconPath)
    icon = nativeImage.createFromPath(iconPath)
    if (!icon.isEmpty()) {
      Logger.log('Icon loaded successfully from:', iconPath)
      iconFound = true
      break
    }
  } catch (error) {
    Logger.warn('Could not load icon from:', iconPath, error)
  }
}

if (!iconFound) {
  Logger.warn('No icon found, using empty icon')
  icon = nativeImage.createEmpty()
}

class DesktopAgent {
  private mainWindow: BrowserWindow | null = null
  private tray: Tray | null = null
  private store: Store<any>
  private screenshotService: ScreenshotService
  private activityMonitorService: ActivityMonitorService
  private systemInfoService: SystemInfoService
  private idleDetectionService: IdleDetectionService
  private autoLaunchService: AutoLaunchService
  private secureCredentialService: SecureCredentialService
  private apiService: ApiService
  private authService: AuthService
  // private trayService: TrayService // Unused for now
  private isQuitting = false
  private monitoringActive = false

  constructor() {
    this.store = new Store<any>({
      defaults: {
        windowBounds: { width: 480, height: 600 }, // Much smaller window
        settings: {
          screenshotInterval: 600000, // 10 minutes (reduced frequency)
          activityTracking: true,
          startMinimized: false,
          autoStart: false,
          autoLogin: true, // Enable auto-login by default
          uploadQuality: 50 // Further reduced quality
        },
        auth: {
          token: null,
          refreshToken: null,
          user: null
        }
      }
    })

    // Initialize only essential services for login
    this.apiService = new ApiService(this.store)
    this.authService = new AuthService(this.apiService, this.store)
    this.autoLaunchService = new AutoLaunchService()
    this.secureCredentialService = new SecureCredentialService(this.store, this.apiService)
    
    // Initialize other services only after login
    this.screenshotService = null as any
    this.activityMonitorService = null as any
    this.systemInfoService = null as any
    this.idleDetectionService = null as any

    // Setup IPC handlers once during construction
    this.setupIpcHandlers()
    
    this.initializeApp()
  }

  private initializeMonitoringServices(): void {
    // Initialize memory-heavy services only when needed
    if (!this.screenshotService) {
      this.screenshotService = new ScreenshotService(this.apiService, this.store)
    }
    if (!this.activityMonitorService) {
      this.activityMonitorService = new ActivityMonitorService(this.apiService, this.store)
    }
    if (!this.systemInfoService) {
      this.systemInfoService = new SystemInfoService(this.apiService)
    }
    if (!this.idleDetectionService) {
      this.idleDetectionService = new IdleDetectionService(this.apiService, this.systemInfoService)
    }
  }

  private setupIpcHandlers(): void {
    // Authentication handlers
    ipcMain.handle('auth:login', async (_event, credentials) => {
      try {
        Logger.log('IPC Handler: Received login request for:', credentials.email)
        const result = await this.authService.login(credentials)
        
        Logger.log('IPC Handler: AuthService result:', result)
        
        if (result.success) {
          // Store credentials for auto-login
          await this.secureCredentialService.storeCredentials(credentials.email, credentials.password)
          
          // Initialize monitoring services after login (but don't start them)
          this.initializeMonitoringServices()
          
          // Update app whitelist after login
          if (this.activityMonitorService) {
            try {
              await this.activityMonitorService.updateAppWhitelist()
              Logger.log('IPC Handler: App whitelist updated successfully after login')
            } catch (error) {
              Logger.error('IPC Handler: Failed to update app whitelist after login:', error)
            }
          }
          
          // Open web portal and hide window
          setTimeout(async () => {
            await shell.openExternal('http://localhost:3001')
            this.mainWindow?.hide()
          }, 500)
          
          Logger.log('IPC Handler: Login successful, returning success')
          return { success: true, data: result.data }
        }
        
        Logger.log('IPC Handler: Login failed, returning error:', result.error)
        return { success: false, error: result.error }
      } catch (error: any) {
        Logger.error('IPC Handler: Login exception:', error)
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('auth:logout', async () => {
      try {
        // Stop monitoring before logout
        this.stopMonitoring()
        
        // Clear credentials and logout
        await this.secureCredentialService.clearStoredCredentials()
        await this.authService.logout()
        
        // Show login window again
        this.mainWindow?.show()
        this.mainWindow?.focus()
        this.loadMinimalHTML()
        
        return { success: true }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('auth:getUser', async () => {
      try {
        const user = this.authService.getCurrentUser()
        return { success: true, data: user }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('auth:isAuthenticated', () => {
      return this.authService.isAuthenticated()
    })

    // System handlers
    ipcMain.handle('system:openExternal', async (_event, url) => {
      await shell.openExternal(url)
      return { success: true }
    })

    ipcMain.handle('app:hide', () => {
      this.mainWindow?.hide()
      return { success: true }
    })

    ipcMain.handle('app:minimize', () => {
      this.mainWindow?.minimize()
      return { success: true }
    })

    ipcMain.handle('app:quit', () => {
      this.isQuitting = true
      app.quit()
      return { success: true }
    })

    ipcMain.handle('app:restart', () => {
      app.relaunch()
      app.exit(0)
      return { success: true }
    })

    // Settings handlers
    ipcMain.handle('settings:get', () => {
      return this.store.get('settings')
    })

    ipcMain.handle('settings:set', (_event, settings) => {
      this.store.set('settings', settings)
      return { success: true }
    })

    // Credentials handlers
    ipcMain.handle('credentials:getSaved', async () => {
      try {
        const saved = await this.secureCredentialService.getSavedCredentials()
        return { success: true, data: saved }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    // Enhanced Screenshot handlers
    ipcMain.handle('screenshot:take', async () => {
      try {
        if (!this.screenshotService) {
          this.initializeMonitoringServices()
        }
        return await this.screenshotService.captureAndUpload()
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('screenshot:getHistory', async (_event, params) => {
      try {
        if (!this.screenshotService) {
          this.initializeMonitoringServices()
        }
        return await this.screenshotService.getScreenshotHistory(params)
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('screenshot:getStatus', async () => {
      try {
        if (!this.screenshotService) {
          return { success: true, data: { active: false, nextCapture: null } }
        }
        return await this.screenshotService.getStatus()
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('screenshot:getStats', async () => {
      try {
        if (!this.screenshotService) {
          return { success: true, data: { total: 0, uploaded: 0, failed: 0 } }
        }
        return await this.screenshotService.getStats()
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('screenshot:delete', async (_event, id) => {
      try {
        if (!this.screenshotService) {
          this.initializeMonitoringServices()
        }
        return await this.screenshotService.deleteScreenshot(id)
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('screenshot:open', async (_event, path) => {
      try {
        await shell.openPath(path)
        return { success: true }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('screenshot:retryUpload', async (_event, id) => {
      try {
        if (!this.screenshotService) {
          this.initializeMonitoringServices()
        }
        return await this.screenshotService.retryUpload(id)
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    // Activity monitoring handlers
    ipcMain.handle('activity:start', async () => {
      try {
        if (!this.activityMonitorService) {
          this.initializeMonitoringServices()
        }
        await this.activityMonitorService.startMonitoring()
        return { success: true }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('activity:stop', () => {
      try {
        if (this.activityMonitorService) {
          this.activityMonitorService.stopMonitoring()
        }
        return { success: true }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('activity:getStats', async (_event, date) => {
      try {
        if (!this.activityMonitorService) {
          this.initializeMonitoringServices()
        }
        return await this.activityMonitorService.getActivityStats(date)
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('activity:getHistory', async (_event, date) => {
      try {
        if (!this.activityMonitorService) {
          this.initializeMonitoringServices()
        }
        return await this.activityMonitorService.getActivityHistory(date)
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('activity:getAppUsage', async (_event, date) => {
      try {
        if (!this.activityMonitorService) {
          this.initializeMonitoringServices()
        }
        return await this.activityMonitorService.getAppUsage(date)
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('activity:getStatus', async () => {
      try {
        if (!this.activityMonitorService) {
          return { success: true, data: { active: false } }
        }
        return await this.activityMonitorService.getStatus()
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('activity:clearData', async (_event, date) => {
      try {
        if (!this.activityMonitorService) {
          this.initializeMonitoringServices()
        }
        return await this.activityMonitorService.clearData(date)
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('activity:exportData', async (_event, date) => {
      try {
        if (!this.activityMonitorService) {
          this.initializeMonitoringServices()
        }
        return await this.activityMonitorService.exportData(date)
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    // Enhanced Settings handlers
    ipcMain.handle('settings:export', async () => {
      try {
        const settings = this.store.get()
        const exportData = {
          settings: settings.settings || {},
          exported: new Date().toISOString(),
          version: '1.0.0'
        }
        
        const result = await dialog.showSaveDialog(this.mainWindow!, {
          title: 'Export Settings',
          defaultPath: `reko-hr-settings-${new Date().toISOString().split('T')[0]}.json`,
          filters: [
            { name: 'JSON files', extensions: ['json'] },
            { name: 'All files', extensions: ['*'] }
          ]
        })

        if (!result.canceled && result.filePath) {
          const fs = await import('fs/promises')
          await fs.writeFile(result.filePath, JSON.stringify(exportData, null, 2))
          return { success: true, data: { path: result.filePath } }
        }
        
        return { success: false, error: 'Export cancelled' }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('settings:import', async () => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow!, {
          title: 'Import Settings',
          filters: [
            { name: 'JSON files', extensions: ['json'] },
            { name: 'All files', extensions: ['*'] }
          ],
          properties: ['openFile']
        })

        if (!result.canceled && result.filePaths.length > 0) {
          const fs = await import('fs/promises')
          const data = await fs.readFile(result.filePaths[0], 'utf8')
          const importData = JSON.parse(data)
          
          if (importData.settings) {
            this.store.set('settings', importData.settings)
            return { success: true, data: importData.settings }
          }
          
          return { success: false, error: 'Invalid settings file format' }
        }
        
        return { success: false, error: 'Import cancelled' }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    // System info handlers
    ipcMain.handle('system:getInfo', async () => {
      try {
        if (!this.systemInfoService) {
          this.initializeMonitoringServices()
        }
        const systemStats = await this.systemInfoService.getSystemStats()
        return { success: true, data: systemStats }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    // Location handlers
    ipcMain.handle('location:getCurrentPosition', async () => {
      try {
        // Note: Electron doesn't have built-in geolocation, would need external API
        return { success: false, error: 'Geolocation not available in desktop app' }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    // API Communication handlers (proxy to ApiService)
    ipcMain.handle('api:get', async (_event, url) => {
      try {
        return await this.apiService.get(url)
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('api:post', async (_event, url, data) => {
      try {
        return await this.apiService.post(url, data)
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('api:put', async (_event, url, data) => {
      try {
        return await this.apiService.put(url, data)
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('api:delete', async (_event, url) => {
      try {
        return await this.apiService.delete(url)
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('api:ping', async () => {
      try {
        return await this.apiService.ping()
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    // Statistics handlers
    ipcMain.handle('statistics:exportReport', async (_event, period) => {
      try {
        const exportData = {
          period,
          exported: new Date().toISOString(),
          screenshots: this.screenshotService ? await this.screenshotService.getStats() : { total: 0 },
          activity: this.activityMonitorService ? await this.activityMonitorService.getActivityStats() : { activeTime: 0 },
          system: this.systemInfoService ? await this.systemInfoService.getSystemHealthSummary() : { processes: 0 }
        }
        
        const result = await dialog.showSaveDialog(this.mainWindow!, {
          title: 'Export Report',
          defaultPath: `reko-hr-report-${period}-${new Date().toISOString().split('T')[0]}.json`,
          filters: [
            { name: 'JSON files', extensions: ['json'] },
            { name: 'All files', extensions: ['*'] }
          ]
        })

        if (!result.canceled && result.filePath) {
          const fs = await import('fs/promises')
          await fs.writeFile(result.filePath, JSON.stringify(exportData, null, 2))
          return { success: true, data: { path: result.filePath, data: exportData } }
        }
        
        return { success: false, error: 'Export cancelled' }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    // Logging handlers
    ipcMain.handle('logger:error', (_event, message, data) => {
      Logger.error(message, data)
      return { success: true }
    })

    ipcMain.handle('logger:warn', (_event, message, data) => {
      Logger.warn(message, data)
      return { success: true }
    })

    ipcMain.handle('logger:info', (_event, message, data) => {
      Logger.log(message, data)
      return { success: true }
    })

    // Enhanced App control handlers
    ipcMain.handle('app:openSettings', () => {
      // For now, just show the main window - could open settings page in future
      this.mainWindow?.show()
      this.mainWindow?.focus()
      return { success: true }
    })

    ipcMain.handle('app:openLogFolder', async () => {
      try {
        const logPath = Logger.getLogFolder()
        await shell.openPath(logPath)
        return { success: true, data: { path: logPath } }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('app:openDataFolder', async () => {
      try {
        const dataPath = this.store.path
        const folderPath = dataPath.substring(0, dataPath.lastIndexOf('/'))
        await shell.openPath(folderPath)
        return { success: true, data: { path: folderPath } }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('app:checkForUpdates', async () => {
      try {
        if (is.dev) {
          return { success: false, error: 'Updates not available in development mode' }
        }
        
        const result = await autoUpdater.checkForUpdates()
        return { success: true, data: result }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })
  }

  private async handleAppStartup(): Promise<void> {
    try {
      Logger.log('Handling app startup...')
      
      // Get startup configuration
      const startupConfig = this.autoLaunchService.handleAppStartup()
      
      // If launched at startup, check if auto-login is enabled and try auto-login
      if (startupConfig.shouldAutoLogin) {
        const settings = this.store.get('settings') || {}
        const isAutoLoginEnabled = settings.autoLogin !== false // Default to true
        
        if (isAutoLoginEnabled) {
          Logger.log('App was launched at startup, attempting auto-login...')
          
          // Add startup delay if configured
          if (startupConfig.startupDelay > 0) {
            Logger.log(`Waiting ${startupConfig.startupDelay} seconds before auto-login...`)
            await new Promise(resolve => setTimeout(resolve, startupConfig.startupDelay * 1000))
          }

          // Attempt auto-login
          const autoLoginResult = await this.secureCredentialService.attemptAutoLogin()
          
          if (autoLoginResult.success && autoLoginResult.user) {
            Logger.log('Auto-login successful for:', autoLoginResult.user.email)
            
            // Update auth service with the user data
            // Note: You might need to call the auth service to set the user data
            
            // Open web portal instead of starting monitoring
            setTimeout(async () => {
              await shell.openExternal('http://localhost:3001')
              this.mainWindow?.hide()
            }, 2000) // Small delay to ensure everything is initialized
          } else if (autoLoginResult.needsReauth) {
            Logger.log('Auto-login requires reauthentication')
            this.showNotification('Authentication Required', 'Please log in to continue monitoring')
          } else {
            Logger.log('Auto-login failed:', autoLoginResult.error)
          }
        } else {
          Logger.log('Auto-login is disabled by user, showing login window')
        }
      }

      // Handle window visibility based on startup configuration
      if (startupConfig.shouldMinimizeToTray && this.mainWindow) {
        Logger.log('Minimizing to tray on startup')
        this.mainWindow.hide()
      }

      // Setup auto-launch if not already configured
      const autoLaunchEnabled = await this.autoLaunchService.isAutoLaunchEnabled()
      if (!autoLaunchEnabled && app.isPackaged) {
        Logger.log('Setting up auto-launch for first time')
        await this.autoLaunchService.enableAutoLaunch()
      }

    } catch (error) {
      Logger.error('Error during app startup:', error)
    }
  }

  private async initializeApp(): Promise<void> {
    // Handle app ready
    app.whenReady().then(async () => {
      electronApp.setAppUserModelId('com.nova-hr.desktop-agent')
      
      this.createMainWindow()
      this.createTray()
      this.setupAutoUpdater()
      this.setupGlobalShortcuts()
      
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) this.createMainWindow()
      })

      // Handle app startup logic
      await this.handleAppStartup()

      // DO NOT start monitoring automatically - only after login
    })

    // Handle app close
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.isQuitting = true
        app.quit()
      }
    })

    app.on('before-quit', (event) => {
      if (!this.isQuitting) {
        event.preventDefault()
        this.mainWindow?.hide()
      } else {
        this.stopMonitoring()
      }
    })

    // Security: prevent navigation to external URLs
    app.on('web-contents-created', (_, contents) => {
      contents.on('will-navigate', (navigationEvent, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl)
        if (parsedUrl.origin !== 'http://localhost:3001' && parsedUrl.origin !== 'https://reko-hr.com') {
          navigationEvent.preventDefault()
        }
      })

      contents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
      })
    })
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 350,
      height: 450,
      minWidth: 350,
      minHeight: 450,
      maxWidth: 350,
      maxHeight: 450,
      show: false,
      autoHideMenuBar: true,
      icon: icon,
      titleBarStyle: 'default',
      resizable: false,
      frame: true,
      webPreferences: {
        preload: join(__dirname, 'preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false, // Disable for data URLs
        backgroundThrottling: false,
        enableRemoteModule: false,
        allowRunningInsecureContent: false
      }
    })

    this.mainWindow.on('ready-to-show', () => {
      this.mainWindow?.show()
      this.mainWindow?.focus()
      
      // Always open DevTools for debugging
      this.mainWindow?.webContents.openDevTools()
    })

    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault()
        this.mainWindow?.hide()
        this.showNotification('Reko HR Agent', 'Application is running in system tray')
      }
    })

    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })

    // Save window bounds on resize/move
    this.mainWindow.on('resize', () => {
      if (this.mainWindow) {
        this.store.set('windowBounds', this.mainWindow.getBounds())
      }
    })

    this.mainWindow.on('move', () => {
      if (this.mainWindow) {
        this.store.set('windowBounds', this.mainWindow.getBounds())
      }
    })

    this.mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // Add error handling for page loading
    this.mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      Logger.error('Failed to load page:', errorCode, errorDescription)
    })

    this.mainWindow.webContents.on('dom-ready', () => {
      Logger.log('DOM is ready')
    })

    // Load the app - always use minimal HTML for reliability
    Logger.log('Loading minimal HTML directly')
    this.loadMinimalHTML()
  }

  private loadMinimalHTML(): void {
    const minimalHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Reko HR Agent</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex; justify-content: center; align-items: center;
          height: 100vh; overflow: hidden;
        }
        .login-container { 
          background: white; border-radius: 8px; padding: 20px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1); width: 300px; text-align: center;
          margin: auto;
        }
        .logo { width: 50px; height: 50px; margin: 0 auto 15px; background: #667eea; border-radius: 50%; }
        h1 { color: #333; margin-bottom: 20px; font-size: 18px; }
        .form-group { margin-bottom: 15px; text-align: left; }
        label { display: block; margin-bottom: 5px; color: #555; font-weight: 500; font-size: 13px; }
        input { width: 100%; padding: 8px; border: 1px solid #e1e5e9; border-radius: 4px; font-size: 13px; }
        input:focus { outline: none; border-color: #667eea; }
        button { 
          width: 100%; padding: 10px; background: #667eea; color: white; border: none;
          border-radius: 4px; font-size: 14px; cursor: pointer; margin-top: 8px;
        }
        button:hover { background: #5a67d8; }
        button:disabled { background: #a0aec0; cursor: not-allowed; }
        .error { color: #e53e3e; font-size: 12px; margin-top: 8px; }
        .loading { display: none; font-size: 12px; color: #667eea; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div class="login-container">
        <div class="logo"></div>
        <h1>Reko HR Agent</h1>
        <form id="loginForm">
          <div class="form-group">
            <label>이메일</label>
            <input type="email" id="email" value="admin@reko-hr.com" required>
          </div>
          <div class="form-group">
            <label>패스워드</label>
            <input type="password" id="password" value="admin123" required>
          </div>
          <button type="submit" id="loginBtn">로그인</button>
          <div class="error" id="errorMsg"></div>
          <div class="loading" id="loadingMsg">로그인 중...</div>
        </form>
      </div>
      <script>
        // Load saved credentials on startup
        async function loadSavedCredentials() {
          try {
            const result = await window.electronAPI.invoke('credentials:getSaved');
            if (result.success && result.data && result.data.email) {
              document.getElementById('email').value = result.data.email;
              // Development logging only
            } else {
              // Development logging only
            }
          } catch (error) {
            console.error('Error loading credentials:', error);
          }
        }
        
        // Load credentials when page loads
        document.addEventListener('DOMContentLoaded', loadSavedCredentials);
        
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('loginBtn');
          const error = document.getElementById('errorMsg');
          const loading = document.getElementById('loadingMsg');
          
          btn.disabled = true;
          loading.style.display = 'block';
          error.textContent = '';
          
          const credentials = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
          };
          
          try {
            // Use Electron API for login
            // Development logging disabled in production
            const result = await window.electronAPI.auth.login(credentials);
            // Development logging disabled in production
            
            if (result.success) {
              // Login successful - web portal will open automatically from main process
              // Hide window will be handled automatically
              document.querySelector('.login-container').innerHTML = \`
                <div class="logo"></div>
                <h1>로그인 성공!</h1>
                <p style="color: #667eea; font-size: 14px;">웹 포털이 열리고 있습니다...</p>
              \`;
            } else {
              Logger.error('Login failed:', result.error);
              error.textContent = result.error || '로그인 실패';
            }
          } catch (err) {
            Logger.error('Login error details:', err);
            error.textContent = 'API 서버에 연결할 수 없습니다';
          }
          
          btn.disabled = false;
          loading.style.display = 'none';
        });
      </script>
    </body>
    </html>`;

    this.mainWindow?.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(minimalHTML));
  }

  private createTray(): void {
    // Use the main app icon for tray
    let trayIcon: Electron.NativeImage
    
    if (!icon.isEmpty()) {
      // Resize the main icon for tray use
      trayIcon = icon.resize({ width: 16, height: 16 })
    } else {
      // Fallback: try to load tray icon directly
      const trayIconPaths = [
        join(__dirname, '../logo/logo.png'),
        join(__dirname, '../src/logo/logo.png'),
        join(__dirname, '../../logo/logo.png'),
        join(__dirname, '../../src/logo/logo.png')
      ]
      
      trayIcon = nativeImage.createEmpty()
      for (const trayIconPath of trayIconPaths) {
        try {
          const tempIcon = nativeImage.createFromPath(trayIconPath)
          if (!tempIcon.isEmpty()) {
            trayIcon = tempIcon.resize({ width: 16, height: 16 })
            break
          }
        } catch (error) {
          console.warn('Could not load tray icon from:', trayIconPath)
        }
      }
    }
    
    this.tray = new Tray(trayIcon)

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Reko HR Agent',
        type: 'normal',
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Show',
        type: 'normal',
        click: () => {
          this.mainWindow?.show()
          this.mainWindow?.focus()
        }
      },
      {
        label: 'Open Web Portal',
        type: 'normal',
        click: async () => {
          await shell.openExternal('http://localhost:3001')
        }
      },
      {
        label: 'Toggle DevTools',
        type: 'normal',
        click: () => {
          if (this.mainWindow?.webContents.isDevToolsOpened()) {
            this.mainWindow?.webContents.closeDevTools()
          } else {
            this.mainWindow?.webContents.openDevTools()
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Logout',
        type: 'normal',
        enabled: this.authService.isAuthenticated(),
        click: async () => {
          // Stop monitoring
          await this.stopMonitoring()
          
          // Clear credentials and logout
          await this.secureCredentialService.clearStoredCredentials()
          await this.authService.logout()
          
          // Show login window
          this.mainWindow?.show()
          this.mainWindow?.focus()
          this.loadMinimalHTML()
          
          // Update tray menu
          await this.updateTrayMenu()
        }
      },
      {
        label: 'Quit',
        type: 'normal',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          this.isQuitting = true
          app.quit()
        }
      }
    ])

    this.tray.setToolTip('Reko HR Desktop Agent')
    this.tray.setContextMenu(contextMenu)

    this.tray.on('double-click', () => {
      this.mainWindow?.show()
      this.mainWindow?.focus()
    })
  }

  private setupAutoUpdater(): void {
    if (is.dev) return

    autoUpdater.checkForUpdatesAndNotify()

    autoUpdater.on('update-available', () => {
      dialog.showMessageBox(this.mainWindow!, {
        type: 'info',
        title: 'Update available',
        message: 'A new version is available. It will be downloaded in the background.',
        buttons: ['OK']
      })
    })

    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox(this.mainWindow!, {
        type: 'info',
        title: 'Update ready',
        message: 'Update downloaded. The application will restart to apply the update.',
        buttons: ['Restart Now', 'Later']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
    })
  }


  private setupGlobalShortcuts(): void {
    // Screenshot shortcut
    globalShortcut.register('CommandOrControl+Shift+S', () => {
      this.takeScreenshot()
    })

    // Show/Hide app
    globalShortcut.register('CommandOrControl+Shift+N', () => {
      if (this.mainWindow?.isVisible()) {
        this.mainWindow.hide()
      } else {
        this.mainWindow?.show()
        this.mainWindow?.focus()
      }
    })
  }

  private async _startMonitoring(): Promise<boolean> {
    if (!this.authService.isAuthenticated()) {
      this.showNotification('Authentication Required', 'Please log in to start monitoring')
      return false
    }

    try {
      this.monitoringActive = true
      
      // Initialize monitoring services only when needed
      this.initializeMonitoringServices()
      
      // Start screenshot service
      await this.screenshotService.startPeriodicCapture()
      
      // Start activity monitoring
      await this.activityMonitorService.startMonitoring()

      // Start system info collection (reduced frequency)
      this.systemInfoService.startProcessCollection(20) // Every 20 minutes (reduced)
      this.systemInfoService.startNetworkMonitoring(15)  // Every 15 minutes (reduced)

      // Start idle detection (20 minutes = 1200 seconds, increased)
      this.idleDetectionService.startIdleDetection(1200)

      await this.updateTrayMenu()
      this.showNotification('Monitoring Started', 'Reko HR monitoring is now active')
      
      // Notify renderer
      this.mainWindow?.webContents.send('monitoring:started')
      
      return true
    } catch (error) {
      Logger.error('Failed to start monitoring:', error)
      this.monitoringActive = false
      this.showNotification('Error', 'Failed to start monitoring')
      return false
    }
  }

  private async stopMonitoring(): Promise<void> {
    this.monitoringActive = false
    
    // Stop services
    this.screenshotService.stopPeriodicCapture()
    this.activityMonitorService.stopMonitoring()
    this.systemInfoService.stopAllCollections()
    this.idleDetectionService.stopIdleDetection()

    await this.updateTrayMenu()
    this.showNotification('Monitoring Stopped', 'Reko HR monitoring has been stopped')
    
    // Notify renderer
    this.mainWindow?.webContents.send('monitoring:stopped')
  }

  private async takeScreenshot(): Promise<boolean> {
    try {
      const result = await this.screenshotService.captureAndUpload()
      if (result.success) {
        this.showNotification('Screenshot Taken', 'Screenshot captured and uploaded successfully')
        return true
      } else {
        this.showNotification('Screenshot Failed', result.error || 'Failed to capture screenshot')
        return false
      }
    } catch (error) {
      Logger.error('Screenshot error:', error)
      this.showNotification('Screenshot Error', 'An error occurred while taking screenshot')
      return false
    }
  }

  private async updateTrayMenu(): Promise<void> {
    if (!this.tray) return

    // Get current settings
    const isAutoStartEnabled = await this.autoLaunchService.isAutoLaunchEnabled()
    const settings = this.store.get('settings') || {}
    const isAutoLoginEnabled = settings.autoLogin !== false // Default to true

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Reko HR Agent',
        type: 'normal',
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Show',
        type: 'normal',
        click: () => {
          this.mainWindow?.show()
          this.mainWindow?.focus()
        }
      },
      {
        label: 'Open Web Portal',
        type: 'normal',
        click: async () => {
          await shell.openExternal('http://localhost:3001')
        }
      },
      {
        label: 'Toggle DevTools',
        type: 'normal',
        click: () => {
          if (this.mainWindow?.webContents.isDevToolsOpened()) {
            this.mainWindow?.webContents.closeDevTools()
          } else {
            this.mainWindow?.webContents.openDevTools()
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Settings',
        type: 'submenu',
        submenu: [
          {
            label: 'Auto-start on Windows/Mac startup',
            type: 'checkbox',
            checked: isAutoStartEnabled,
            click: async () => {
              try {
                if (isAutoStartEnabled) {
                  const success = await this.autoLaunchService.disableAutoLaunch()
                  if (success) {
                    this.showNotification('Auto-start Disabled', 'App will no longer start automatically on system startup')
                  } else {
                    this.showNotification('Error', 'Failed to disable auto-start')
                  }
                } else {
                  const success = await this.autoLaunchService.enableAutoLaunch()
                  if (success) {
                    this.showNotification('Auto-start Enabled', 'App will now start automatically on system startup')
                  } else {
                    this.showNotification('Error', 'Failed to enable auto-start')
                  }
                }
                // Update menu after change
                setTimeout(() => this.updateTrayMenu(), 500)
              } catch (error) {
                Logger.error('Auto-start toggle error:', error)
                this.showNotification('Error', 'Failed to change auto-start setting')
              }
            }
          },
          {
            label: 'Auto-login (Remember credentials)',
            type: 'checkbox',
            checked: isAutoLoginEnabled,
            click: () => {
              const newAutoLoginState = !isAutoLoginEnabled
              const currentSettings = this.store.get('settings') || {}
              this.store.set('settings', {
                ...currentSettings,
                autoLogin: newAutoLoginState
              })
              
              if (newAutoLoginState) {
                this.showNotification('Auto-login Enabled', 'App will attempt automatic login on startup')
              } else {
                this.showNotification('Auto-login Disabled', 'You will need to login manually each time')
                // Clear stored credentials when auto-login is disabled
                this.secureCredentialService.clearStoredCredentials()
              }
              
              // Update menu after change
              setTimeout(() => this.updateTrayMenu(), 500)
            }
          }
        ]
      },
      { type: 'separator' },
      {
        label: 'Logout',
        type: 'normal',
        enabled: this.authService.isAuthenticated(),
        click: async () => {
          // Stop monitoring
          await this.stopMonitoring()
          
          // Clear credentials and logout
          await this.secureCredentialService.clearStoredCredentials()
          await this.authService.logout()
          
          // Show login window
          this.mainWindow?.show()
          this.mainWindow?.focus()
          this.loadMinimalHTML()
          
          // Update tray menu
          await this.updateTrayMenu()
        }
      },
      {
        label: 'Quit',
        type: 'normal',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          this.isQuitting = true
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }

  private _applySettings(settings: any): void {
    // Apply screenshot interval
    if (this.monitoringActive) {
      this.screenshotService.updateInterval(settings.screenshotInterval)
    }

    // Apply other settings as needed
    Logger.log('Applied settings:', settings)
  }

  private showNotification(title: string, body: string): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('notification:show', { title, body })
    }
  }
}

// Initialize the desktop agent
new DesktopAgent()

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const mainWindow = windows[0]
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}