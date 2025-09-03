import { screen, desktopCapturer, BrowserWindow } from 'electron'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import Store from 'electron-store'
import sharp from 'sharp'
import { ApiService, ApiResponse } from './ApiService'

export interface ScreenshotOptions {
  quality?: number
  format?: 'png' | 'jpeg'
  scale?: number
  includeAudio?: boolean
}

export interface ScreenshotMetadata {
  timestamp: number
  screenCount: number
  primaryDisplay: {
    width: number
    height: number
    scaleFactor: number
  }
  activeWindow?: {
    title: string
    owner: string
    url?: string
  }
  user: {
    id: string
    email: string
  }
  device: {
    platform: string
    arch: string
    hostname: string
  }
}

export interface ScreenshotResult {
  success: boolean
  filePath?: string
  uploadUrl?: string
  error?: string
  metadata?: ScreenshotMetadata
}

export class ScreenshotService {
  private apiService: ApiService
  private store: Store
  private captureInterval: NodeJS.Timeout | null = null
  private isCapturing = false

  constructor(apiService: ApiService, store: Store) {
    this.apiService = apiService
    this.store = store
  }

  async captureScreenshot(options: ScreenshotOptions = {}): Promise<ScreenshotResult> {
    if (this.isCapturing) {
      return { success: false, error: 'Screenshot capture already in progress' }
    }

    this.isCapturing = true

    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 },
        fetchWindowIcons: false
      })

      if (sources.length === 0) {
        throw new Error('No screen sources available')
      }

      // Use the primary display
      const primarySource = sources[0]
      const image = primarySource.thumbnail

      // Get screenshot metadata
      const metadata = await this.generateMetadata()

      // Convert to buffer with quality settings
      let buffer: Buffer
      const quality = options.quality || this.store.get('settings.uploadQuality', 80)
      
      if (options.format === 'jpeg') {
        buffer = await sharp(image.toPNG())
          .jpeg({ quality })
          .toBuffer()
      } else {
        buffer = await sharp(image.toPNG())
          .png({ quality })
          .toBuffer()
      }

      // Save temporary file
      const tempPath = join(tmpdir(), `screenshot-${Date.now()}.${options.format || 'png'}`)
      await writeFile(tempPath, buffer)

      return {
        success: true,
        filePath: tempPath,
        metadata
      }
    } catch (error: any) {
      console.error('Screenshot capture error:', error)
      return {
        success: false,
        error: error.message || 'Failed to capture screenshot'
      }
    } finally {
      this.isCapturing = false
    }
  }

  async captureAndUpload(options: ScreenshotOptions = {}): Promise<ScreenshotResult> {
    try {
      // Capture screenshot
      const captureResult = await this.captureScreenshot(options)
      
      if (!captureResult.success || !captureResult.filePath) {
        return captureResult
      }

      // Read the file for upload
      const fs = await import('fs/promises')
      const buffer = await fs.readFile(captureResult.filePath)

      // Upload to server
      const uploadResult = await this.apiService.uploadScreenshot(buffer, captureResult.metadata)

      // Clean up temporary file
      try {
        await unlink(captureResult.filePath)
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError)
      }

      if (uploadResult.success) {
        return {
          success: true,
          uploadUrl: uploadResult.data?.url,
          metadata: captureResult.metadata
        }
      } else {
        return {
          success: false,
          error: uploadResult.error || 'Upload failed'
        }
      }
    } catch (error: any) {
      console.error('Capture and upload error:', error)
      return {
        success: false,
        error: error.message || 'Failed to capture and upload screenshot'
      }
    }
  }

  async startPeriodicCapture(): Promise<void> {
    if (this.captureInterval) {
      this.stopPeriodicCapture()
    }

    const settings = this.store.get('settings') as any
    const interval = settings?.screenshotInterval || 300000 // 5 minutes default

    console.log(`Starting periodic screenshot capture every ${interval}ms`)

    // Take initial screenshot
    setTimeout(() => {
      this.captureAndUpload()
    }, 10000) // Wait 10 seconds after start

    // Set up periodic capture
    this.captureInterval = setInterval(async () => {
      try {
        const result = await this.captureAndUpload()
        if (!result.success) {
          console.error('Periodic screenshot failed:', result.error)
        } else {
          console.log('Periodic screenshot captured and uploaded successfully')
        }
      } catch (error) {
        console.error('Periodic screenshot error:', error)
      }
    }, interval)
  }

  stopPeriodicCapture(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval)
      this.captureInterval = null
      console.log('Stopped periodic screenshot capture')
    }
  }

  updateInterval(newInterval: number): void {
    if (this.captureInterval) {
      this.stopPeriodicCapture()
      
      // Update store
      const settings = this.store.get('settings') as any
      this.store.set('settings', { ...settings, screenshotInterval: newInterval })
      
      // Restart with new interval
      this.startPeriodicCapture()
    }
  }

  async getHistory(params: {
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  } = {}): Promise<ApiResponse> {
    return await this.apiService.getScreenshotHistory(params)
  }

  private async generateMetadata(): Promise<ScreenshotMetadata> {
    const displays = screen.getAllDisplays()
    const primaryDisplay = screen.getPrimaryDisplay()
    
    // Get active window info (if available)
    let activeWindow
    try {
      const activeWin = await import('active-win')
      const win = await activeWin.default()
      if (win) {
        activeWindow = {
          title: win.title,
          owner: win.owner.name,
          url: win.url
        }
      }
    } catch (error) {
      console.warn('Could not get active window info:', error)
    }

    // Get user info
    const auth = this.store.get('auth') as any
    const user = {
      id: auth?.user?.id || 'unknown',
      email: auth?.user?.email || 'unknown'
    }

    // Get device info
    const os = await import('os')
    const device = {
      platform: process.platform,
      arch: process.arch,
      hostname: os.hostname()
    }

    return {
      timestamp: Date.now(),
      screenCount: displays.length,
      primaryDisplay: {
        width: primaryDisplay.bounds.width,
        height: primaryDisplay.bounds.height,
        scaleFactor: primaryDisplay.scaleFactor
      },
      activeWindow,
      user,
      device
    }
  }

  // Capture specific window (if needed)
  async captureWindow(windowTitle: string): Promise<ScreenshotResult> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 1920, height: 1080 },
        fetchWindowIcons: false
      })

      const targetWindow = sources.find(source => 
        source.name.toLowerCase().includes(windowTitle.toLowerCase())
      )

      if (!targetWindow) {
        throw new Error(`Window "${windowTitle}" not found`)
      }

      const image = targetWindow.thumbnail
      const buffer = image.toPNG()
      
      const tempPath = join(tmpdir(), `window-screenshot-${Date.now()}.png`)
      await writeFile(tempPath, buffer)

      return {
        success: true,
        filePath: tempPath,
        metadata: await this.generateMetadata()
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to capture window'
      }
    }
  }

  // Get available screens
  getAvailableScreens(): Electron.Display[] {
    return screen.getAllDisplays()
  }

  // Capture specific screen
  async captureScreen(displayId: number): Promise<ScreenshotResult> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 },
        fetchWindowIcons: false
      })

      if (displayId >= sources.length) {
        throw new Error(`Screen ${displayId} not found`)
      }

      const source = sources[displayId]
      const image = source.thumbnail
      const buffer = image.toPNG()
      
      const tempPath = join(tmpdir(), `screen-${displayId}-screenshot-${Date.now()}.png`)
      await writeFile(tempPath, buffer)

      return {
        success: true,
        filePath: tempPath,
        metadata: await this.generateMetadata()
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to capture screen'
      }
    }
  }

  // Check if capture is currently in progress
  isCaptureInProgress(): boolean {
    return this.isCapturing
  }

  // Check if periodic capture is active
  isPeriodicCaptureActive(): boolean {
    return this.captureInterval !== null
  }

  // Get current capture settings
  getCaptureSettings(): {
    interval: number
    quality: number
    format: string
    enabled: boolean
  } {
    const settings = this.store.get('settings') as any
    return {
      interval: settings?.screenshotInterval || 300000,
      quality: settings?.uploadQuality || 80,
      format: settings?.screenshotFormat || 'png',
      enabled: settings?.screenshotEnabled !== false
    }
  }

  // Update capture settings
  updateCaptureSettings(newSettings: Partial<{
    interval: number
    quality: number
    format: string
    enabled: boolean
  }>): void {
    const currentSettings = this.store.get('settings') as any
    const updatedSettings = {
      ...currentSettings,
      screenshotInterval: newSettings.interval ?? currentSettings.screenshotInterval,
      uploadQuality: newSettings.quality ?? currentSettings.uploadQuality,
      screenshotFormat: newSettings.format ?? currentSettings.screenshotFormat,
      screenshotEnabled: newSettings.enabled ?? currentSettings.screenshotEnabled
    }

    this.store.set('settings', updatedSettings)

    // Restart periodic capture if interval changed and it's currently active
    if (newSettings.interval && this.captureInterval) {
      this.updateInterval(newSettings.interval)
    }
  }
}