import { contextBridge, ipcRenderer } from 'electron'

// Types for the exposed API
interface ElectronAPI {
  // Authentication
  auth: {
    login: (credentials: { email: string; password: string }) => Promise<any>
    logout: () => Promise<any>
    getUser: () => Promise<any>
    isAuthenticated: () => Promise<boolean>
  }

  // Screenshots
  screenshot: {
    take: () => Promise<any>
    getHistory: (params?: any) => Promise<any>
    getStatus: () => Promise<any>
    getStats: () => Promise<any>
    delete: (id: string) => Promise<any>
    open: (path: string) => Promise<any>
    retryUpload: (id: string) => Promise<any>
  }

  // Activity Monitoring
  activity: {
    start: () => Promise<any>
    stop: () => void
    getStats: (date?: string) => Promise<any>
    getHistory: (date: string) => Promise<any>
    getAppUsage: (date: string) => Promise<any>
    getStatus: () => Promise<any>
    clearData: (date: string) => Promise<any>
    exportData: (date: string) => Promise<any>
  }

  // Settings
  settings: {
    get: () => any
    set: (settings: any) => void
    export: () => Promise<any>
    import: () => Promise<any>
  }

  // System
  system: {
    getInfo: () => any
    openExternal: (url: string) => void
  }

  // Location
  location: {
    getCurrentPosition: () => Promise<any>
  }

  // API Communication
  api: {
    get: (url: string) => Promise<any>
    post: (url: string, data?: any) => Promise<any>
    put: (url: string, data?: any) => Promise<any>
    delete: (url: string) => Promise<any>
    ping: () => Promise<any>
  }

  // Statistics
  statistics: {
    exportReport: (period: string) => Promise<any>
  }

  // Logging
  logger: {
    error: (message: string, data?: any) => void
    warn: (message: string, data?: any) => void
    info: (message: string, data?: any) => void
  }

  // App Controls
  app: {
    minimize: () => void
    hide: () => void
    quit: () => void
    restart: () => void
    openSettings: () => void
    openLogFolder: () => Promise<any>
    openDataFolder: () => Promise<any>
    checkForUpdates: () => Promise<any>
  }

  // Event Listeners
  on: (event: string, callback: (...args: any[]) => void) => void
  off: (event: string, callback: (...args: any[]) => void) => void
  removeAllListeners: (event: string) => void

  // IPC Communication
  invoke: (channel: string, ...args: any[]) => Promise<any>
  send: (channel: string, ...args: any[]) => void
}

