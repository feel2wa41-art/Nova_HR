import { app } from 'electron'
import * as path from 'path'
const AutoLaunch = require('auto-launch')

export interface AutoLaunchSettings {
  enabled: boolean
  openAsHidden: boolean
  openAtLogin: boolean
  delay?: number // seconds to wait before starting
}

export class AutoLaunchService {
  private autoLauncher: any
  private settings: AutoLaunchSettings

  constructor() {
    this.settings = {
      enabled: false,
      openAsHidden: true,
      openAtLogin: true,
      delay: 5
    }

    // Initialize auto launcher based on platform
    this.initializeAutoLauncher()
  }

  private initializeAutoLauncher(): void {
    try {
      // Cross-platform auto-launch setup
      this.autoLauncher = new AutoLaunch({
        name: 'Nova HR Desktop Agent',
        path: this.getExecutablePath(),
        isHidden: this.settings.openAsHidden,
        mac: {
          useLaunchAgent: true,
        },
        linux: {
          name: 'nova-hr-agent',
          path: this.getExecutablePath(),
        }
      })

      console.log('Auto-launcher initialized for platform:', process.platform)
    } catch (error) {
      console.error('Failed to initialize auto-launcher:', error)
    }
  }

  private getExecutablePath(): string {
    if (app.isPackaged) {
      // Production: use the actual executable path
      return process.execPath
    } else {
      // Development: use npm start command
      return process.execPath
    }
  }

  // Enable auto-launch on system startup
  async enableAutoLaunch(): Promise<boolean> {
    try {
      const isEnabled = await this.isAutoLaunchEnabled()
      
      if (!isEnabled) {
        if (process.platform === 'win32') {
          // Windows: Use Electron's built-in method
          app.setLoginItemSettings({
            openAtLogin: true,
            openAsHidden: this.settings.openAsHidden,
            path: this.getExecutablePath(),
            args: this.settings.openAsHidden ? ['--hidden'] : []
          })
        } else {
          // macOS and Linux: Use auto-launch library
          await this.autoLauncher.enable()
        }

        this.settings.enabled = true
        console.log('Auto-launch enabled')
        return true
      }

      return true
    } catch (error) {
      console.error('Failed to enable auto-launch:', error)
      return false
    }
  }

