import { app, BrowserWindow, Menu, Tray, nativeImage, dialog, shell, ipcMain, screen, desktopCapturer, globalShortcut } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { autoUpdater } from 'electron-updater'
import { ScreenshotService } from './services/ScreenshotService'
import { ActivityMonitorService } from './services/ActivityMonitorService'
import { ApiService } from './services/ApiService'
import { AuthService } from './services/AuthService'
import { TrayService } from './services/TrayService'

// Define app icon - create a fallback icon if file doesn't exist
const iconPath = join(__dirname, '../../assets/icon.png')
const icon = nativeImage.createEmpty() // Create empty icon as fallback

class DesktopAgent {
  private mainWindow: BrowserWindow | null = null
  private tray: Tray | null = null
  private store: Store
  private screenshotService: ScreenshotService
  private activityMonitorService: ActivityMonitorService
  private apiService: ApiService
  private authService: AuthService
  private trayService: TrayService
  private isQuitting = false
  private monitoringActive = false

  constructor() {
    this.store = new Store({
      defaults: {
        windowBounds: { width: 1200, height: 800 },
        settings: {
          screenshotInterval: 300000, // 5 minutes
          activityTracking: true,
          startMinimized: false,
          autoStart: false,
          uploadQuality: 80
        },
        auth: {
          token: null,
          refreshToken: null,
          user: null
        }
      }
    })

    // Initialize services
    this.apiService = new ApiService(this.store)
    this.authService = new AuthService(this.apiService, this.store)
    this.screenshotService = new ScreenshotService(this.apiService, this.store)
    this.activityMonitorService = new ActivityMonitorService(this.apiService, this.store)
    this.trayService = new TrayService()

    this.initializeApp()
  }

  private async initializeApp(): Promise<void> {
    // Handle app ready
    app.whenReady().then(() => {
      electronApp.setAppUserModelId('com.nova-hr.desktop-agent')
      
      this.createMainWindow()
      this.createTray()
      this.setupAutoUpdater()
      this.setupIpcHandlers()
      this.setupGlobalShortcuts()
      
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) this.createMainWindow()
      })