// Define the API object
const electronAPI: ElectronAPI = {
  // Authentication methods
  auth: {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getUser: () => ipcRenderer.invoke('auth:getUser'),
    isAuthenticated: () => ipcRenderer.invoke('auth:isAuthenticated')
  },

  // Screenshot methods
  screenshot: {
    take: () => ipcRenderer.invoke('screenshot:take'),
    getHistory: (params) => ipcRenderer.invoke('screenshot:getHistory', params),
    getStatus: () => ipcRenderer.invoke('screenshot:getStatus'),
    getStats: () => ipcRenderer.invoke('screenshot:getStats'),
    delete: (id) => ipcRenderer.invoke('screenshot:delete', id),
    open: (path) => ipcRenderer.invoke('screenshot:open', path),
    retryUpload: (id) => ipcRenderer.invoke('screenshot:retryUpload', id)
  },

  // Activity monitoring methods
  activity: {
    start: () => ipcRenderer.invoke('activity:start'),
    stop: () => ipcRenderer.invoke('activity:stop'),
    getStats: (date) => ipcRenderer.invoke('activity:getStats', date),
    getHistory: (date) => ipcRenderer.invoke('activity:getHistory', date),
    getAppUsage: (date) => ipcRenderer.invoke('activity:getAppUsage', date),
    getStatus: () => ipcRenderer.invoke('activity:getStatus'),
    clearData: (date) => ipcRenderer.invoke('activity:clearData', date),
    exportData: (date) => ipcRenderer.invoke('activity:exportData', date)
  },

  // Settings methods
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (settings) => ipcRenderer.invoke('settings:set', settings),
    export: () => ipcRenderer.invoke('settings:export'),
    import: () => ipcRenderer.invoke('settings:import')
  },

  // System methods
  system: {
    getInfo: () => ipcRenderer.invoke('system:getInfo'),
    openExternal: (url) => ipcRenderer.invoke('system:openExternal', url)
  },

  // Location methods
  location: {
    getCurrentPosition: () => ipcRenderer.invoke('location:getCurrentPosition')
  },

  // API Communication methods
  api: {
    get: (url) => ipcRenderer.invoke('api:get', url),
    post: (url, data) => ipcRenderer.invoke('api:post', url, data),
    put: (url, data) => ipcRenderer.invoke('api:put', url, data),
    delete: (url) => ipcRenderer.invoke('api:delete', url),
    ping: () => ipcRenderer.invoke('api:ping')
  },

  // Statistics methods
  statistics: {
    exportReport: (period) => ipcRenderer.invoke('statistics:exportReport', period)
  },

  // Logging methods
  logger: {
    error: (message, data) => ipcRenderer.invoke('logger:error', message, data),
    warn: (message, data) => ipcRenderer.invoke('logger:warn', message, data),
    info: (message, data) => ipcRenderer.invoke('logger:info', message, data),
    log: (message, data) => ipcRenderer.invoke('logger:info', message, data)
  },

  // App control methods
  app: {
    minimize: () => ipcRenderer.invoke('app:minimize'),
    hide: () => ipcRenderer.invoke('app:hide'),
    quit: () => ipcRenderer.invoke('app:quit'),
    restart: () => ipcRenderer.invoke('app:restart'),
    openSettings: () => ipcRenderer.invoke('app:openSettings'),
    openLogFolder: () => ipcRenderer.invoke('app:openLogFolder'),
    openDataFolder: () => ipcRenderer.invoke('app:openDataFolder'),
    checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates')
  },

  // Event listener methods
  on: (event, callback) => {
    ipcRenderer.on(event, (_event, ...args) => callback(...args))
  },

  off: (event, callback) => {
    ipcRenderer.removeListener(event, callback)
  },

  removeAllListeners: (event) => {
    ipcRenderer.removeAllListeners(event)
  },

  // Generic IPC methods
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args)
}