  // Disable auto-launch
  async disableAutoLaunch(): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        // Windows: Use Electron's built-in method
        app.setLoginItemSettings({
          openAtLogin: false
        })
      } else {
        // macOS and Linux: Use auto-launch library
        await this.autoLauncher.disable()
      }

      this.settings.enabled = false
      console.log('Auto-launch disabled')
      return true
    } catch (error) {
      console.error('Failed to disable auto-launch:', error)
      return false
    }
  }

  // Check if auto-launch is currently enabled
  async isAutoLaunchEnabled(): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        // Windows: Use Electron's built-in method
        const settings = app.getLoginItemSettings()
        return settings.openAtLogin
      } else {
        // macOS and Linux: Use auto-launch library
        return await this.autoLauncher.isEnabled()
      }
    } catch (error) {
      console.error('Failed to check auto-launch status:', error)
      return false
    }
  }

  // Update auto-launch settings
  async updateSettings(newSettings: Partial<AutoLaunchSettings>): Promise<boolean> {
    try {
      this.settings = { ...this.settings, ...newSettings }

      // Re-initialize if path or name changed
      this.initializeAutoLauncher()

      // Apply the updated settings
      if (this.settings.enabled) {
        return await this.enableAutoLaunch()
      } else {
        return await this.disableAutoLaunch()
      }
    } catch (error) {
      console.error('Failed to update auto-launch settings:', error)
      return false
    }
  }

  // Get current settings
  getSettings(): AutoLaunchSettings {
    return { ...this.settings }
  }

  // Check if app was launched at startup
  wasLaunchedAtStartup(): boolean {
    // Check command line arguments for startup indicators
    const args = process.argv
    return args.includes('--hidden') || 
           args.includes('--startup') || 
           app.getLoginItemSettings().wasOpenedAtLogin
  }

  // Set up auto-launch for development
  async setupDevelopmentAutoLaunch(): Promise<boolean> {
    if (!app.isPackaged) {
      console.log('Development mode: Auto-launch setup skipped')
      return true
    }

    return await this.enableAutoLaunch()
  }

  // Handle app startup logic
  handleAppStartup(): {
    shouldMinimizeToTray: boolean
    shouldAutoLogin: boolean
    startupDelay: number
  } {
    const wasLaunchedAtStartup = this.wasLaunchedAtStartup()
    
    return {
      shouldMinimizeToTray: wasLaunchedAtStartup && this.settings.openAsHidden,
      shouldAutoLogin: wasLaunchedAtStartup,
      startupDelay: this.settings.delay || 0
    }
  }

  // Platform-specific auto-launch info
  getAutoLaunchInfo(): {
    platform: string
    method: 'electron' | 'auto-launch' | 'manual'
    executablePath: string
    isSupported: boolean
  } {
    const isSupported = ['win32', 'darwin', 'linux'].includes(process.platform)
    const method = process.platform === 'win32' ? 'electron' : 'auto-launch'

    return {
      platform: process.platform,
      method,
      executablePath: this.getExecutablePath(),
      isSupported
    }
  }

  // Create desktop shortcut (Windows/Linux)
  async createDesktopShortcut(): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        // Windows: Could implement using shell commands or external library
        console.log('Desktop shortcut creation not implemented for Windows')
        return false
      } else if (process.platform === 'linux') {
        // Linux: Create .desktop file
        const os = require('os')
        const fs = require('fs')
        
        const desktopPath = path.join(os.homedir(), 'Desktop', 'Nova HR Agent.desktop')
        const desktopEntry = `[Desktop Entry]
Type=Application
Name=Nova HR Desktop Agent
Comment=Employee monitoring and productivity tracking
Exec=${this.getExecutablePath()}
Icon=${path.join(__dirname, '../../../assets/icon.png')}
Terminal=false
Categories=Office;Productivity;
StartupNotify=true
`

        fs.writeFileSync(desktopPath, desktopEntry)
        console.log('Desktop shortcut created:', desktopPath)
        return true
      }

      return false
    } catch (error) {
      console.error('Failed to create desktop shortcut:', error)
      return false
    }
  }

  // Remove desktop shortcut
  async removeDesktopShortcut(): Promise<boolean> {
    try {
      if (process.platform === 'linux') {
        const os = require('os')
        const fs = require('fs')
        
        const desktopPath = path.join(os.homedir(), 'Desktop', 'Nova HR Agent.desktop')
        
        if (fs.existsSync(desktopPath)) {
          fs.unlinkSync(desktopPath)
          console.log('Desktop shortcut removed:', desktopPath)
          return true
        }
      }

      return false
    } catch (error) {
      console.error('Failed to remove desktop shortcut:', error)
      return false
    }
  }

  // Get startup command with arguments
  getStartupCommand(): string {
    const execPath = this.getExecutablePath()
    const args = this.settings.openAsHidden ? ['--hidden'] : []
    
    return `"${execPath}" ${args.join(' ')}`
  }

  // Test auto-launch functionality
  async testAutoLaunch(): Promise<{
    isEnabled: boolean
    canEnable: boolean
    canDisable: boolean
    platform: string
    error?: string
  }> {
    try {
      const isEnabled = await this.isAutoLaunchEnabled()
      
      // Test enable/disable
      let canEnable = false
      let canDisable = false
      
      if (!isEnabled) {
        canEnable = await this.enableAutoLaunch()
        if (canEnable) {
          canDisable = await this.disableAutoLaunch()
        }
      } else {
        canDisable = await this.disableAutoLaunch()
        if (canDisable) {
          canEnable = await this.enableAutoLaunch()
        }
      }

      return {
        isEnabled,
        canEnable,
        canDisable,
        platform: process.platform
      }
    } catch (error: any) {
      return {
        isEnabled: false,
        canEnable: false,
        canDisable: false,
        platform: process.platform,
        error: error.message
      }
    }
  }
}