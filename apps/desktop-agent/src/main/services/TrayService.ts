import { Tray, Menu, nativeImage, BrowserWindow, Notification } from 'electron'
import { join } from 'path'

export interface TrayMenuItem {
  id: string
  label: string
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio'
  enabled?: boolean
  checked?: boolean
  click?: () => void
  submenu?: TrayMenuItem[]
}

export class TrayService {
  private tray: Tray | null = null
  private mainWindow: BrowserWindow | null = null

  constructor() {
    this.createTray()
  }

  private createTray(): void {
    // Create tray icon
    const iconPath = process.platform === 'darwin' 
      ? join(__dirname, '../../assets/tray-icon-template.png')
      : join(__dirname, '../../assets/tray-icon.png')

    try {
      const trayIcon = nativeImage.createFromPath(iconPath)
      if (trayIcon.isEmpty()) {
        console.warn('Tray icon not found, using default')
        this.tray = new Tray(nativeImage.createEmpty())
      } else {
        this.tray = new Tray(trayIcon.resize({ width: 16, height: 16 }))
      }
    } catch (error) {
      console.error('Failed to create tray icon:', error)
      this.tray = new Tray(nativeImage.createEmpty())
    }

    this.setupTrayMenu()
    this.setupTrayEvents()
  }

  private setupTrayMenu(): void {
    if (!this.tray) return

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Nova HR Desktop Agent',
        type: 'normal',
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Show Application',
        type: 'normal',
        click: () => this.showMainWindow()
      },
      {
        label: 'Monitoring Status',
        type: 'submenu',
        submenu: [
          {
            label: 'Start Monitoring',
            type: 'checkbox',
            id: 'monitoring-toggle',
            checked: false,
            click: (menuItem) => this.toggleMonitoring(menuItem.checked)
          },
          { type: 'separator' },
          {
            label: 'Screenshot Capture',
            type: 'checkbox',
            id: 'screenshot-toggle', 
            checked: true,
            click: (menuItem) => this.toggleScreenshots(menuItem.checked)
          },
          {
            label: 'Activity Tracking',
            type: 'checkbox',
            id: 'activity-toggle',
            checked: true,
            click: (menuItem) => this.toggleActivity(menuItem.checked)
          }
        ]
      },
      { type: 'separator' },
      {
        label: 'Quick Actions',
        type: 'submenu',
        submenu: [
          {
            label: 'Take Screenshot',
            type: 'normal',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: () => this.takeScreenshot()
          },
          {
            label: 'Check In/Out',
            type: 'normal',
            click: () => this.toggleAttendance()
          },
          {
            label: 'View Statistics',
            type: 'normal',
            click: () => this.showStatistics()
          }
        ]
      },
      { type: 'separator' },
      {
        label: 'Settings',
        type: 'normal',
        click: () => this.openSettings()
      },
      {
        label: 'About',
        type: 'normal',
        click: () => this.showAbout()
      },
      { type: 'separator' },
      {
        label: 'Quit',
        type: 'normal',
        accelerator: 'CmdOrCtrl+Q',
        click: () => this.quitApplication()
      }
    ])

    this.tray.setContextMenu(contextMenu)
    this.tray.setToolTip('Nova HR Desktop Agent')
  }

  private setupTrayEvents(): void {
    if (!this.tray) return

    this.tray.on('click', () => {
      // Left click to show/hide main window
      this.toggleMainWindow()
    })

    this.tray.on('right-click', () => {
      // Right click shows context menu (handled automatically)
    })

    this.tray.on('double-click', () => {
      // Double click to show main window
      this.showMainWindow()
    })

    this.tray.on('balloon-click', () => {
      // Balloon notification clicked
      this.showMainWindow()
    })
  }

  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window
  }

  updateMonitoringStatus(isMonitoring: boolean): void {
    if (!this.tray) return

    // Update tray icon based on monitoring status
    const iconPath = isMonitoring
      ? join(__dirname, '../../assets/tray-icon-active.png')
      : join(__dirname, '../../assets/tray-icon.png')

    try {
      const icon = nativeImage.createFromPath(iconPath)
      if (!icon.isEmpty()) {
        this.tray.setImage(icon.resize({ width: 16, height: 16 }))
      }
    } catch (error) {
      console.warn('Failed to update tray icon:', error)
    }

    // Update menu
    this.updateMenuItem('monitoring-toggle', { checked: isMonitoring })
    
    // Update tooltip
    const tooltip = isMonitoring 
      ? 'Nova HR Desktop Agent - Monitoring Active'
      : 'Nova HR Desktop Agent - Monitoring Inactive'
    this.tray.setToolTip(tooltip)
  }

  updateMenuItem(_id: string, _options: { 
    label?: string
    enabled?: boolean
    checked?: boolean 
  }): void {
    if (!this.tray) return

    // Rebuild context menu with updated items
    this.createTray()
  }

  showNotification(title: string, body: string, options: {
    silent?: boolean
    icon?: string
    urgency?: 'low' | 'normal' | 'critical'
    actions?: Array<{ type: "button", text: string }>
  } = {}): void {
    if (!this.tray) return

    try {
      if (Notification.isSupported()) {
        const notification = new Notification({
          title,
          body,
          silent: options.silent || false,
          icon: options.icon,
          urgency: options.urgency || 'normal',
          actions: options.actions || []
        })

        notification.on('click', () => {
          this.showMainWindow()
        })

        notification.show()
      } else if (this.tray.displayBalloon) {
        // Fallback for older systems
        this.tray.displayBalloon({
          title,
          content: body,
          icon: options.icon ? nativeImage.createFromPath(options.icon) : undefined
        })
      }
    } catch (error) {
      console.error('Failed to show notification:', error)
    }
  }

  private showMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore()
      }
      this.mainWindow.show()
      this.mainWindow.focus()
    }
  }

  private toggleMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isVisible() && this.mainWindow.isFocused()) {
        this.mainWindow.hide()
      } else {
        this.showMainWindow()
      }
    }
  }

  private toggleMonitoring(enabled: boolean): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('tray:toggle-monitoring', enabled)
    }
  }

  private toggleScreenshots(enabled: boolean): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('tray:toggle-screenshots', enabled)
    }
  }

  private toggleActivity(enabled: boolean): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('tray:toggle-activity', enabled)
    }
  }

  private takeScreenshot(): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('tray:take-screenshot')
    }
  }

  private toggleAttendance(): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('tray:toggle-attendance')
    }
  }

  private showStatistics(): void {
    if (this.mainWindow) {
      this.showMainWindow()
      this.mainWindow.webContents.send('navigate-to', '/statistics')
    }
  }

  private openSettings(): void {
    if (this.mainWindow) {
      this.showMainWindow()
      this.mainWindow.webContents.send('navigate-to', '/settings')
    }
  }

  private showAbout(): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('tray:show-about')
    }
  }

  private quitApplication(): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('app:prepare-quit')
    }
    // The main process will handle the actual quit
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }

  // Status updates
  updateConnectionStatus(connected: boolean): void {
    const status = connected ? 'Connected' : 'Disconnected'
    this.updateMenuItem('connection-status', { 
      label: `Status: ${status}`,
      enabled: false 
    })

    if (!connected) {
      this.showNotification(
        'Connection Lost',
        'Lost connection to Nova HR servers. Retrying...',
        { urgency: 'normal' }
      )
    }
  }

  updateUserStatus(user: { name: string; status: string } | null): void {
    if (user) {
      this.updateMenuItem('user-info', {
        label: `${user.name} (${user.status})`,
        enabled: false
      })
    }
  }

  // Productivity notifications
  showProductivityReminder(): void {
    this.showNotification(
      'Productivity Reminder',
      'You\'ve been working for a while. Consider taking a break!',
      { 
        urgency: 'low',
        actions: [
          { type: 'button', text: 'Take Break' },
          { type: 'button', text: 'Continue Working' }
        ]
      }
    )
  }

  showBreakReminder(): void {
    this.showNotification(
      'Break Time Over',
      'Welcome back! Ready to continue your productive work.',
      { urgency: 'low' }
    )
  }

  // Error notifications
  showError(error: string): void {
    this.showNotification(
      'Nova HR Agent Error',
      error,
      { urgency: 'critical' }
    )
  }

  showWarning(warning: string): void {
    this.showNotification(
      'Nova HR Agent Warning',
      warning,
      { urgency: 'normal' }
    )
  }

  showSuccess(message: string): void {
    this.showNotification(
      'Nova HR Agent',
      message,
      { urgency: 'low' }
    )
  }

  // Custom menu updates
  setCustomMenu(items: TrayMenuItem[]): void {
    if (!this.tray) return

    const buildMenuItem = (item: TrayMenuItem): Electron.MenuItemConstructorOptions => {
      const menuItem: Electron.MenuItemConstructorOptions = {
        id: item.id,
        label: item.label,
        type: item.type || 'normal',
        enabled: item.enabled !== false,
        checked: item.checked,
        click: item.click
      }

      if (item.submenu) {
        menuItem.submenu = item.submenu.map(buildMenuItem)
      }

      return menuItem
    }

    const menu = Menu.buildFromTemplate(items.map(buildMenuItem))
    this.tray.setContextMenu(menu)
  }

  // Get tray bounds (useful for positioning windows)
  getTrayBounds(): Electron.Rectangle | undefined {
    return this.tray?.getBounds()
  }

  // Check if tray is supported on this platform
  static isSupported(): boolean {
    return true // Tray is supported on Windows
  }
}