// Safely expose APIs to the renderer process with proper error handling
try {
  if (contextBridge && typeof contextBridge.exposeInMainWorld === 'function') {
    // Expose the main API to the renderer process
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)

    // Expose Logger globally for HTML scripts
    contextBridge.exposeInMainWorld('Logger', {
      error: (message: string, data?: any) => ipcRenderer.invoke('logger:error', message, data),
      warn: (message: string, data?: any) => ipcRenderer.invoke('logger:warn', message, data),
      info: (message: string, data?: any) => ipcRenderer.invoke('logger:info', message, data),
      log: (message: string, data?: any) => ipcRenderer.invoke('logger:info', message, data)
    })

    // Also expose some Node.js process information
    contextBridge.exposeInMainWorld('process', {
      platform: process.platform,
      arch: process.arch,
      versions: process.versions,
      env: {
        NODE_ENV: process.env.NODE_ENV
      }
    })

    // Expose path utilities (safe subset)
    contextBridge.exposeInMainWorld('path', {
      join: (...paths: string[]) => paths.join('/'),
      basename: (path: string) => path.split('/').pop() || path,
      dirname: (path: string) => {
        const parts = path.split('/')
        parts.pop()
        return parts.join('/')
      },
      extname: (path: string) => {
        const parts = path.split('.')
        return parts.length > 1 ? '.' + parts.pop() : ''
      }
    })

    // Additional utilities for the renderer
    contextBridge.exposeInMainWorld('utils', {
      // Format file size
      formatFileSize: (bytes: number) => {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
        if (bytes === 0) return '0 Byte'
        const i = Math.floor(Math.log(bytes) / Math.log(1024))
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
      },

      // Format duration
      formatDuration: (ms: number) => {
        const seconds = Math.floor(ms / 1000)
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)

        if (hours > 0) {
          return `${hours}h ${minutes % 60}m`
        } else if (minutes > 0) {
          return `${minutes}m ${seconds % 60}s`
        } else {
          return `${seconds}s`
        }
      },

      // Format date
      formatDate: (date: Date | string | number) => {
        return new Date(date).toLocaleDateString()
      },

      // Format date and time
      formatDateTime: (date: Date | string | number) => {
        return new Date(date).toLocaleString()
      },

      // Generate UUID (simple version)
      generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2)
      },

      // Debounce function
      debounce: <T extends (...args: any[]) => any>(func: T, wait: number) => {
        let timeout: NodeJS.Timeout
        return (...args: Parameters<T>) => {
          clearTimeout(timeout)
          timeout = setTimeout(() => func(...args), wait)
        }
      },

      // Throttle function
      throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => {
        let inThrottle: boolean
        return (...args: Parameters<T>) => {
          if (!inThrottle) {
            func(...args)
            inThrottle = true
            setTimeout(() => inThrottle = false, limit)
          }
        }
      }
    })

    console.log('Preload script: Successfully exposed APIs to renderer process')
  } else {
    console.error('Preload script: contextBridge is not available or exposeInMainWorld is not a function')
    // Fallback: expose APIs directly to window (less secure but functional)
    ;(globalThis as any).electronAPI = electronAPI
    ;(globalThis as any).Logger = {
      error: (message: string, data?: any) => ipcRenderer.invoke('logger:error', message, data),
      warn: (message: string, data?: any) => ipcRenderer.invoke('logger:warn', message, data),
      info: (message: string, data?: any) => ipcRenderer.invoke('logger:info', message, data),
      log: (message: string, data?: any) => ipcRenderer.invoke('logger:info', message, data)
    }
    ;(globalThis as any).process = {
      platform: process.platform,
      arch: process.arch,
      versions: process.versions,
      env: {
        NODE_ENV: process.env.NODE_ENV
      }
    }
  }
} catch (error) {
  console.error('Preload script: Error exposing APIs:', error)
  // Fallback: expose APIs directly to window (less secure but functional)
  try {
    ;(globalThis as any).electronAPI = electronAPI
    ;(globalThis as any).Logger = {
      error: (message: string, data?: any) => ipcRenderer.invoke('logger:error', message, data),
      warn: (message: string, data?: any) => ipcRenderer.invoke('logger:warn', message, data),
      info: (message: string, data?: any) => ipcRenderer.invoke('logger:info', message, data),
      log: (message: string, data?: any) => ipcRenderer.invoke('logger:info', message, data)
    }
    ;(globalThis as any).process = {
      platform: process.platform,
      arch: process.arch,
      versions: process.versions,
      env: {
        NODE_ENV: process.env.NODE_ENV
      }
    }
    console.log('Preload script: Used fallback method to expose APIs')
  } catch (fallbackError) {
    console.error('Preload script: Fallback method also failed:', fallbackError)
  }
}

// Security: Remove Node.js globals from the renderer context
delete (globalThis as any).global
delete (globalThis as any).Buffer
delete (globalThis as any).process
delete (globalThis as any).setImmediate
delete (globalThis as any).clearImmediate

// Add CSP headers for additional security (with safety check)
document.addEventListener('DOMContentLoaded', () => {
  if (document.head) {
    const meta = document.createElement('meta')
    meta.httpEquiv = 'Content-Security-Policy'
    meta.content = "default-src 'self' 'unsafe-inline' data: http://localhost:3000 http://localhost:3001; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    document.head.appendChild(meta)
  }
})

// Log that preload script has loaded (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('Reko HR Desktop Agent preload script loaded')
}

// Types available for TypeScript support in renderer