      // Start monitoring if user is authenticated
      if (this.authService.isAuthenticated()) {
        this.startMonitoring()
      }
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
        if (parsedUrl.origin !== 'http://localhost:3001' && parsedUrl.origin !== 'https://nova-hr.com') {
          navigationEvent.preventDefault()
        }
      })

      contents.on('new-window', (navigationEvent, navigationUrl) => {
        navigationEvent.preventDefault()
        shell.openExternal(navigationUrl)
      })
    })
  }

  private createMainWindow(): void {
    const { width, height } = this.store.get('windowBounds', { width: 1200, height: 800 }) as { width: number, height: number }

    this.mainWindow = new BrowserWindow({
      width,
      height,
      minWidth: 900,
      minHeight: 600,
      show: false,
      autoHideMenuBar: true,
      icon: icon,
      titleBarStyle: 'default',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        enableRemoteModule: false,
        nodeIntegration: false,
        webSecurity: true
      }
    })

    this.mainWindow.on('ready-to-show', () => {
      const settings = this.store.get('settings') as any
      if (!settings?.startMinimized) {
        this.mainWindow?.show()
      }
    })

    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault()
        this.mainWindow?.hide()
        this.showNotification('Nova HR Agent', 'Application is running in system tray')
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

    // Load the app
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

  private createTray(): void {
    const trayIcon = nativeImage.createFromPath(join(__dirname, '../../assets/tray-icon.png'))
    this.tray = new Tray(trayIcon.resize({ width: 16, height: 16 }))

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Nova HR Agent',
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
        label: 'Start Monitoring',
        type: 'checkbox',
        checked: this.monitoringActive,
        click: (menuItem) => {
          if (menuItem.checked) {
            this.startMonitoring()
          } else {
            this.stopMonitoring()
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Take Screenshot',
        type: 'normal',
        click: () => {
          this.takeScreenshot()
        }
      },
      {
        label: 'Settings',
        type: 'normal',
        click: () => {
          this.mainWindow?.show()
          this.mainWindow?.webContents.send('navigate-to', '/settings')
        }
      },
      { type: 'separator' },
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

    this.tray.setToolTip('Nova HR Desktop Agent')
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

  private setupIpcHandlers(): void {
    // Authentication
    ipcMain.handle('auth:login', async (_, credentials) => {
      return await this.authService.login(credentials)
    })

    ipcMain.handle('auth:logout', async () => {
      this.stopMonitoring()
      return await this.authService.logout()
    })

    ipcMain.handle('auth:getUser', async () => {
      return this.authService.getCurrentUser()
    })

    ipcMain.handle('auth:isAuthenticated', () => {
      return this.authService.isAuthenticated()
    })

    // Screenshots
    ipcMain.handle('screenshot:take', async () => {
      return await this.takeScreenshot()
    })

    ipcMain.handle('screenshot:getHistory', async (_, params) => {
      return await this.screenshotService.getHistory(params)
    })

    // Activity Monitoring
    ipcMain.handle('activity:start', async () => {
      return this.startMonitoring()
    })

    ipcMain.handle('activity:stop', () => {
      this.stopMonitoring()
    })

    ipcMain.handle('activity:getStats', async () => {
      return await this.activityMonitorService.getStats()
    })

    // Settings
    ipcMain.handle('settings:get', () => {
      return this.store.get('settings')
    })

    ipcMain.handle('settings:set', (_, settings) => {
      this.store.set('settings', settings)
      this.applySettings(settings)
    })

    // System
    ipcMain.handle('system:getInfo', () => {
      return {
        platform: process.platform,
        arch: process.arch,
        version: app.getVersion(),
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node
      }
    })

    ipcMain.handle('system:openExternal', (_, url) => {
      shell.openExternal(url)
    })

    // App controls
    ipcMain.handle('app:minimize', () => {
      this.mainWindow?.minimize()
    })

    ipcMain.handle('app:hide', () => {
      this.mainWindow?.hide()
    })

    ipcMain.handle('app:quit', () => {
      this.isQuitting = true
      app.quit()
    })

    ipcMain.handle('app:restart', () => {
      app.relaunch()
      app.exit(0)
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

  private async startMonitoring(): Promise<boolean> {
    if (!this.authService.isAuthenticated()) {
      this.showNotification('Authentication Required', 'Please log in to start monitoring')
      return false
    }

    try {
      this.monitoringActive = true
      
      // Start screenshot service
      await this.screenshotService.startPeriodicCapture()
      
      // Start activity monitoring
      await this.activityMonitorService.startMonitoring()

      this.updateTrayMenu()
      this.showNotification('Monitoring Started', 'Nova HR monitoring is now active')
      
      // Notify renderer
      this.mainWindow?.webContents.send('monitoring:started')
      
      return true
    } catch (error) {
      console.error('Failed to start monitoring:', error)
      this.monitoringActive = false
      this.showNotification('Error', 'Failed to start monitoring')
      return false
    }
  }

  private stopMonitoring(): void {
    this.monitoringActive = false
    
    // Stop services
    this.screenshotService.stopPeriodicCapture()
    this.activityMonitorService.stopMonitoring()

    this.updateTrayMenu()
    this.showNotification('Monitoring Stopped', 'Nova HR monitoring has been stopped')
    
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
      console.error('Screenshot error:', error)
      this.showNotification('Screenshot Error', 'An error occurred while taking screenshot')
      return false
    }
  }

  private updateTrayMenu(): void {
    if (!this.tray) return

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Nova HR Agent',
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
        label: 'Start Monitoring',
        type: 'checkbox',
        checked: this.monitoringActive,
        click: (menuItem) => {
          if (menuItem.checked) {
            this.startMonitoring()
          } else {
            this.stopMonitoring()
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Take Screenshot',
        type: 'normal',
        click: () => {
          this.takeScreenshot()
        }
      },
      {
        label: 'Settings',
        type: 'normal',
        click: () => {
          this.mainWindow?.show()
          this.mainWindow?.webContents.send('navigate-to', '/settings')
        }
      },
      { type: 'separator' },
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

  private applySettings(settings: any): void {
    // Apply screenshot interval
    if (this.monitoringActive) {
      this.screenshotService.updateInterval(settings.screenshotInterval)
    }

    // Apply other settings as needed
    console.log('Applied settings:', settings)
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